# Hotel Booking Management and Operations System — Full-Stack MERN

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18-black)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.5-38B2AC)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF)](https://stripe.com/)

A modern, enterprise-ready **Hotel Booking Management and Operations System** built on the **MERN** stack (MongoDB, Express, React, Node.js) with end-to-end TypeScript.

This platform bridges customer-facing hotel discovery with front-desk operations, room-level inventory control, role-based workflows, and concurrency-protected reservation lifecycles.

- **Frontend Application:** `http://localhost:5174` (Vite SPA)
- **Backend API:** `http://localhost:5001` (Express REST API)
- **Interactive API Docs (Swagger):** `http://localhost:5001/api-docs`
- **System Health Endpoint:** `http://localhost:5001/api/health`

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture & Folder Structure](#system-architecture--folder-structure)
- [Role-Based Access & Demo Credentials](#role-based-access--demo-credentials)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Production Build](#production-build)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Development Guidelines & Attribution](#development-guidelines--attribution)

---

## Project Overview

The Hotel Booking Management System supports the full hospitality lifecycle across four distinct user roles:

1. **Guest Experience (Travelers):**
   - Search properties by location, date range, guest capacity, price, star rating, and amenities.
   - View hotel details and choose specific room types (e.g. Classic King, Deluxe River Suite).
   - Dual-mode checkout: simulated instant payment for offline evaluation or Stripe test cards.
   - Unique booking reference generation (`BK-XXXX-XXXX`).
   - Self-service booking management and cancellation with automated inventory release.

2. **Front-Desk Operations (`/staff`):**
   - Live Operations Dashboard: real-time counts for today's arrivals, today's departures, and in-house guests.
   - Live Room Status Rack: tracks rooms across four operational states (`Available`, `Occupied`, `Maintenance`, `Cleaning`).
   - Front-desk guest search across name, email, phone, room number, or booking reference.
   - Guest check-in workflow: marks booking `checked_in`, sets room status to `occupied`.
   - Guest check-out workflow: marks booking `checked_out`, automatically sends room to `cleaning`.

3. **Property & Inventory Administration (`/admin`):**
   - Room Management (`/admin/rooms`): create room types, configure bed arrangements, set base rates, and manage physical rooms.
   - User Role Management (`/admin/users`): assign roles (`guest`, `staff`, `admin`, `hotel_owner`) and link staff to specific hotels.
   - Compliance Audit Log (`/admin/activity`): database-backed audit trail recording operations events (`CHECK_IN`, `CHECK_OUT`, `ROOM_STATUS_UPDATED`, `BOOKING_CREATED`).
   - Business Insights (`/business-insights`): real database metrics including occupancy rate, ADR, RevPAR, and revenue breakdown.

4. **Hotel Owner Operations (`/my-hotels`):**
   - Create and edit property listings with multipart image uploads (up to 6 photos).
   - Monitor booking rosters and revenue per managed property.

---

## System Architecture & Folder Structure

The repository is organized into a clean monorepo architecture:

```text
/ (repository root)
├── frontend/                       # React 18 + Vite SPA
│   ├── public/                     # Static web assets
│   ├── src/
│   │   ├── api-client.ts           # Typed API service client
│   │   ├── App.tsx                 # Client-side router and route definitions
│   │   ├── main.tsx                # React entry point
│   │   ├── components/             # Reusable UI primitives & domain components
│   │   ├── contexts/               # React Contexts (AppContext, SearchContext)
│   │   ├── forms/                  # BookingForm, GuestInfoForm, ManageHotelForm
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── layouts/                # Layout, AdminLayout, StaffLayout, AuthLayout
│   │   ├── lib/                    # Axios instance, query invalidation, utils
│   │   └── pages/                  # Page views (admin, staff, guest, public)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vite.config.ts
│
├── backend/                        # Express + Mongoose + TypeScript API
│   ├── src/
│   │   ├── app.ts                  # Express application setup, middlewares, routes
│   │   ├── server.ts               # Database connection, port listener, shutdown
│   │   ├── index.ts                # Main entry point re-exporting app & server
│   │   ├── lib/                    # Audit logger, cookie options, LLM helpers
│   │   ├── middleware/             # Auth JWT guard, RBAC authorization
│   │   ├── models/                 # Mongoose schemas (Hotel, Room, User, etc.)
│   │   ├── routes/                 # Express endpoint routers
│   │   ├── scripts/                # Database seed script (seed.ts)
│   │   └── swagger.ts              # OpenAPI 3.0 specification
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                         # Cross-cutting TypeScript contracts
│   └── types.ts                    # Shared entity types (UserType, HotelType, etc.)
│
├── e2e-tests/                      # Playwright browser test suite
├── docs/                           # Architecture, guides, and refactoring records
│   ├── ARCHITECTURE.md             # System design & ER diagram
│   ├── API_DOCUMENTATION.md        # REST API endpoint reference
│   ├── ASSESSMENT_GAP_ANALYSIS.md  # 18-point assessment compliance matrix
│   ├── RESTRUCTURING_PLAN.md       # Refactoring architectural blueprint
│   └── RESTRUCTURING_REPORT.md     # Post-migration audit and test report
│
├── scripts/                        # Development orchestration scripts
│   └── dev.js                      # Native Node.js multi-process development runner
├── data/                           # Seed hotel imagery
├── .gitignore
├── .env.example                    # Reference root environment guide
├── package.json                    # Root npm scripts
├── README.md                       # Complete documentation (this file)
└── LICENSE                         # MIT License
```

### How Frontend Communicates with Backend
1. **API Client Layer:** Frontend components invoke methods in `frontend/src/api-client.ts` which uses a configured Axios instance (`frontend/src/lib/api-client.ts`).
2. **Base URL Resolution:** In development, Axios communicates with `http://localhost:5001`. In production, it targets `VITE_API_BASE_URL`.
3. **Session Credentials:** Authentication tokens are stored in secure HTTP-only cookies (`auth_token`) and passed automatically across requests (`withCredentials: true`).

---

## Role-Based Access & Demo Credentials

After running `npm run seed`, the database is populated with test accounts for all roles:

| Role | Email | Password | Permissions & Portals |
|------|-------|----------|-----------------------|
| **Admin** | `test@user.com` | `12345678` | System administration (`/admin`), room types, user roles, audit logs, analytics |
| **Staff** | `staff@hotel.com` | `12345678` | Front-desk operations (`/staff`), check-in, check-out, room rack |
| **Hotel Owner** | `owner@hotel.com` | `12345678` | Property management (`/my-hotels`), property analytics |
| **Guest** | `guest@user.com` | `12345678` | Hotel booking, simulated payments, history (`/my-bookings`) |

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js:** v18.0.0 or higher (v20+ recommended). Check with `node -v`.
- **npm:** v9.0.0 or higher. Check with `npm -v`.
- **MongoDB:** v6.0 or higher (either running locally on `localhost:27017` or via MongoDB Atlas).
- **Git:** v2.30 or higher.

---

## Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY>.git
cd <YOUR-REPOSITORY>
```

Replace `<YOUR-USERNAME>` and `<YOUR-REPOSITORY>` with the confirmed GitHub account and repository name.

### 2. Install Dependencies
Install dependencies for both frontend and backend from their directories:

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to repository root
cd ..
```

---

## Environment Configuration

The application requires environment configuration in `backend/` and `frontend/`.

### 1. Backend Environment Setup (`backend/.env`)

Copy the template:
```bash
cp backend/.env.example backend/.env
```

Configure `backend/.env`:
```env
# Server Port
PORT=5001
NODE_ENV=development

# MongoDB Connection
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/hotel-booking-local

# Authentication
JWT_SECRET_KEY=replace_with_a_secure_random_jwt_secret_key_minimum_32_chars

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:5001

# Optional Integrations:
# If Stripe is omitted or set to placeholder, the system defaults to Simulated Payments:
STRIPE_API_KEY=sk_test_placeholder_for_local_demo

# If Cloudinary is omitted, the system defaults to Unsplash placeholder images:
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. Frontend Environment Setup (`frontend/.env.local`)

Copy the template:
```bash
cp frontend/.env.example frontend/.env.local
```

Configure `frontend/.env.local`:
```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:5001

# Optional Stripe Publishable Key
# VITE_STRIPE_PUB_KEY=pk_test_your_stripe_publishable_key
```

### 3. Seed Demo Data
To populate demo hotels, room types, physical rooms, and test users:
```bash
npm run seed
```

---

## Running the Application

### Recommended: One-Command Startup (Root)
From the repository root, start both the backend API and frontend SPA simultaneously:

```bash
npm run dev
```

This runs `scripts/dev.js`, launching:
- **Backend API:** `http://localhost:5001`
- **Frontend SPA:** `http://localhost:5174`

### Running Components Independently

#### Run Backend Only:
```bash
npm run dev:backend
# Or: cd backend && npm run dev
```

#### Run Frontend Only:
```bash
npm run dev:frontend
# Or: cd frontend && npm run dev
```

---

## Production Build

To compile both backend TypeScript and frontend Vite assets for production:

```bash
npm run build
```

This executes:
1. `npm run build:backend`: compiles TypeScript into `backend/dist/`.
2. `npm run build:frontend`: compiles and minifies the SPA into `frontend/dist/`.

### Starting Production Server:
```bash
npm run start
# Or: cd backend && npm start
```

---

## Testing

### Code Quality & Linting
Run ESLint across all TypeScript source files:
```bash
npm run lint
```

### End-to-End Tests (Playwright)
The `e2e-tests/` directory contains Playwright browser automated tests:
```bash
npm run test:e2e
# Or: cd e2e-tests && npx playwright test
```

---

## API Documentation

The backend provides interactive OpenAPI documentation:

- **Interactive Swagger UI:** Open `http://localhost:5001/api-docs` in your browser.
- **Markdown API Directory:** Refer to [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) for full endpoint specifications, request payloads, and status codes.

---

## Troubleshooting & FAQ

### 1. MongoDB Connection Error (`ECONNREFUSED 127.0.0.1:27017`)
- **Cause:** Local MongoDB service is not running.
- **Solution:** Ensure `mongod` is started:
  ```bash
  sudo systemctl start mongod
  # Or use a free MongoDB Atlas connection string in backend/.env:
  # MONGODB_CONNECTION_STRING=mongodb+srv://user:pass@cluster.mongodb.net/dbname
  ```

### 2. Port Collision (`EADDRINUSE: port 5001`)
- **Cause:** Another process is occupying port 5001.
- **Solution:** Identify and stop the occupying process:
  ```bash
  lsof -i :5001
  kill -9 <PID>
  # Alternatively, change PORT=5002 in backend/.env and update frontend/.env.local
  ```

### 3. Missing Cloudinary / Stripe Credentials
- **Graceful Fallback:** External services are optional. If `STRIPE_API_KEY` is omitted or contains `"placeholder"`, the system automatically switches to **Simulated Payment Mode**. If Cloudinary credentials are not provided, image uploads fall back to high-resolution Unsplash hotel photos.

### 4. CORS Errors in Browser Console
- **Cause:** Frontend URL does not match backend `FRONTEND_URL`.
- **Solution:** Verify `FRONTEND_URL=http://localhost:5174` in `backend/.env`.

---

## Development Guidelines & Attribution

### Original Attribution
This codebase is developed and adapted from the original open-source Hotel Booking Management System created by Arnob Mahmud under the **MIT License**.

### Guidelines
- All shared contracts must reside in `shared/types.ts`.
- Backend endpoints must enforce authorization via `backend/src/middleware/rbac.ts`.
- Avoid mixing frontend and backend dependencies.
- Maintain documentation integrity across refactoring cycles.
