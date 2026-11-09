import mongoose, { Document } from "mongoose";
import { RoomTypeType } from "../../../shared/types";

export interface IRoomType extends Document, Omit<RoomTypeType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const roomTypeSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    maxAdults: { type: Number, required: true, min: 1 },
    maxChildren: { type: Number, default: 0, min: 0 },
    totalRooms: { type: Number, default: 0, min: 0 },
    bedConfiguration: { type: String, default: "1 King Bed" },
    amenities: [{ type: String, trim: true }],
    imageUrls: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique code per hotel and fast lookup
roomTypeSchema.index({ hotelId: 1, code: 1 }, { unique: true });
roomTypeSchema.index({ hotelId: 1, isActive: 1 });

const RoomType = mongoose.model<IRoomType>("RoomType", roomTypeSchema);
export default RoomType;
