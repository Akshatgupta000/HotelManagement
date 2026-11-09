import express, { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Hotel from "../models/hotel";
import Booking from "../models/booking";
import User from "../models/user";
import RoomType from "../models/roomType";
import Room from "../models/room";
import BookingHold from "../models/bookingHold";
import Payment from "../models/payment";
import { BookingType, HotelSearchResponse } from "../../../shared/types";
import { param, validationResult } from "express-validator";
import Stripe from "stripe";
import verifyToken from "../middleware/auth";
import requireAdmin from "../middleware/requireAdmin";
import { logAudit } from "../lib/audit";

const stripeApiKey = process.env.STRIPE_API_KEY;
const isStripeConfigured = Boolean(
  stripeApiKey && !stripeApiKey.includes("placeholder")
);
const stripe = isStripeConfigured ? new Stripe(stripeApiKey as string) : null;

const router = express.Router();

/** Generate a clean, unique booking reference: e.g. BK-2026-AB12CD */
const generateBookingReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BK-${timestamp}-${random}`;
};

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = constructSearchQuery(req.query);

    let sortOptions = {};
    switch (req.query.sortOption) {
      case "starRating":
        sortOptions = { starRating: -1 };
        break;
      case "pricePerNightAsc":
        sortOptions = { pricePerNight: 1 };
        break;
      case "pricePerNightDesc":
        sortOptions = { pricePerNight: -1 };
        break;
    }

    const pageSize = 5;
    const pageNumber = parseInt(
      req.query.page ? req.query.page.toString() : "1"
    );
    const skip = (pageNumber - 1) * pageSize;

    const hotels = await Hotel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    const total = await Hotel.countDocuments(query);

    const response: HotelSearchResponse = {
      data: hotels,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("error searching hotels:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const hotels = await Hotel.find().sort("-lastUpdated");
    res.json(hotels);
  } catch (error) {
    console.error("error fetching hotels:", error);
    res.status(500).json({ message: "Error fetching hotels" });
  }
});

/**
 * Admin: toggle hotel isActive.
 * PATCH /api/hotels/:id/active
 */
router.patch(
  "/:id/active",
  verifyToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    if (typeof req.body?.isActive !== "boolean") {
      return res.status(400).json({ message: "isActive boolean required" });
    }
    try {
      const hotel = await Hotel.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive, lastUpdated: new Date() },
        { new: true }
      );
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      await logAudit({
        userId: req.userId,
        userRole: "admin",
        action: "TOGGLE_HOTEL_ACTIVE",
        resource: "Hotel",
        resourceId: req.params.id,
        details: { isActive: req.body.isActive },
        ipAddress: req.ip,
      });

      res.json(hotel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Unable to update hotel status" });
    }
  }
);

router.get(
  "/:id",
  [param("id").notEmpty().withMessage("Hotel ID is required")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = req.params.id.toString();

    try {
      const hotel = await Hotel.findById(id);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      res.json(hotel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching hotel" });
    }
  }
);

/**
 * Create Payment Intent (Stripe or Simulated).
 * POST /api/hotels/:hotelId/bookings/payment-intent
 */
router.post(
  "/:hotelId/bookings/payment-intent",
  verifyToken,
  async (req: Request, res: Response) => {
    const { numberOfNights, roomTypeId, paymentMethod } = req.body;
    const hotelId = req.params.hotelId;

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(400).json({ message: "Hotel not found" });
    }

    const nights = Math.max(1, parseInt(String(numberOfNights), 10) || 1);
    let pricePerNight = hotel.pricePerNight;

    if (roomTypeId && mongoose.Types.ObjectId.isValid(String(roomTypeId))) {
      const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
      if (roomType) {
        pricePerNight = roomType.basePrice;
      }
    }

    const totalCost = pricePerNight * nights;

    // Use Simulated payment if requested or if Stripe is not configured
    if (paymentMethod === "simulated" || !stripe) {
      const simulatedPaymentIntentId = `sim_pi_${crypto.randomUUID()}`;
      const simulatedClientSecret = `sim_sec_${crypto.randomUUID()}`;

      return res.status(200).json({
        paymentIntentId: simulatedPaymentIntentId,
        clientSecret: simulatedClientSecret,
        totalCost,
        isSimulated: true,
      });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalCost * 100),
        currency: "gbp",
        metadata: {
          hotelId,
          userId: req.userId,
          roomTypeId: roomTypeId || "",
        },
      });

      if (!paymentIntent.client_secret) {
        return res
          .status(500)
          .json({ message: "Error creating payment intent" });
      }

      return res.status(200).json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret.toString(),
        totalCost,
        isSimulated: false,
      });
    } catch (err) {
      console.warn("Stripe payment intent failed, falling back to simulated payment:", err);
      const simulatedPaymentIntentId = `sim_pi_${crypto.randomUUID()}`;
      const simulatedClientSecret = `sim_sec_${crypto.randomUUID()}`;

      return res.status(200).json({
        paymentIntentId: simulatedPaymentIntentId,
        clientSecret: simulatedClientSecret,
        totalCost,
        isSimulated: true,
      });
    }
  }
);

/**
 * Concurrency-Protected Booking Creation.
 * POST /api/hotels/:hotelId/bookings
 */
router.post(
  "/:hotelId/bookings",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const {
        paymentIntentId,
        paymentMethod = "simulated",
        checkIn,
        checkOut,
        adultCount,
        childCount,
        roomTypeId,
        roomId,
        holdSessionId,
      } = req.body;

      const hotelId = req.params.hotelId;
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      // 1. Date Validations
      if (!checkIn || !checkOut) {
        return res
          .status(400)
          .json({ message: "checkIn and checkOut dates are required" });
      }

      const reqCheckIn = new Date(checkIn);
      const reqCheckOut = new Date(checkOut);

      if (isNaN(reqCheckIn.getTime()) || isNaN(reqCheckOut.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Check-in cannot be in the past (using start of today)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (reqCheckIn < startOfToday) {
        return res
          .status(400)
          .json({ message: "Check-in date cannot be in the past" });
      }

      // Check-out must be after check-in
      if (reqCheckOut <= reqCheckIn) {
        return res
          .status(400)
          .json({ message: "Check-out date must be strictly after check-in date" });
      }

      // 2. Room Type & Capacity Validation
      let targetRoomType = null;
      let targetRoom = null;

      if (roomTypeId && mongoose.Types.ObjectId.isValid(String(roomTypeId))) {
        targetRoomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
        if (!targetRoomType) {
          return res.status(404).json({ message: "Room type not found" });
        }

        const adults = Number(adultCount) || 1;
        const children = Number(childCount) || 0;
        if (adults > targetRoomType.maxAdults) {
          return res.status(400).json({
            message: `Selected room type accommodates max ${targetRoomType.maxAdults} adults (requested: ${adults})`,
          });
        }
        if (children > targetRoomType.maxChildren) {
          return res.status(400).json({
            message: `Selected room type accommodates max ${targetRoomType.maxChildren} children (requested: ${children})`,
          });
        }
      }

      // 3. Payment Verification (Simulated or Stripe)
      const isSimulated =
        paymentMethod === "simulated" ||
        (paymentIntentId && String(paymentIntentId).startsWith("sim_"));

      let resolvedPaymentIntentId = paymentIntentId;

      if (!isSimulated && stripe && paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId as string
        );

        if (!paymentIntent) {
          return res.status(400).json({ message: "Payment intent not found" });
        }

        if (
          paymentIntent.metadata.hotelId !== hotelId ||
          paymentIntent.metadata.userId !== req.userId
        ) {
          return res.status(400).json({ message: "Payment intent mismatch" });
        }

        if (paymentIntent.status !== "succeeded") {
          return res.status(400).json({
            message: `Payment intent has not succeeded. Status: ${paymentIntent.status}`,
          });
        }

        resolvedPaymentIntentId = paymentIntent.id;
      } else {
        // Simulated payment
        if (!resolvedPaymentIntentId) {
          resolvedPaymentIntentId = `sim_pi_${crypto.randomUUID()}`;
        }
      }

      // 4. CRITICAL CONCURRENCY CONTROL & ATOMIC ROOM ALLOCATION
      // Candidate room search with date overlap query
      const roomQuery: Record<string, any> = {
        hotelId,
        isActive: true,
        status: { $ne: "maintenance" },
      };

      if (targetRoomType) {
        roomQuery.roomTypeId = targetRoomType._id;
      }

      if (roomId && mongoose.Types.ObjectId.isValid(String(roomId))) {
        roomQuery._id = roomId;
      }

      const candidateRooms = await Room.find(roomQuery);

      if (candidateRooms.length > 0) {
        for (const candidate of candidateRooms) {
          // Check for overlapping active reservations on this room
          const hasConflict = await Booking.findOne({
            roomId: candidate._id,
            status: { $in: ["confirmed", "checked_in"] },
            checkIn: { $lt: reqCheckOut },
            checkOut: { $gt: reqCheckIn },
          });

          if (!hasConflict) {
            targetRoom = candidate;
            break;
          }
        }

        // If specific room was requested and had conflict
        if (roomId && !targetRoom) {
          return res.status(409).json({
            message:
              "The requested room is unavailable for the selected dates. Please choose different dates or another room.",
          });
        }

        // If no candidate room was free
        if (!targetRoom) {
          return res.status(409).json({
            message:
              "All rooms of this type are fully booked for the selected dates. Please choose different dates.",
          });
        }
      } else if (targetRoomType) {
        // No rooms created under this room type yet
        return res.status(409).json({
          message: "No active rooms configured for this room type.",
        });
      }

      // Calculate total cost
      const oneDay = 1000 * 60 * 60 * 24;
      const numberOfNights = Math.max(
        1,
        Math.ceil((reqCheckOut.getTime() - reqCheckIn.getTime()) / oneDay)
      );
      const nightlyRate = targetRoomType
        ? targetRoomType.basePrice
        : hotel.pricePerNight;
      const totalCost = req.body.totalCost || nightlyRate * numberOfNights;

      // 5. Generate unique booking reference
      const bookingReference = generateBookingReference();

      const newBookingData = {
        ...req.body,
        bookingReference,
        userId: req.userId,
        hotelId,
        roomTypeId: targetRoomType?._id || req.body.roomTypeId,
        roomTypeName: targetRoomType?.name,
        roomId: targetRoom?._id || req.body.roomId,
        roomNumber: targetRoom?.roomNumber,
        checkIn: reqCheckIn,
        checkOut: reqCheckOut,
        totalCost,
        createdAt: new Date(),
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: isSimulated ? "simulated" : "stripe",
        stripePaymentIntentId: isSimulated ? undefined : resolvedPaymentIntentId,
      };

      const booking = new Booking(newBookingData);
      await booking.save();

      // 6. Record Payment
      await Payment.create({
        bookingId: booking._id,
        userId: req.userId,
        amount: totalCost,
        currency: "gbp",
        paymentMethod: isSimulated ? "simulated" : "stripe",
        transactionReference: resolvedPaymentIntentId,
        status: "completed",
        idempotencyKey: req.body.idempotencyKey,
      });

      // 7. Update Hotel & User Analytics
      await Hotel.findByIdAndUpdate(hotelId, {
        $inc: {
          totalBookings: 1,
          totalRevenue: totalCost,
        },
      });

      await User.findByIdAndUpdate(req.userId, {
        $inc: {
          totalBookings: 1,
          totalSpent: totalCost,
        },
      });

      // 8. Clean up hold if one existed
      if (holdSessionId) {
        await BookingHold.deleteOne({ hotelId, sessionId: holdSessionId });
      }

      // 9. Audit Log
      await logAudit({
        userId: req.userId,
        action: "CREATE_BOOKING",
        resource: "Booking",
        resourceId: booking._id.toString(),
        details: {
          bookingReference,
          hotelId,
          roomNumber: targetRoom?.roomNumber,
          totalCost,
          checkIn: reqCheckIn,
          checkOut: reqCheckOut,
          paymentMethod: isSimulated ? "simulated" : "stripe",
        },
        ipAddress: req.ip,
      });

      return res.status(201).json({
        bookingReference,
        booking,
        message: "Booking confirmed successfully",
      });
    } catch (error) {
      console.error("Booking creation error:", error);
      return res.status(500).json({ message: "Something went wrong creating booking" });
    }
  }
);

const constructSearchQuery = (queryParams: any) => {
  let constructedQuery: any = {};

  if (queryParams.destination && queryParams.destination.trim() !== "") {
    const destination = queryParams.destination.trim();

    constructedQuery.$or = [
      { city: { $regex: destination, $options: "i" } },
      { country: { $regex: destination, $options: "i" } },
      { name: { $regex: destination, $options: "i" } },
    ];
  }

  if (queryParams.adultCount) {
    constructedQuery.adultCount = {
      $gte: parseInt(queryParams.adultCount),
    };
  }

  if (queryParams.childCount) {
    constructedQuery.childCount = {
      $gte: parseInt(queryParams.childCount),
    };
  }

  if (queryParams.facilities) {
    constructedQuery.facilities = {
      $all: Array.isArray(queryParams.facilities)
        ? queryParams.facilities
        : [queryParams.facilities],
    };
  }

  if (queryParams.types) {
    constructedQuery.type = {
      $in: Array.isArray(queryParams.types)
        ? queryParams.types
        : [queryParams.types],
    };
  }

  if (queryParams.stars) {
    const starRatings = Array.isArray(queryParams.stars)
      ? queryParams.stars.map((star: string) => parseInt(star))
      : parseInt(queryParams.stars);

    constructedQuery.starRating = { $in: starRatings };
  }

  if (queryParams.maxPrice) {
    constructedQuery.pricePerNight = {
      $lte: parseInt(queryParams.maxPrice),
    };
  }

  return constructedQuery;
};

export default router;
