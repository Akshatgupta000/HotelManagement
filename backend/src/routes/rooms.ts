import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import crypto from "crypto";
import RoomType from "../models/roomType";
import Room from "../models/room";
import Booking from "../models/booking";
import BookingHold from "../models/bookingHold";
import Hotel from "../models/hotel";
import verifyToken from "../middleware/auth";
import {
  requireHotelAuthorized,
  requireStaffOrAdmin,
} from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router = express.Router({ mergeParams: true });

/**
 * Public/Guest: Get all room types for a hotel.
 * If checkIn and checkOut query params are provided, calculates real-time availability.
 * GET /api/hotels/:hotelId/room-types
 */
router.get("/:hotelId/room-types", async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut, adultCount, childCount } = req.query;

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({ message: "Invalid hotel ID format" });
    }

    const roomTypes = await RoomType.find({
      hotelId,
      isActive: true,
    }).sort({ basePrice: 1 });

    // If dates are provided, calculate dynamic availability per room type
    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;
    if (checkIn && checkOut) {
      checkInDate = new Date(String(checkIn));
      checkOutDate = new Date(String(checkOut));
    }

    const enriched = await Promise.all(
      roomTypes.map(async (rt) => {
        const totalRooms = await Room.countDocuments({
          hotelId,
          roomTypeId: rt._id,
          isActive: true,
          status: { $ne: "maintenance" },
        });

        let availableCount = totalRooms;

        if (
          checkInDate &&
          checkOutDate &&
          !isNaN(checkInDate.getTime()) &&
          !isNaN(checkOutDate.getTime())
        ) {
          // Find booked room IDs for this room type during requested range
          const bookedRoomIds = await Booking.find({
            hotelId,
            roomTypeId: rt._id,
            status: { $in: ["confirmed", "checked_in"] },
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
          }).distinct("roomId");

          // Active holds not yet expired
          const activeHolds = await BookingHold.countDocuments({
            hotelId,
            roomTypeId: rt._id,
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
            expiresAt: { $gt: new Date() },
          });

          availableCount = Math.max(
            0,
            totalRooms - bookedRoomIds.length - activeHolds
          );
        }

        const rtObj = rt.toObject();
        return {
          ...rtObj,
          totalRooms,
          availableRoomsCount: availableCount,
        };
      })
    );

    // Optional capacity filter
    let results = enriched;
    if (adultCount) {
      const minAdults = parseInt(String(adultCount), 10);
      results = results.filter((rt) => rt.maxAdults >= minAdults);
    }
    if (childCount) {
      const minChildren = parseInt(String(childCount), 10);
      results = results.filter((rt) => rt.maxChildren >= minChildren);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching room types:", error);
    return res.status(500).json({ message: "Failed to fetch room types" });
  }
});

/**
 * Owner / Admin: Create a new room type.
 * POST /api/hotels/:hotelId/room-types
 */
router.post(
  "/:hotelId/room-types",
  verifyToken,
  requireHotelAuthorized,
  [
    body("name").notEmpty().withMessage("Room type name is required"),
    body("code").notEmpty().withMessage("Room type code is required"),
    body("basePrice").isNumeric().withMessage("Base price must be a number"),
    body("maxAdults").isInt({ min: 1 }).withMessage("Max adults must be >= 1"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { hotelId } = req.params;
      const {
        name,
        code,
        description,
        basePrice,
        maxAdults,
        maxChildren,
        bedConfiguration,
        amenities,
        imageUrls,
      } = req.body;

      const existing = await RoomType.findOne({
        hotelId,
        code: code.trim().toUpperCase(),
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Room type code already exists for this hotel" });
      }

      const roomType = new RoomType({
        hotelId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description || `${name} with modern amenities.`,
        basePrice: Number(basePrice),
        maxAdults: Number(maxAdults),
        maxChildren: Number(maxChildren || 0),
        bedConfiguration: bedConfiguration || "1 King Bed",
        amenities: Array.isArray(amenities) ? amenities : [],
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        isActive: true,
      });

      await roomType.save();

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "CREATE_ROOM_TYPE",
        resource: "RoomType",
        resourceId: roomType._id.toString(),
        details: { name: roomType.name, code: roomType.code, basePrice },
        ipAddress: req.ip,
      });

      return res.status(201).json(roomType);
    } catch (error) {
      console.error("Error creating room type:", error);
      return res.status(500).json({ message: "Failed to create room type" });
    }
  }
);

/**
 * Owner / Admin: Update room type.
 * PUT /api/hotels/:hotelId/room-types/:roomTypeId
 */
router.put(
  "/:hotelId/room-types/:roomTypeId",
  verifyToken,
  requireHotelAuthorized,
  async (req: Request, res: Response) => {
    try {
      const { hotelId, roomTypeId } = req.params;
      const updated = await RoomType.findOneAndUpdate(
        { _id: roomTypeId, hotelId },
        { ...req.body, updatedAt: new Date() },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Room type not found" });
      }

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "UPDATE_ROOM_TYPE",
        resource: "RoomType",
        resourceId: roomTypeId,
        details: req.body,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating room type:", error);
      return res.status(500).json({ message: "Failed to update room type" });
    }
  }
);

/**
 * Staff / Admin / Owner: Get all rooms for a hotel with operational statuses.
 * GET /api/hotels/:hotelId/rooms
 */
router.get(
  "/:hotelId/rooms",
  verifyToken,
  requireHotelAuthorized,
  async (req: Request, res: Response) => {
    try {
      const { hotelId } = req.params;
      const rooms = await Room.find({ hotelId })
        .populate("roomTypeId", "name code basePrice maxAdults")
        .sort({ roomNumber: 1 });

      return res.status(200).json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return res.status(500).json({ message: "Failed to fetch rooms" });
    }
  }
);

/**
 * Owner / Admin: Add an individual room to a hotel.
 * POST /api/hotels/:hotelId/rooms
 */
router.post(
  "/:hotelId/rooms",
  verifyToken,
  requireHotelAuthorized,
  [
    body("roomNumber").notEmpty().withMessage("Room number is required"),
    body("roomTypeId").notEmpty().withMessage("Room type ID is required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { hotelId } = req.params;
      const { roomNumber, roomTypeId, floor, status, notes } = req.body;

      const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
      if (!roomType) {
        return res.status(404).json({ message: "Room type not found for this hotel" });
      }

      const existing = await Room.findOne({ hotelId, roomNumber: roomNumber.trim() });
      if (existing) {
        return res
          .status(400)
          .json({ message: `Room ${roomNumber} already exists in this hotel` });
      }

      const room = new Room({
        hotelId,
        roomTypeId,
        roomTypeName: roomType.name,
        roomNumber: roomNumber.trim(),
        floor: floor ? Number(floor) : 1,
        status: status || "available",
        notes: notes || "",
        isActive: true,
      });

      await room.save();

      // Update room count on RoomType
      await RoomType.findByIdAndUpdate(roomTypeId, { $inc: { totalRooms: 1 } });

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "CREATE_ROOM",
        resource: "Room",
        resourceId: room._id.toString(),
        details: { roomNumber: room.roomNumber, roomTypeId, floor },
        ipAddress: req.ip,
      });

      return res.status(201).json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      return res.status(500).json({ message: "Failed to create room" });
    }
  }
);

/**
 * Staff / Admin / Owner: Update room status (available, occupied, maintenance, cleaning).
 * PATCH /api/hotels/:hotelId/rooms/:roomId/status
 */
router.patch(
  "/:hotelId/rooms/:roomId/status",
  verifyToken,
  requireStaffOrAdmin,
  [
    body("status")
      .isIn(["available", "occupied", "maintenance", "cleaning"])
      .withMessage("Invalid room status"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { hotelId, roomId } = req.params;
      const { status, notes } = req.body;

      const room = await Room.findOne({ _id: roomId, hotelId });
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const oldStatus = room.status;
      room.status = status;
      if (typeof notes === "string") {
        room.notes = notes;
      }
      await room.save();

      await logAudit({
        userId: req.userId,
        userEmail: req.userEmail,
        userRole: req.userRole,
        action: "UPDATE_ROOM_STATUS",
        resource: "Room",
        resourceId: roomId,
        details: { oldStatus, newStatus: status, roomNumber: room.roomNumber, notes },
        ipAddress: req.ip,
      });

      return res.status(200).json(room);
    } catch (error) {
      console.error("Error updating room status:", error);
      return res.status(500).json({ message: "Failed to update room status" });
    }
  }
);

/**
 * Booking Hold: Create a 10-minute hold on a room type during checkout.
 * POST /api/hotels/:hotelId/bookings/hold
 */
router.post(
  "/:hotelId/bookings/hold",
  [
    body("roomTypeId").notEmpty().withMessage("Room type is required"),
    body("checkIn").isISO8601().withMessage("Valid checkIn date is required"),
    body("checkOut").isISO8601().withMessage("Valid checkOut date is required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { hotelId } = req.params;
      const { roomTypeId, checkIn, checkOut, adultCount, childCount } = req.body;
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({ message: "Check-out must be after check-in" });
      }

      // Check available rooms
      const totalRooms = await Room.countDocuments({
        hotelId,
        roomTypeId,
        isActive: true,
        status: { $ne: "maintenance" },
      });

      const bookedRoomIds = await Booking.find({
        hotelId,
        roomTypeId,
        status: { $in: ["confirmed", "checked_in"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      }).distinct("roomId");

      const activeHolds = await BookingHold.countDocuments({
        hotelId,
        roomTypeId,
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
        expiresAt: { $gt: new Date() },
      });

      if (totalRooms - bookedRoomIds.length - activeHolds <= 0) {
        return res.status(409).json({
          message: "No rooms available for the selected dates and room type",
        });
      }

      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const hold = new BookingHold({
        hotelId,
        roomTypeId,
        sessionId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adultCount: adultCount ? Number(adultCount) : 1,
        childCount: childCount ? Number(childCount) : 0,
        expiresAt,
      });

      await hold.save();

      return res.status(201).json({
        holdId: hold._id,
        sessionId,
        expiresAt,
        message: "Room held for 10 minutes",
      });
    } catch (error) {
      console.error("Error creating booking hold:", error);
      return res.status(500).json({ message: "Failed to create booking hold" });
    }
  }
);

/**
 * Booking Hold: Release hold early.
 * DELETE /api/hotels/:hotelId/bookings/hold/:sessionId
 */
router.delete(
  "/:hotelId/bookings/hold/:sessionId",
  async (req: Request, res: Response) => {
    try {
      const { hotelId, sessionId } = req.params;
      await BookingHold.deleteOne({ hotelId, sessionId });
      return res.status(200).json({ message: "Hold released successfully" });
    } catch (error) {
      console.error("Error releasing hold:", error);
      return res.status(500).json({ message: "Failed to release hold" });
    }
  }
);

export default router;

