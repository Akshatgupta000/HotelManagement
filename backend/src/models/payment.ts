import mongoose, { Document } from "mongoose";
import { PaymentRecordType } from "../../../shared/types";

export interface IPayment extends Document, Omit<PaymentRecordType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "gbp", lowercase: true },
    paymentMethod: {
      type: String,
      enum: ["simulated", "stripe"],
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    idempotencyKey: { type: String, index: true },
    failureReason: { type: String },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ idempotencyKey: 1 });

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export default Payment;

