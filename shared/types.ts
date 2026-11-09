export type UserType = {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  image?: string;
  role?: "user" | "guest" | "staff" | "admin" | "hotel_owner";
  assignedHotelId?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  preferences?: {
    preferredDestinations: string[];
    preferredHotelTypes: string[];
    budgetRange: {
      min: number;
      max: number;
    };
  };
  totalBookings?: number;
  totalSpent?: number;
  lastLogin?: Date;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type HotelType = {
  _id: string;
  userId: string;
  name: string;
  city: string;
  country: string;
  description: string;
  type: string[];
  adultCount: number;
  childCount: number;
  facilities: string[];
  pricePerNight: number;
  starRating: number;
  imageUrls: string[];
  lastUpdated: Date;
  // Remove embedded bookings - using separate collection now
  // bookings: BookingType[];

  // New fields
  location?: {
    latitude: number;
    longitude: number;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
  contact?: {
    phone: string;
    email: string;
    website: string;
  };
  policies?: {
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: string;
    petPolicy: string;
    smokingPolicy: string;
  };
  amenities?: {
    parking: boolean;
    wifi: boolean;
    pool: boolean;
    gym: boolean;
    spa: boolean;
    restaurant: boolean;
    bar: boolean;
    airportShuttle: boolean;
    businessCenter: boolean;
  };
  totalBookings?: number;
  totalRevenue?: number;
  averageRating?: number;
  reviewCount?: number;
  /** Owner dashboard counts (enriched by GET /api/my-hotels) */
  upcomingBookings?: number;
  completedBookings?: number;
  cancelledBookings?: number;
  occupancyRate?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ReviewType = {
  _id: string;
  userId: string;
  hotelId: string;
  bookingId: string;
  rating: number;
  comment: string;
  categories: {
    cleanliness: number;
    service: number;
    location: number;
    value: number;
    amenities: number;
  };
  isVerified?: boolean;
  helpfulCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BookingType = {
  _id: string;
  bookingReference?: string;
  userId: string;
  hotelId: string;
  roomTypeId?: string;
  roomId?: string;
  roomNumber?: string;
  roomTypeName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  adultCount: number;
  childCount: number;
  checkIn: Date;
  checkOut: Date;
  totalCost: number;
  status?:
    | "pending"
    | "confirmed"
    | "checked_in"
    | "checked_out"
    | "cancelled"
    | "completed"
    | "refunded";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: string;
  specialRequests?: string;
  cancellationReason?: string;
  refundAmount?: number;
  /** Stripe PaymentIntent id used at booking time (for refunds) */
  stripePaymentIntentId?: string;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  checkedInByStaffId?: string;
  checkedOutByStaffId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RoomTypeType = {
  _id: string;
  hotelId: string;
  name: string;
  code: string;
  description: string;
  basePrice: number;
  maxAdults: number;
  maxChildren: number;
  totalRooms?: number;
  availableRoomsCount?: number;
  bedConfiguration?: string;
  amenities: string[];
  imageUrls: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RoomStatusType = "available" | "occupied" | "maintenance" | "cleaning";

export type RoomModelType = {
  _id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName?: string;
  roomNumber: string;
  floor: number;
  status: RoomStatusType;
  isActive: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RoomRateType = {
  _id: string;
  hotelId: string;
  roomTypeId: string;
  startDate: Date;
  endDate: Date;
  pricePerNight: number;
  seasonName?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BookingHoldType = {
  _id: string;
  hotelId: string;
  roomTypeId: string;
  roomId?: string;
  userId?: string;
  sessionId: string;
  checkIn: Date;
  checkOut: Date;
  adultCount: number;
  childCount: number;
  expiresAt: Date;
  createdAt?: Date;
};

export type PaymentRecordType = {
  _id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: "simulated" | "stripe";
  transactionReference: string;
  status: "pending" | "completed" | "failed" | "refunded";
  idempotencyKey?: string;
  failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AuditLogType = {
  _id: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
  timestamp: Date;
};

export type StaffOperationsSummary = {
  todayArrivals: BookingType[];
  todayDepartures: BookingType[];
  inHouseGuests: BookingType[];
  roomStatusCounts: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    cleaning: number;
  };
};

export type HotelWithBookingsType = HotelType & {
  bookings: BookingType[];
};

export type HotelSearchResponse = {
  data: HotelType[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
};

export type PaymentIntentResponse = {
  paymentIntentId: string;
  clientSecret: string;
  totalCost: number;
  /** True when Stripe is not configured and payment is simulated locally */
  isSimulated?: boolean;
};
