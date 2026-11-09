import mongoose, { Document } from "mongoose";
import { AuditLogType } from "../../../shared/types";

export interface IAuditLog extends Document, Omit<AuditLogType, "_id"> {
  _id: mongoose.Types.ObjectId;
}

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    userEmail: { type: String },
    userRole: { type: String, index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
