import mongoose, { Document } from "mongoose";
import { RoomModelType, RoomStatusType } from "../../../shared/types";

export interface IRoom extends Document, Omit<RoomModelType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const roomSchema = new mongoose.Schema(
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
    roomTypeName: { type: String },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "cleaning"],
      default: "available",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: roomNumber must be unique within a hotel
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ roomTypeId: 1, status: 1 });

const Room = mongoose.model<IRoom>("Room", roomSchema);
export default Room;
