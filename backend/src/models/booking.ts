import mongoose, { Document } from "mongoose";

export interface IBooking extends Document {
  _id: string;
  bookingReference: string;
  userId: string;
  hotelId: string;
  roomTypeId?: string;
  roomId?: string;
  roomNumber?: string;
  roomTypeName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adultCount: number;
  childCount: number;
  checkIn: Date;
  checkOut: Date;
  totalCost: number;
  status:
    | "pending"
    | "confirmed"
    | "checked_in"
    | "checked_out"
    | "cancelled"
    | "completed"
    | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  specialRequests?: string;
  cancellationReason?: string;
  refundAmount: number;
  stripePaymentIntentId?: string;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  checkedInByStaffId?: string;
  checkedOutByStaffId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },
    roomNumber: { type: String },
    roomTypeName: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String },
    adultCount: { type: Number, required: true },
    childCount: { type: Number, default: 0 },
    checkIn: { type: Date, required: true, index: true },
    checkOut: { type: Date, required: true, index: true },
    totalCost: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "completed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String, default: "simulated" },
    specialRequests: { type: String },
    cancellationReason: { type: String },
    refundAmount: { type: Number, default: 0 },
    stripePaymentIntentId: { type: String, index: true },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    checkedInByStaffId: { type: String },
    checkedOutByStaffId: { type: String },
    // Audit fields
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for concurrency and search
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1, status: 1 });
bookingSchema.index({ roomTypeId: 1, checkIn: 1, checkOut: 1, status: 1 });
bookingSchema.index({ hotelId: 1, status: 1, checkIn: 1 });
bookingSchema.index({ hotelId: 1, status: 1, checkOut: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });

export default mongoose.model<IBooking>("Booking", bookingSchema);
