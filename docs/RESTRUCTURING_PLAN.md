# Codebase Restructuring & Architectural Modernization Plan

<!-- Architectural Refactoring Plan — Hotel Booking Management System -->
**Author:** Engineering Team  
**Date:** November 2026  
**Branch:** `refactor/project-structure`  
**Status:** Complete — All Verification Steps Passed (Exit 0)

---

## 1. Executive Summary

This plan outlines the safe, incremental refactoring of the Hotel Booking Management System from non-standard folder names (`hotel-booking-backend/` and `hotel-booking-frontend/`) into a clean, modern, enterprise-ready multi-package repository architecture with clearly separated `frontend/`, `backend/`, `shared/`, `e2e-tests/`, and root orchestration.

The primary directive is **zero functional regression**: all existing authentication, database schemas, API contracts, booking concurrency controls, front-desk operations, and UI workflows will be preserved without interruption.

---

## 2. Existing Folder Structure Audit

```text
/ (repository root)
├── .agile-v/                       # Living AQMS state, requirements, checklists
├── .cursor/                        # Editor rules
├── data/                           # Seed hotel imagery
├── docs/                           # Architecture, guides, and walkthroughs
├── e2e-tests/                      # Playwright E2E test suite
├── hotel-booking-backend/          # Express + Mongoose + TypeScript API
│   ├── .env / .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Express app + DB connection + listen bundled
│       ├── lib/                    # Audit, cookie options, LLM
│       ├── middleware/             # Auth, RBAC, requireAdmin
│       ├── models/                 # Mongoose schemas (Hotel, Room, User, etc.)
│       ├── routes/                 # REST routes
│       ├── scripts/seed.ts         # Database seed script
│       └── swagger.ts              # Swagger UI docs configuration
├── hotel-booking-frontend/         # React 18 + Vite + Tailwind SPA
│   ├── .env.local / .env.local.example
│   ├── package.json
│   ├── tsconfig.json / tsconfig.node.json
│   ├── vercel.json
│   ├── vite.config.ts
│   └── src/
│       ├── api-client.ts           # Primary API functions
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/             # Reusable UI & domain widgets
│       ├── contexts/               # AppContext, SearchContext
│       ├── forms/                  # BookingForm, GuestInfoForm, ManageHotelForm
│       ├── hooks/                  # Custom React hooks
│       ├── layouts/                # Layout, AdminLayout, StaffLayout, AuthLayout
│       ├── lib/                    # api-client instance, utils, query invalidation
│       └── pages/                  # Route views (admin, staff, guest, public)
├── shared/                         # Shared TypeScript contracts
│   ├── types.ts
│   └── types.js
├── AGENTS.md / CLAUDE.md / SECURITY.md
├── LICENSE
└── README.md
```

### Problems Identified in Current Structure
1. **Inconsistent and Verbose Directory Naming**: `hotel-booking-backend/` and `hotel-booking-frontend/` are redundant prefixes inside a repo already dedicated to the hotel booking system.
2. **Absence of Root Orchestration**: No root `package.json` exists; developers must open separate terminals and navigate into nested subdirectories for daily commands (`cd hotel-booking-backend && npm run dev`).
3. **Coupled Server Initialization**: Backend `src/index.ts` combines Express application configuration, route mounting, MongoDB connection, and `app.listen()` in a single file, making automated API integration testing (e.g. Supertest) difficult without binding physical network ports.
4. **Hardcoded Path Assumptions in Docker & Scripts**: `Dockerfile` and `package.json` scripts currently reference hardcoded paths such as `node dist/hotel-booking-backend/src/index.js` which breaks if renamed.
5. **Scattered Environment Documentation**: Incomplete `.env.example` files across directories without a unified root reference guide.

---

## 3. Proposed Target Architecture

```text
/ (repository root)
├── frontend/                       # React 18 + Vite + Tailwind SPA (renamed from hotel-booking-frontend)
│   ├── public/
│   ├── src/
│   │   ├── api-client.ts           # API service methods
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/             # UI, domain components, filters
│   │   ├── contexts/               # AppContext, SearchContext
│   │   ├── forms/                  # BookingForm, GuestInfoForm, ManageHotelForm
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── layouts/                # Layout, AdminLayout, StaffLayout, AuthLayout
│   │   ├── lib/                    # Axios instance, helpers, query invalidators
│   │   └── pages/                  # Route pages (admin, staff, guest, public)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vercel.json
│   └── vite.config.ts
│
├── backend/                        # Express + Mongoose + TypeScript API (renamed from hotel-booking-backend)
│   ├── src/
│   │   ├── app.ts                  # Express application setup, middlewares, and routes
│   │   ├── server.ts               # Database connection and HTTP server listener
│   │   ├── lib/                    # Utilities (audit, cookie-options, llm)
│   │   ├── middleware/             # Auth, RBAC, Admin guards
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # Express REST endpoint routers
│   │   ├── scripts/                # Database seed script (seed.ts)
│   │   └── swagger.ts              # OpenAPI spec definition
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                         # Shared type definitions
│   └── types.ts                    # UserType, HotelType, RoomType, BookingType, etc.
│
├── e2e-tests/                      # Playwright end-to-end test suite
├── docs/                           # Architectural, gap analysis, and refactoring documentation
│   ├── ARCHITECTURE.md
│   ├── ASSESSMENT_GAP_ANALYSIS.md
│   ├── RESTRUCTURING_PLAN.md
│   └── RESTRUCTURING_REPORT.md
│
├── data/                           # Seed imagery assets
├── .gitignore
├── .env.example                    # Reference root environment guide
├── package.json                    # Root orchestration scripts
├── README.md                       # Comprehensive guide
└── LICENSE
```

---

## 4. Step-by-Step Migration Plan

### Step 1: Directory Renaming
- Rename `hotel-booking-backend/` → `backend/`
- Rename `hotel-booking-frontend/` → `frontend/`

### Step 2: Backend Architecture Refactoring
- Split `backend/src/index.ts` into:
  - `backend/src/app.ts`: Creates Express `app`, configures Helmet, CORS, cookies, rate limiters, routes (`/api/auth`, `/api/users`, `/api/hotels`, `/api/staff`, etc.), and Swagger docs. Exports `app`.
  - `backend/src/server.ts`: Loads environment variables, connects to MongoDB via Mongoose, handles graceful shutdown, and executes `app.listen(PORT)`.
  - Retain `backend/src/index.ts` as a re-export of `server.ts` for backwards compatibility with any existing external tooling.
- Update `backend/package.json`:
  - `"main": "./src/server.ts"`
  - `"dev": "nodemon --watch src --exec ts-node src/server.ts"`
  - `"start": "node dist/src/server.js"` (adjusted for TypeScript emit path)

### Step 3: Path and Import Audit
- Verify all imports from `shared/types.ts`:
  - `backend/src/models/*` (depth 3) → `../../../shared/types` (unchanged)
  - `frontend/src/pages/admin/*` (depth 4) → `../../../../shared/types` (unchanged)
  - `frontend/src/pages/staff/*` (depth 4) → `../../../../shared/types` (unchanged)
- Update Dockerfile:
  - Replace all `hotel-booking-backend/` occurrences with `backend/`
  - Adjust CMD to `["node", "dist/src/server.js"]`
- Update `frontend/vercel.json`:
  - Verify build command `"npm run build"` and output directory `"dist"`

### Step 4: Root `package.json` Orchestration
Create root `package.json` with scripts:
- `npm run dev`: runs `npm --prefix backend run dev` & `npm --prefix frontend run dev`
- `npm run dev:backend`: `npm --prefix backend run dev`
- `npm run dev:frontend`: `npm --prefix frontend run dev`
- `npm run build`: `npm --prefix backend run build && npm --prefix frontend run build`
- `npm run build:backend`: `npm --prefix backend run build`
- `npm run build:frontend`: `npm --prefix frontend run build`
- `npm run lint`: `npm --prefix frontend run lint`
- `npm run seed`: `npm --prefix backend run seed`

### Step 5: Environment Variables Standardization
- Create root `.env.example`
- Create `backend/.env.example` with exact variable descriptions
- Create `frontend/.env.example` with `VITE_API_BASE_URL`

### Step 6: Testing & Verification
- Compile backend: `npm --prefix backend run build`
- Compile & lint frontend: `npm --prefix frontend run build && npm --prefix frontend run lint`
- Test root orchestration commands: `npm run build`

### Step 7: Documentation
- Update root `README.md` with the new structure and commands.
- Generate `docs/RESTRUCTURING_REPORT.md`.

---

## 5. Potential Breaking Changes & Prevention Strategy

| Risk | Cause | Prevention Measure |
|------|-------|--------------------|
| **TS compilation output path change** | Moving `hotel-booking-backend` to `backend` changes relative path to `shared/` which affects `outDir` structure in `dist/`. | Check `dist/` hierarchy after build and ensure `package.json` `"start"` script points directly to the compiled server entry. |
| **Broken import paths** | Relative imports referencing renamed folders. | Verify imports using automated TypeScript compiler (`tsc --noEmit`). |
| **Docker build failure** | Outdated folder names in `backend/Dockerfile`. | Update all `COPY` commands in `Dockerfile` to match `backend/`. |
| **CI / Vercel deployment breakage** | Vercel root directory setting or `vercel.json` rewrite paths. | Preserve `vercel.json` inside `frontend/` and configure root scripts properly. |
| **Port collisions** | Dev servers starting on conflicting ports. | Frontend Vite pinned to port `5174`; Backend Express pinned to port `5001`. |

---

## 6. Verification Criteria

1. `npm --prefix backend run build` exits 0.
2. `npm --prefix frontend run build` exits 0.
3. `npm --prefix frontend run lint` exits 0.
4. Root `npm run build` exits 0.
5. Both `backend/` and `frontend/` have accurate `.env.example` templates.
6. Root `README.md` fully documents the new structure, setup, and run instructions.
