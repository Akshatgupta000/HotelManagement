import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/booking";
import Room from "../models/room";
import Hotel from "../models/hotel";
import AuditLog from "../models/auditLog";
import verifyToken from "../middleware/auth";
import { requireStaffOrAdmin, requireRoles } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router = express.Router();

/**
 * Staff / Admin: Front-desk operational dashboard summary.
 * Returns today's arrivals, today's departures, in-house guests, and live room rack counts.
 * GET /api/staff/operations
 */
router.get(
  "/operations",
  verifyToken,
  requireStaffOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const hotelId = req.query.hotelId || req.userAssignedHotelId;
      const filter: Record<string, any> = {};
      if (hotelId && mongoose.Types.ObjectId.isValid(String(hotelId))) {
        filter.hotelId = hotelId;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Today's arrivals (checkIn falls today, status is confirmed)
      const todayArrivals = await Booking.find({
        ...filter,
        status: "confirmed",
        checkIn: { $gte: startOfDay, $lte: endOfDay },
      })
        .populate("hotelId", "name city country")
        .populate("roomId", "roomNumber floor status")
        .populate("roomTypeId", "name code")
        .sort({ checkIn: 1 });

      // Today's departures (checkOut falls today, status is checked_in)
      const todayDepartures = await Booking.find({
        ...filter,
        status: "checked_in",
        checkOut: { $gte: startOfDay, $lte: endOfDay },
      })
        .populate("hotelId", "name city country")
        .populate("roomId", "roomNumber floor status")
        .populate("roomTypeId", "name code")
        .sort({ checkOut: 1 });

      // Current in-house guests (status is checked_in)
      const inHouseGuests = await Booking.find({
        ...filter,
        status: "checked_in",
      })
        .populate("hotelId", "name city country")
        .populate("roomId", "roomNumber floor status")
        .populate("roomTypeId", "name code")
        .sort({ checkOut: 1 });

      // Room status rack breakdown
      const roomFilter: Record<string, any> = { isActive: true };
      if (hotelId && mongoose.Types.ObjectId.isValid(String(hotelId))) {
        roomFilter.hotelId = hotelId;
      }

      const allRooms = await Room.find(roomFilter);
      const roomStatusCounts = {
        total: allRooms.length,
        available: allRooms.filter((r) => r.status === "available").length,
        occupied: allRooms.filter((r) => r.status === "occupied").length,
        maintenance: allRooms.filter((r) => r.status === "maintenance").length,
        cleaning: allRooms.filter((r) => r.status === "cleaning").length,
      };

      return res.status(200).json({
        todayArrivals,
        todayDepartures,
        inHouseGuests,
        roomStatusCounts,
      });
    } catch (error) {
      console.error("Error fetching staff operations:", error);
      return res.status(500).json({ message: "Failed to fetch operations data" });
    }
  }
);

/**
 * Staff / Admin: Search guests and reservations by name, email, phone, or booking reference.
 * GET /api/staff/guests/search
 */
router.get(
  "/guests/search",
  verifyToken,
  requireStaffOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const { query, hotelId, status, page = 1, limit = 20 } = req.query;
      const searchFilter: Record<string, any> = {};

      if (hotelId && mongoose.Types.ObjectId.isValid(String(hotelId))) {
        searchFilter.hotelId = hotelId;
      } else if (req.userAssignedHotelId) {
        searchFilter.hotelId = req.userAssignedHotelId;
      }

      if (status && typeof status === "string" && status !== "all") {
        searchFilter.status = status;
      }

      if (query && typeof query === "string" && query.trim() !== "") {
        const q = query.trim();
        const regex = new RegExp(q, "i");
        searchFilter.$or = [
          { bookingReference: regex },
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { phone: regex },
          { roomNumber: regex },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const total = await Booking.countDocuments(searchFilter);
      const bookings = await Booking.find(searchFilter)
        .populate("hotelId", "name city country")
        .populate("roomId", "roomNumber floor status")
        .populate("roomTypeId", "name code")
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(Number(limit));

      return res.status(200).json({
        bookings,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error searching guests:", error);
      return res.status(500).json({ message: "Failed to search guests" });
    }
  }
);

/**
 * Staff / Admin: Check-in a guest.
 * POST /api/staff/bookings/:id/check-in
 */
router.post(
  "/bookings/:id/check-in",
  verifyToken,
  requireStaffOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status === "checked_in") {
        return res.status(400).json({ message: "Guest is already checked in" });
      }

      if (booking.status === "cancelled" || booking.status === "refunded") {
        return res.status(400).json({
          message: `Cannot check in a ${booking.status} reservation`,
        });
      }

      // Update booking status
      booking.status = "checked_in";
      booking.checkedInAt = new Date();
      booking.checkedInByStaffId = req.userId;
      await booking.save();

      // Update room status to occupied if assigned
      if (booking.roomId) {
        await Room.findByIdAndUpdate(booking.roomId, {
          status: "occupied",
        });
      }

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "CHECK_IN",
        resource: "Booking",
        resourceId: booking._id.toString(),
        details: {
          bookingReference: booking.bookingReference,
          guestName: `${booking.firstName} ${booking.lastName}`,
          roomId: booking.roomId,
          roomNumber: booking.roomNumber,
        },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        message: "Guest checked in successfully",
        booking,
      });
    } catch (error) {
      console.error("Error performing check-in:", error);
      return res.status(500).json({ message: "Failed to perform check-in" });
    }
  }
);

/**
 * Staff / Admin: Check-out a guest.
 * POST /api/staff/bookings/:id/check-out
 */
router.post(
  "/bookings/:id/check-out",
  verifyToken,
  requireStaffOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "checked_in") {
        return res.status(400).json({
          message: `Cannot check out booking with status "${booking.status}". Must be checked_in.`,
        });
      }

      booking.status = "checked_out";
      booking.checkedOutAt = new Date();
      booking.checkedOutByStaffId = req.userId;
      await booking.save();

      // Free up room and mark for cleaning
      if (booking.roomId) {
        await Room.findByIdAndUpdate(booking.roomId, {
          status: "cleaning",
        });
      }

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "CHECK_OUT",
        resource: "Booking",
        resourceId: booking._id.toString(),
        details: {
          bookingReference: booking.bookingReference,
          guestName: `${booking.firstName} ${booking.lastName}`,
          roomId: booking.roomId,
          roomNumber: booking.roomNumber,
        },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        message: "Guest checked out successfully. Room assigned to cleaning.",
        booking,
      });
    } catch (error) {
      console.error("Error performing check-out:", error);
      return res.status(500).json({ message: "Failed to perform check-out" });
    }
  }
);

/**
 * Admin: View real database-backed audit logs.
 * GET /api/staff/audit-logs
 */
router.get(
  "/audit-logs",
  verifyToken,
  requireRoles(["admin"]),
  async (req: Request, res: Response) => {
    try {
      const { action, resource, page = 1, limit = 50 } = req.query;
      const filter: Record<string, any> = {};

      if (action && typeof action === "string") {
        filter.action = action;
      }
      if (resource && typeof resource === "string") {
        filter.resource = resource;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const total = await AuditLog.countDocuments(filter);
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit));

      return res.status(200).json({
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  }
);

export default router;

