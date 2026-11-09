import mongoose, { Document } from "mongoose";
import { RoomRateType } from "../../../shared/types";

export interface IRoomRate extends Document, Omit<RoomRateType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const roomRateSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    seasonName: {
      type: String,
      default: "Standard",
    },
  },
  {
    timestamps: true,
  }
);

roomRateSchema.index({ hotelId: 1, roomTypeId: 1, startDate: 1, endDate: 1 });

const RoomRate = mongoose.model<IRoomRate>("RoomRate", roomRateSchema);
export default RoomRate;
