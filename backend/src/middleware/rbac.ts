import { NextFunction, Request, Response } from "express";
import User from "../models/user";
import Hotel from "../models/hotel";

declare global {
  namespace Express {
    interface Request {
      userRole?: string;
      userEmail?: string;
      userAssignedHotelId?: string;
    }
  }
}

/**
 * Middleware: Attaches user details (role, email, assigned hotel) to req.
 * Assumes verifyToken has run.
 */
export const attachUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await User.findById(req.userId).select("role email assignedHotelId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.userRole = user.role || "user";
    req.userEmail = user.email;
    req.userAssignedHotelId = user.assignedHotelId?.toString();
    next();
  } catch (error) {
    console.error("attachUser error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

/**
 * Middleware: Requires the user to have one of the specified roles.
 */
export const requireRoles = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await User.findById(req.userId).select("role email assignedHotelId");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.userRole = user.role || "user";
      req.userEmail = user.email;
      req.userAssignedHotelId = user.assignedHotelId?.toString();

      // Normalize role checking ("user" and "guest" are interchangeable)
      const currentRole = user.role === "user" ? "guest" : user.role;
      const normalizedRoles = roles.map((r) => (r === "user" ? "guest" : r));

      if (!normalizedRoles.includes(currentRole as string)) {
        return res.status(403).json({
          message: `Forbidden: requires one of [${roles.join(", ")}]`,
        });
      }
      next();
    } catch (error) {
      console.error("requireRoles error:", error);
      return res.status(500).json({ message: "Authorization verification failed" });
    }
  };
};

/**
 * Middleware: Allows staff, admin, or hotel_owner
 */
export const requireStaffOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await User.findById(req.userId).select("role email assignedHotelId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.userRole = user.role || "user";
    req.userEmail = user.email;
    req.userAssignedHotelId = user.assignedHotelId?.toString();

    if (
      user.role === "admin" ||
      user.role === "staff" ||
      user.role === "hotel_owner"
    ) {
      return next();
    }

    return res.status(403).json({ message: "Access denied: Staff or Admin role required" });
  } catch (error) {
    console.error("requireStaffOrAdmin error:", error);
    return res.status(500).json({ message: "Authorization verification failed" });
  }
};

/**
 * Middleware: Allows owner of the specified hotel, staff assigned to it, or any admin
 */
export const requireHotelAuthorized = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await User.findById(req.userId).select("role email assignedHotelId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.userRole = user.role || "user";
    req.userEmail = user.email;
    req.userAssignedHotelId = user.assignedHotelId?.toString();

    if (user.role === "admin") {
      return next();
    }

    const hotelId = req.params.hotelId || req.body.hotelId;
    if (!hotelId) {
      return res.status(400).json({ message: "Hotel ID required" });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    // Hotel owner check
    if (hotel.userId === req.userId) {
      return next();
    }

    // Staff check: must be staff and assigned to this hotel (or general staff if unassigned)
    if (user.role === "staff") {
      if (!user.assignedHotelId || user.assignedHotelId.toString() === hotelId) {
        return next();
      }
    }

    return res.status(403).json({ message: "Access denied for this hotel" });
  } catch (error) {
    console.error("requireHotelAuthorized error:", error);
    return res.status(500).json({ message: "Authorization verification failed" });
  }
};

