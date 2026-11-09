import AuditLog from "../models/auditLog";

export interface LogAuditParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}

/**
 * Record an audit log entry in the database.
 * Does not throw to avoid crashing the main business flow.
 */
export const logAudit = async (params: LogAuditParams): Promise<void> => {
  try {
    await AuditLog.create({
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};

