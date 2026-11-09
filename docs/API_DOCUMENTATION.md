# Hotel Booking Management System — API Specification & Reference

<!-- OpenAPI 3.0 Compatible REST API Documentation -->

**Base URL (Local):** `http://localhost:5001/api`  
**Interactive Swagger UI:** `http://localhost:5001/api-docs`  
**Authentication:** HTTP-only JWT Cookie (`auth_token`) or Bearer Header (`Authorization: Bearer <token>`)

---

## 1. Authentication & Session Management

### Register User
- **Endpoint:** `POST /api/users/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123"
  }
  ```
- **Response:** `200 OK` (Sets `auth_token` cookie)
  ```json
  {
    "message": "User registered OK"
  }
  ```

### Sign In
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "test@user.com",
    "password": "12345678"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "userId": "66a0123456789abcdef01234"
  }
  ```

### Verify Token & Get Current Session
- **Endpoint:** `GET /api/auth/validate-token`
- **Access:** Authenticated
- **Response:** `200 OK`
  ```json
  {
    "userId": "66a0123456789abcdef01234"
  }
  ```

### Current User Profile
- **Endpoint:** `GET /api/users/me`
- **Access:** Authenticated
- **Response:** `200 OK` (User object with `role`, `assignedHotelId`, etc., password excluded).

### Sign Out
- **Endpoint:** `POST /api/auth/logout`
- **Access:** Public
- **Response:** `200 OK` (Clears `auth_token` cookie).

---

## 2. User & Role Management (Admin)

### List All Users
- **Endpoint:** `GET /api/users`
- **Access:** Admin (`role: admin`)
- **Response:** `200 OK` Array of User documents.

### Update User Role & Assignment
- **Endpoint:** `PATCH /api/users/:id/role`
- **Access:** Admin
- **Request Body:**
  ```json
  {
    "role": "staff",
    "assignedHotelId": "66a011111111111111111111"
  }
  ```
- **Allowed Roles:** `user`, `guest`, `staff`, `admin`, `hotel_owner`.
- **Response:** `200 OK` Updated user document.

---

## 3. Hotel Management & Discovery

### Search Hotels
- **Endpoint:** `GET /api/hotels/search`
- **Access:** Public
- **Query Parameters:**
  - `destination`: City or country substring search
  - `checkIn`: Check-in ISO date string
  - `checkOut`: Check-out ISO date string
  - `adultCount`: Number of adults
  - `childCount`: Number of children
  - `page`: Page number (default: 1)
  - `maxPrice`: Maximum nightly price filter
  - `types`: Array of hotel categories
  - `stars`: Array of star ratings
  - `sortOption`: `starRating`, `pricePerNightAsc`, `pricePerNightDesc`
- **Response:** `200 OK`
  ```json
  {
    "data": [ ... ],
    "pagination": { "total": 12, "page": 1, "pages": 3 }
  }
  ```

### Get Hotel By ID
- **Endpoint:** `GET /api/hotels/:id`
- **Access:** Public
- **Response:** `200 OK` Full Hotel document.

### Create Hotel Listing
- **Endpoint:** `POST /api/my-hotels`
- **Access:** Authenticated (Owner / Admin)
- **Content-Type:** `multipart/form-data` (Supports up to 6 image files)
- **Response:** `201 Created`

---

## 4. Room Types & Physical Inventory

### List Room Types
- **Endpoint:** `GET /api/hotels/:id/room-types`
- **Access:** Public
- **Query Parameters:** `checkIn`, `checkOut`, `adultCount`, `childCount` (optional filters)
- **Response:** `200 OK` Array of `RoomType` objects with capacity, bed configuration, amenities, and pricing.

### Create Room Type
- **Endpoint:** `POST /api/hotels/:id/room-types`
- **Access:** Admin / Authorized Owner
- **Request Body:**
  ```json
  {
    "name": "Executive River Suite",
    "code": "ERS",
    "description": "Spacious suite overlooking the water.",
    "basePrice": 240,
    "maxAdults": 3,
    "maxChildren: 1,
    "bedConfiguration": "1 Super King + 1 Sofa",
    "amenities": ["Free WiFi", "River View", "Balcony", "Espresso"]
  }
  ```
- **Response:** `201 Created`

### List Physical Rooms
- **Endpoint:** `GET /api/hotels/:id/rooms`
- **Access:** Staff / Admin
- **Query Parameters:** `roomTypeId` (optional)
- **Response:** `200 OK` Array of physical rooms with `roomNumber`, `floor`, and `status`.

### Create Physical Room
- **Endpoint:** `POST /api/hotels/:id/rooms`
- **Access:** Admin / Authorized Owner
- **Request Body:**
  ```json
  {
    "roomTypeId": "66a011111111111111111111",
    "roomNumber": "301",
    "floor": 3
  }
  ```
- **Response:** `201 Created`

### Update Room Operational Status
- **Endpoint:** `PATCH /api/hotels/:id/rooms/:roomId/status`
- **Access:** Staff / Admin
- **Request Body:**
  ```json
  {
    "status": "cleaning"
  }
  ```
- **Allowed Statuses:** `available`, `occupied`, `maintenance`, `cleaning`.
- **Response:** `200 OK`

### Create Booking Hold
- **Endpoint:** `POST /api/hotels/:id/rooms/holds`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "roomTypeId": "66a011111111111111111111",
    "checkIn": "2026-12-01T00:00:00.000Z",
    "checkOut": "2026-12-05T00:00:00.000Z",
    "adultCount": 2,
    "childCount": 0
  }
  ```
- **Response:** `201 Created` (10-minute hold with automatic MongoDB TTL index expiration).

---

## 5. Reservation Lifecycle & Payments

### Create Payment Intent
- **Endpoint:** `POST /api/hotels/:hotelId/bookings/payment-intent`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "numberOfNights": "3",
    "roomTypeId": "66a011111111111111111111",
    "paymentMethod": "simulated"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "paymentIntentId": "sim_pi_1731150000000_abc123",
    "clientSecret": "sim_secret_demo",
    "totalCost": 540,
    "isSimulated": true
  }
  ```

### Create Confirmed Booking (Concurrency Safe)
- **Endpoint:** `POST /api/hotels/:hotelId/bookings`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "firstName": "Guest",
    "lastName": "Traveler",
    "email": "guest@user.com",
    "phone": "+44 7700 900123",
    "adultCount": 2,
    "childCount": 0,
    "checkIn": "2026-12-01T00:00:00.000Z",
    "checkOut": "2026-12-05T00:00:00.000Z",
    "totalCost": 540,
    "paymentIntentId": "sim_pi_...",
    "paymentMethod": "simulated",
    "roomTypeId": "66a011111111111111111111",
    "specialRequests": "Late check-in"
  }
  ```
- **Responses:**
  - `201 Created`: Returns booking object with unique `bookingReference` (e.g. `BK-XXXX-XXXX`), assigned `roomId`, and `roomNumber`.
  - `409 Conflict`: Returned if all rooms of the requested type are fully booked for overlapping dates.
  - `400 Bad Request`: Returned if check-in is in the past, check-out <= check-in, or guest count exceeds capacity.

### View Guest Bookings
- **Endpoint:** `GET /api/my-bookings`
- **Access:** Authenticated
- **Response:** `200 OK` Returns hotels array containing the user's bookings with reference IDs and stay statuses.

### Cancel Booking
- **Endpoint:** `POST /api/bookings/:id/cancel`
- **Access:** Authenticated (Must own the booking or be Admin)
- **Response:** `200 OK` (Refunds simulated or Stripe charge, frees room to `available`, appends audit event).

---

## 6. Staff Front-Desk Operations

### Operations Summary
- **Endpoint:** `GET /api/staff/operations`
- **Access:** Staff / Admin
- **Query Parameters:** `hotelId` (optional; defaults to staff's assigned hotel)
- **Response:** `200 OK`
  ```json
  {
    "todayArrivals": [ ... ],
    "todayDepartures": [ ... ],
    "inHouseGuests": [ ... ],
    "roomStatusCounts": {
      "total": 12,
      "available": 6,
      "occupied": 4,
      "maintenance": 1,
      "cleaning": 1
    }
  }
  ```

### Guest Search
- **Endpoint:** `GET /api/staff/guests/search`
- **Access:** Staff / Admin
- **Query Parameters:** `query` (name, email, phone, reference), `status`, `page`, `limit`
- **Response:** `200 OK` Paginated matching reservations.

### Check-In Guest
- **Endpoint:** `POST /api/staff/bookings/:id/check-in`
- **Access:** Staff / Admin
- **Response:** `200 OK` Transitions booking to `checked_in`, room to `occupied`, logs staff action.

### Check-Out Guest
- **Endpoint:** `POST /api/staff/bookings/:id/check-out`
- **Access:** Staff / Admin
- **Response:** `200 OK` Transitions booking to `checked_out`, room to `cleaning`, logs staff action.

### System Audit Logs
- **Endpoint:** `GET /api/staff/audit-logs`
- **Access:** Admin
- **Query Parameters:** `action`, `resource`, `page`, `limit`
- **Response:** `200 OK` Chronological log of operational and administrative actions.

---

## 7. Business Insights & Telemetry

### Dashboard Analytics
- **Endpoint:** `GET /api/business-insights/dashboard`
- **Access:** Admin / Hotel Owner
- **Response:** `200 OK` Live metrics including total rooms, occupancy rate, ADR, RevPAR, and revenue breakdown.

### Health Check
- **Endpoint:** `GET /api/health`
- **Access:** Public
- **Response:** `200 OK`
  ```json
  {
    "status": "OK",
    "timestamp": "2026-11-09T11:15:00.000Z",
    "uptime": 1245.6
  }
  ```

