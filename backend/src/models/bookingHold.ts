import mongoose, { Document } from "mongoose";
import { BookingHoldType } from "../../../shared/types";

export interface IBookingHold extends Document, Omit<BookingHoldType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const bookingHoldSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },
    userId: { type: String, index: true },
    sessionId: { type: String, required: true, index: true },
    checkIn: { type: Date, required: true, index: true },
    checkOut: { type: Date, required: true, index: true },
    adultCount: { type: Number, default: 1 },
    childCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove expired holds from MongoDB
bookingHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
bookingHoldSchema.index({ roomTypeId: 1, checkIn: 1, checkOut: 1 });
bookingHoldSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

const BookingHold = mongoose.model<IBookingHold>("BookingHold", bookingHoldSchema);
export default BookingHold;
