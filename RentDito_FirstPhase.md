# RentDito — Complete Implementation Plan v2

## Updated Architecture

### 4 User Roles (Simplified)

| Role | Scope | Description |
|---|---|---|
| `super_admin` | Platform-wide | Full platform control, user management, moderation |
| `landlord` | Own properties | Full access to all features for their properties |
| `staff` | Assigned properties | Configurable access — landlord sets a custom **position name** (e.g., "Admin", "Caretaker", "Manager") and toggles which feature modules are accessible. Position name is cosmetic only. |
| `tenant` | Own unit | Views their unit, bills, contract, submits maintenance requests |

> [!IMPORTANT]
> The old `landlord_admin` and `landlord_caretaker` roles are merged into a single `staff` role. The landlord has full control to customize each staff member's access. The position name field is just a label — it does NOT affect permissions.

### Permission Keys (Sidebar Modules)

Each key maps 1:1 to a sidebar item. The landlord toggles these on/off per staff member:

| Key | Sidebar Label | Icon |
|---|---|---|
| `dashboard` | Overview | `Dashboard` |
| `properties` | Properties | `HomeWork` |
| `units` | Units & Rooms | `MeetingRoom` |
| `tenants` | Tenants | `People` |
| `bookings` | Bookings & Visits | `EventNote` |
| `billing` | Billing & Payments | `Receipt` |
| `contracts` | Contracts | `Description` |
| `utilities` | Utility Dashboard | `ElectricBolt` |
| `financials` | Financials | `AccountBalance` |
| `inventory` | Inventory | `Inventory2` |
| `maintenance` | Maintenance | `Build` |
| `documents` | Documents & Legal | `Folder` |
| `reports` | Reports | `Assessment` |
| `security` | Security | `Security` |
| `team` | Team Management | `Group` |

**Permission presets** (for quick setup):
- **Full Access** → all 15 keys
- **Operations Manager** → all except `financials`, `team`
- **Basic Staff** → `dashboard`, `units`, `bookings`, `inventory`, `maintenance` only
- **Custom** → manual toggle

---

## Developer Roles & Domain Ownership

| Developer | Alias | Role | Primary Domains |
|---|---|---|---|
| **Rey** | Dev Lead | Full-stack lead | Auth, RBAC, Team Management, Billing & Payments, Contracts, Financial Reports |
| **Paul** | Full-stack | Full-stack | Properties, Units, Tenants, Utility Dashboard, Documents & Legal |
| **Emanuel** | Full-stack | Full-stack | Bookings & Visits, Reservations, Check-in/Checkout, Inventory, Maintenance, Reports & Forecasts |

### Zero-Blocking Strategy

1. **Day 1**: All 3 devs define shared types/interfaces together, then work on non-overlapping foundation pieces
2. **Day 2+**: Each dev works in their own feature directory — different models, routes, and pages
3. **Backend models reference each other by `ObjectId` string** — no import dependencies between model files
4. **Frontend pages import only from shared `domain/entities/`** types (created Day 1 by Paul)
5. **Each dev commits and pushes at end of day** — others pull in the morning

### File Ownership (No Merge Conflicts)

```
server/src/
├── config/                          ← Rey (Day 1)
├── middleware/                      ← Rey (Day 1-3)
├── utils/                           ← Rey (Day 1)
├── models/
│   ├── User.ts                      ← Rey
│   ├── AuditLog.ts                  ← Rey
│   ├── Property.ts                  ← Paul
│   ├── Unit.ts                      ← Paul
│   ├── Tenant.ts                    ← Paul
│   ├── Document.ts                  ← Paul
│   ├── Booking.ts                   ← Emanuel
│   ├── Notification.ts             ← Emanuel
│   ├── Inventory.ts                 ← Emanuel
│   ├── InventoryRecord.ts          ← Emanuel
│   ├── MaintenanceRequest.ts       ← Emanuel
│   ├── Contract.ts                  ← Rey
│   ├── Bill.ts                      ← Rey
│   └── Payment.ts                   ← Rey
├── routes/
│   ├── auth.routes.ts               ← Rey
│   ├── user.routes.ts               ← Rey
│   ├── team.routes.ts               ← Rey
│   ├── contract.routes.ts           ← Rey
│   ├── billing.routes.ts            ← Rey
│   ├── payment.routes.ts            ← Rey
│   ├── property.routes.ts           ← Paul
│   ├── unit.routes.ts               ← Paul
│   ├── tenant.routes.ts             ← Paul
│   ├── document.routes.ts           ← Paul
│   ├── utility.routes.ts            ← Paul
│   ├── booking.routes.ts            ← Emanuel
│   ├── inventory.routes.ts          ← Emanuel
│   ├── maintenance.routes.ts        ← Emanuel
│   ├── notification.routes.ts       ← Emanuel
│   └── report.routes.ts             ← Emanuel
├── controllers/                     ← mirrors routes 1:1, same ownership
├── services/                        ← mirrors routes 1:1, same ownership
└── validators/                      ← mirrors routes 1:1, same ownership

client/src/
├── domain/entities/                 ← Paul (Day 1, then shared)
├── domain/repositories/             ← Paul (Day 1, then shared)
├── infrastructure/api/              ← Paul (Day 1)
├── infrastructure/services/         ← Each dev for their own feature
├── application/context/
│   ├── AuthContext.tsx               ← Rey
│   └── NotificationContext.tsx       ← Emanuel
├── application/hooks/               ← Each dev for their own feature
├── application/config/
│   └── menuConfig.ts                ← Paul (Day 3)
├── presentation/layouts/
│   ├── HubLayout.tsx                ← Paul (Day 3)
│   ├── TenantLayout.tsx             ← Paul (Day 3)
│   └── AdminLayout.tsx              ← Paul (Day 4)
├── presentation/components/         ← Emanuel (shared components)
├── presentation/pages/
│   ├── auth/                        ← Emanuel
│   ├── hub/
│   │   ├── overview/                ← Emanuel (Day 4)
│   │   ├── team/                    ← Rey (Day 3)
│   │   ├── properties/              ← Paul
│   │   ├── units/                   ← Paul
│   │   ├── tenants/                 ← Paul
│   │   ├── bookings/                ← Emanuel
│   │   ├── billing/                 ← Rey
│   │   ├── contracts/               ← Rey
│   │   ├── utilities/               ← Paul
│   │   ├── financials/              ← Rey
│   │   ├── inventory/               ← Emanuel
│   │   ├── maintenance/             ← Emanuel
│   │   ├── documents/               ← Paul
│   │   ├── reports/                 ← Emanuel
│   │   └── security/                ← Emanuel
│   ├── tenant/                      ← Emanuel (Phase 4)
│   ├── admin/                       ← Rey (Phase 4)
│   └── common/                      ← Emanuel
```

---

## Phase 1: Foundation & Auth (Days 1–5)

### Day 1 — Project Skeleton & Core Types

---

#### 👑 Rey — Backend Infrastructure Setup

**🤖 AI Model: Gemini** (standard setup, no complex logic)

**Tasks:**
1. Create server folder structure (all empty directories)
2. Create `server/src/config/db.ts` — MongoDB connection handler with retry logic
3. Create `server/src/config/cloudinary.ts` — Cloudinary v2 config from env vars
4. Create `server/src/config/mailer.ts` — Nodemailer transporter setup
5. Create `server/src/utils/jwt.ts` — `signAccessToken()`, `signRefreshToken()`, `verifyToken()` using jsonwebtoken
6. Create `server/src/utils/password.ts` — `hashPassword()`, `comparePassword()` using bcryptjs
7. Create enhanced `server/src/models/User.ts`:
   ```
   Roles: 'super_admin' | 'landlord' | 'staff' | 'tenant'
   Fields: name, email, phone, passwordHash, role, status, isVerified, avatar,
           positionName? (staff only, cosmetic label),
           landlordId? (staff only — which landlord they work for),
           assignedPropertyIds? (staff only),
           permissions? (staff only — string array of permission keys),
           currentUnitId? (tenant only),
           emergencyContact? (tenant only — {name, phone, relation}),
           refreshToken? (for JWT rotation)
   Indexes: email (unique), role, landlordId
   ```
8. Update `server/src/server.ts` — use `config/db.ts` for connection, register middleware chain (helmet, cors, morgan, express.json), add route mounting placeholders

**Files to create:**
```
server/src/config/db.ts
server/src/config/cloudinary.ts
server/src/config/mailer.ts
server/src/utils/jwt.ts
server/src/utils/password.ts
server/src/models/User.ts (overwrite existing)
server/src/server.ts (overwrite existing)
```

**✅ Verification:**
- Run `npm run dev` in `/server` → server starts, connects to MongoDB, prints success log
- Open MongoDB Compass → verify `rentdito` database is created
- Check that no errors appear in the terminal

---

#### 🔧 Paul — Frontend Types & API Client

**🤖 AI Model: Gemini** (type definitions and axios setup)

**Tasks:**
1. Create/update ALL shared TypeScript type interfaces in `domain/entities/`:
   - `User.ts` → updated: add `staff` role, `positionName`, `permissions`, `landlordId`, `assignedPropertyIds`
   - `Property.ts` → keep existing (already well-defined)
   - `Unit.ts` → keep existing
   - `Booking.ts` → NEW: all visit/reservation fields
   - `Contract.ts` → NEW: lease agreement fields
   - `Bill.ts` → NEW: billing fields
   - `Payment.ts` → NEW: payment record fields
   - `Inventory.ts` → NEW: item tracking fields
   - `InventoryRecord.ts` → NEW: accountability tracking
   - `MaintenanceRequest.ts` → NEW: work order fields
   - `DocumentRecord.ts` → NEW: uploaded document metadata
   - `Notification.ts` → NEW: notification fields
   - `AuditLog.ts` → NEW: activity log fields
2. Create `infrastructure/api/apiClient.ts`:
   - Axios instance with `baseURL` from env
   - Request interceptor: attach Bearer token from localStorage
   - Response interceptor: handle 401 → try refresh token → if fail, logout
   - Error normalizer (consistent error shape)
3. Create `infrastructure/api/endpoints.ts`:
   - All API endpoint constants organized by feature (AUTH, PROPERTIES, UNITS, BOOKINGS, etc.)
4. Update `domain/repositories/AuthRepository.ts` — add `register`, `refreshToken`, `forgotPassword`, `resetPassword` method signatures

**Files to create/modify:**
```
client/src/domain/entities/User.ts (overwrite)
client/src/domain/entities/Booking.ts (new)
client/src/domain/entities/Contract.ts (new)
client/src/domain/entities/Bill.ts (new)
client/src/domain/entities/Payment.ts (new)
client/src/domain/entities/Inventory.ts (new)
client/src/domain/entities/InventoryRecord.ts (new)
client/src/domain/entities/MaintenanceRequest.ts (new)
client/src/domain/entities/DocumentRecord.ts (new)
client/src/domain/entities/Notification.ts (new)
client/src/domain/entities/AuditLog.ts (new)
client/src/infrastructure/api/apiClient.ts (new)
client/src/infrastructure/api/endpoints.ts (new)
client/src/domain/repositories/AuthRepository.ts (overwrite)
```

**✅ Verification:**
- TypeScript compiles with no errors: `cd client && npx tsc --noEmit`
- All entity types can be imported without circular dependencies
- Api client can be instantiated without runtime errors (import it in App.tsx temporarily)

---

#### 🔧 Emanuel — Auth Pages & Shared Components

**🤖 AI Model: Gemini** (standard UI pages)

**Tasks:**
1. Create `presentation/pages/auth/Register.tsx`:
   - Form fields: name, email, phone, password, confirm password
   - Role selection: "I'm a Landlord" / "I'm a Tenant" (radio or toggle)
   - Form validation (email format, password strength, match confirmation)
   - Submit calls register API (mock for now — just console.log the payload)
   - Link to Login page
   - Match the existing Login page visual style
2. Create `presentation/pages/auth/ForgotPassword.tsx`:
   - Email input field
   - Submit button → shows success message "Check your email"
   - Link back to Login
3. Create `presentation/pages/auth/ResetPassword.tsx`:
   - New password + confirm password fields
   - Token from URL params
   - Submit → success → redirects to Login
4. Create shared reusable components:
   - `presentation/components/LoadingOverlay.tsx` — full-screen spinner with backdrop
   - `presentation/components/StatusBadge.tsx` — colored chip for statuses (Active, Pending, etc.)
   - `presentation/components/PageHeader.tsx` — consistent page title + optional subtitle + optional action button
   - `presentation/components/ConfirmDialog.tsx` — "Are you sure?" modal with cancel/confirm
   - `presentation/components/EmptyState.tsx` — illustration + text for when data lists are empty

**Files to create:**
```
client/src/presentation/pages/auth/Register.tsx
client/src/presentation/pages/auth/ForgotPassword.tsx
client/src/presentation/pages/auth/ResetPassword.tsx
client/src/presentation/components/LoadingOverlay.tsx
client/src/presentation/components/StatusBadge.tsx
client/src/presentation/components/PageHeader.tsx
client/src/presentation/components/ConfirmDialog.tsx
client/src/presentation/components/EmptyState.tsx
```

**✅ Verification:**
- Temporarily add routes in `App.tsx` for `/register`, `/forgot-password`, `/reset-password`
- Visit each URL → page renders with all form fields
- Fill out Register form → console shows payload object
- Components render correctly when imported into any page

---

### Day 2 — Authentication System

---

#### 👑 Rey — Backend Auth API

**🤖 AI Model: Claude Opus** ⚡ (security-critical: JWT rotation, password hashing, token management)

**Tasks:**
1. Create `services/auth.service.ts`:
   - `register(data)` → validate uniqueness, hash password, create User, generate tokens
   - `login(email, password)` → find user, compare password, generate access + refresh tokens, save refresh token to User doc
   - `refreshToken(token)` → verify refresh token, check against stored token (rotation), generate new pair
   - `forgotPassword(email)` → generate reset token, save to User, send email via mailer
   - `resetPassword(token, newPassword)` → verify reset token, hash new password, update User, clear token
   - `logout(userId)` → clear stored refresh token
2. Create `controllers/auth.controller.ts` — thin controller, delegates to service, sends responses
3. Create `routes/auth.routes.ts`:
   ```
   POST /api/auth/register     → register
   POST /api/auth/login        → login
   POST /api/auth/refresh      → refreshToken
   POST /api/auth/forgot-password → forgotPassword
   POST /api/auth/reset-password  → resetPassword
   POST /api/auth/logout       → logout (requires auth)
   ```
4. Create `validators/auth.validator.ts` — Joi schemas for each route
5. Create `middleware/auth.ts` — `authenticate` middleware: extract Bearer token, verify JWT, attach `req.user`, handle expired token
6. Mount auth routes in `server.ts`
7. Create `models/AuditLog.ts` — for future use:
   ```
   Fields: userId, action, resourceType, resourceId, details (object), ipAddress, createdAt
   ```

**Files to create:**
```
server/src/services/auth.service.ts
server/src/controllers/auth.controller.ts
server/src/routes/auth.routes.ts
server/src/validators/auth.validator.ts
server/src/middleware/auth.ts
server/src/models/AuditLog.ts
```

**✅ Verification (using Postman / Thunder Client):**
1. `POST /api/auth/register` with `{ name, email, password, role: "landlord" }` → 201 + tokens
2. `POST /api/auth/login` with same credentials → 200 + tokens
3. Use access token in Authorization header → access protected route (health check with auth) → 200
4. Use expired/invalid token → 401
5. `POST /api/auth/refresh` with refresh token → new token pair
6. Check MongoDB → User document exists with hashed password (not plain text!)

---

#### 🔧 Paul — Frontend Auth Integration

**🤖 AI Model: Claude Opus** ⚡ (complex state management: token rotation, auto-refresh, persistent sessions)

**Tasks:**
1. Create `infrastructure/services/AuthService.ts`:
   - Real API calls: `register()`, `login()`, `refreshToken()`, `forgotPassword()`, `resetPassword()`, `logout()`
   - Uses `apiClient` from Day 1
   - Stores access token + refresh token in localStorage
   - Exposes `getAccessToken()` for the API interceptor
2. Refactor `application/context/AuthContext.tsx`:
   - Replace `MockAuthService` with real `AuthService`
   - State: `user`, `isAuthenticated`, `isLoading` (for initial session check)
   - On mount: check localStorage for tokens, validate by calling `/api/auth/refresh`, hydrate user state
   - `login()` → call API → store tokens → set user → return user (for role-based redirect)
   - `logout()` → call API → clear tokens → clear state → redirect to login
   - Expose `user.permissions` for sidebar filtering
3. Update `presentation/pages/auth/Login.tsx`:
   - Connect to real `AuthContext.login()`
   - Show loading state during API call
   - Show error toast on failure
   - On success: redirect based on role:
     - `super_admin` → `/admin`
     - `landlord` / `staff` → `/hub`
     - `tenant` → `/tenant`
4. Delete `infrastructure/services/MockAuthService.ts` (no longer needed)

**Files to create/modify:**
```
client/src/infrastructure/services/AuthService.ts (new)
client/src/application/context/AuthContext.tsx (overwrite)
client/src/presentation/pages/auth/Login.tsx (modify)
client/src/infrastructure/services/MockAuthService.ts (delete)
```

**✅ Verification:**
- Start both server and client (`npm run dev` from root)
- Register a new landlord account → redirected to `/hub`
- Refresh the page → still logged in (token persisted)
- Open DevTools → Application → localStorage → see access/refresh tokens
- Register a tenant → redirected to `/tenant`
- Click "Sign Out" → redirected to `/login` → tokens cleared

---

#### 🔧 Emanuel — Auth Pages Connection & Seed Data

**🤖 AI Model: Gemini** (standard CRUD and UI)

**Tasks:**
1. Connect Register page to real `AuthContext.register()`:
   - Loading state on submit
   - Error display (duplicate email, validation errors)
   - Success → auto-login → redirect
2. Connect ForgotPassword page to real API
3. Connect ResetPassword page to real API
4. Create MongoDB seed script `server/src/seeds/seed.ts`:
   - Uses the User model to create test users:
     - 1 super admin (admin@rentdito.com / admin123)
     - 2 landlords (landlord1@rentdito.com, landlord2@rentdito.com)
     - 3 staff members (with different permissions assigned to landlord1)
     - 4 tenants
   - Run with: `npx tsx server/src/seeds/seed.ts`
   - Includes password hashing (use the `password.ts` util)
5. Create `server/src/seeds/seedProperties.ts`:
   - Create 3-4 sample properties for landlord1
   - Create 8-10 units across those properties
   - This mirrors the current hardcoded mock data but in MongoDB

**Files to create/modify:**
```
client/src/presentation/pages/auth/Register.tsx (modify — connect to API)
client/src/presentation/pages/auth/ForgotPassword.tsx (modify)
client/src/presentation/pages/auth/ResetPassword.tsx (modify)
server/src/seeds/seed.ts (new)
server/src/seeds/seedProperties.ts (new)
```

**✅ Verification:**
- Run `npx tsx server/src/seeds/seed.ts` → see "Seeded X users" log
- Open MongoDB Compass → Users collection → see all seeded users with hashed passwords
- Login with `admin@rentdito.com` / `admin123` → works ✅
- Login with `landlord1@rentdito.com` → works ✅
- Login with invalid credentials → shows error message ✅
- Register form → enter duplicate email → shows "Email already in use" error ✅

---

### Day 3 — RBAC & Permission System

---

#### 👑 Rey — Backend RBAC Middleware & Team API

**🤖 AI Model: Claude Opus** ⚡ (security-critical: multi-layer access control with property scoping)

**Tasks:**
1. Create `middleware/rbac.ts` with 3 middleware functions:
   - `requireRole(...roles: UserRole[])` → checks `req.user.role` is in allowed list → 403 if not
   - `requirePermission(key: string)` → for `staff` role: checks `req.user.permissions` includes key. `super_admin` and `landlord` always pass. `tenant` always fails (tenants use separate routes). → 403 if not
   - `requirePropertyAccess()` → extracts `propertyId` from `req.params` or `req.body`. For `landlord`: verifies property belongs to them. For `staff`: verifies property is in their `assignedPropertyIds`. For `super_admin`: always passes. → 403 if not
2. Create `services/team.service.ts`:
   - `inviteStaff(landlordId, { name, email, positionName, permissions, assignedPropertyIds })` → create User with role `staff`, generate temp password, send invite email with temp password
   - `getMyStaff(landlordId)` → find all users where `landlordId` matches
   - `updateStaffPermissions(staffId, landlordId, { permissions })` → verify staff belongs to landlord, update permissions array
   - `updateStaffProperties(staffId, landlordId, { assignedPropertyIds })` → verify and update
   - `removeStaff(staffId, landlordId)` → soft-delete or deactivate staff member
3. Create `controllers/team.controller.ts` and `routes/team.routes.ts`:
   ```
   GET    /api/team           → getMyStaff (landlord only)
   POST   /api/team/invite    → inviteStaff (landlord only)
   PATCH  /api/team/:id/permissions → updateStaffPermissions (landlord only)
   PATCH  /api/team/:id/properties  → updateStaffProperties (landlord only)
   DELETE /api/team/:id       → removeStaff (landlord only)
   ```
4. Create `validators/team.validator.ts`
5. Mount team routes in `server.ts` with auth + role middleware

**Files to create:**
```
server/src/middleware/rbac.ts
server/src/services/team.service.ts
server/src/controllers/team.controller.ts
server/src/routes/team.routes.ts
server/src/validators/team.validator.ts
```

**✅ Verification (Postman):**
1. Login as landlord → `GET /api/team` → empty array (no staff yet)
2. `POST /api/team/invite` → creates staff user → returns staff object with permissions
3. Login as the new staff → access an endpoint with a permitted module → 200
4. Login as staff → access a NON-permitted endpoint → 403 "Module access denied"
5. Login as staff → try to access a property NOT in their assignedPropertyIds → 403 "Property access denied"
6. Login as tenant → try `GET /api/team` → 403 "Insufficient role"

---

#### 🔧 Paul — Dynamic Sidebar & Layout System

**🤖 AI Model: Claude Opus** ⚡ (complex conditional rendering: permission-filtered sidebar with collapsible states, role-aware layout switching)

**Tasks:**
1. Create `application/config/menuConfig.ts`:
   - Export `HUB_MENU_ITEMS` — array of `{ key, text, icon, path }` for all 15 modules
   - Export `ADMIN_MENU_ITEMS` — super admin sidebar items
   - Export `TENANT_MENU_ITEMS` — tenant sidebar items
   - Export `PERMISSION_PRESETS` — preset objects mapping preset name → permission key arrays
2. Create `application/hooks/usePermissions.ts`:
   - Returns `{ visibleMenuItems, hasPermission(key), allPermissions }`
   - Filters `HUB_MENU_ITEMS` based on `user.permissions` (from AuthContext)
   - For `landlord` role: returns ALL menu items
   - For `staff` role: returns only items where `key` is in `user.permissions`
3. Create `presentation/layouts/HubLayout.tsx`:
   - Replaces the old `LandlordLayout.tsx`
   - Uses `usePermissions()` hook to get `visibleMenuItems`
   - Renders sidebar with only the permitted items
   - Keep the same visual design (collapsible drawer, dark/light mode, avatar in footer)
   - Display `user.positionName` under the user's name in the sidebar footer (for staff)
   - Title changes: "Landlord Hub" for landlords, position name for staff (e.g., "Caretaker Panel")
4. Create `presentation/layouts/TenantLayout.tsx`:
   - Simpler sidebar for tenants
   - Uses `TENANT_MENU_ITEMS` from menuConfig
   - Same visual style as HubLayout but with tenant-specific branding
5. Delete old `LandlordLayout.tsx`

**Files to create/modify:**
```
client/src/application/config/menuConfig.ts (new)
client/src/application/hooks/usePermissions.ts (new)
client/src/presentation/layouts/HubLayout.tsx (new)
client/src/presentation/layouts/TenantLayout.tsx (new)
client/src/presentation/layouts/LandlordLayout.tsx (delete)
```

**✅ Verification:**
- Login as landlord → sidebar shows ALL 15 items ✅
- Login as staff with permissions `['dashboard', 'units', 'bookings']` → sidebar shows only Overview, Units & Rooms, Bookings & Visits ✅
- Login as staff → manually type a URL for a non-permitted module (e.g., `/hub/financials`) → redirected or shown "Unauthorized" ✅
- Collapse sidebar → tooltips appear for icons ✅
- Mobile view → hamburger menu works ✅
- Dark mode toggle → sidebar themes correctly ✅

---

#### 🔧 Emanuel — Team Management UI & Common Pages

**🤖 AI Model: Gemini** (standard form/table UI)

**Tasks:**
1. Create `presentation/pages/hub/team/TeamManagement.tsx`:
   - **Staff List Table**: columns = Avatar, Name, Position, Email, Permissions (badge count), Properties Assigned, Status, Actions
   - **Invite Staff Dialog**: form with name, email, position name (free text), temp password (auto-generated), permission preset dropdown + manual toggles, property assignment multi-select
   - **Edit Permissions Dialog**: permission toggle matrix — list all 15 modules with on/off switches, preset dropdown to quick-apply
   - **Edit Properties Dialog**: checkboxes of landlord's properties to assign
   - **Remove Staff**: confirm dialog → deactivate
2. Create `presentation/components/PermissionMatrix.tsx`:
   - Reusable grid of permission toggles
   - Shows all 15 module keys as labeled switches
   - Preset dropdown at top
   - Emits `onChange(permissions: string[])`
3. Create common pages:
   - `presentation/pages/common/Unauthorized.tsx` — 403 page with "You don't have access" message + "Go Back" button
   - `presentation/pages/common/NotFound.tsx` — 404 page with illustration + "Go Home" button
4. Create `infrastructure/services/TeamService.ts` — wraps API calls for team management

**Files to create:**
```
client/src/presentation/pages/hub/team/TeamManagement.tsx
client/src/presentation/components/PermissionMatrix.tsx
client/src/presentation/pages/common/Unauthorized.tsx
client/src/presentation/pages/common/NotFound.tsx
client/src/infrastructure/services/TeamService.ts
```

**✅ Verification:**
- Login as landlord → navigate to Team Management → see empty state "No staff members yet"
- Click "Invite Staff" → fill form → submit → new staff appears in table
- Click the permission icon on a staff member → permission matrix opens → toggle switches → save → DB updated
- Login as the new staff → sidebar matches the permissions you toggled ✅
- Visit `/hub/nonexistent` → 404 page appears ✅
- Staff visits a non-permitted route → 403 page appears ✅

---

### Day 4 — Routing, Profile & Dashboard Shells

---

#### 👑 Rey — User Profile API & App Router

**🤖 AI Model: Gemini** (standard CRUD)

**Tasks:**
1. Create `routes/user.routes.ts`:
   ```
   GET    /api/users/me            → get own profile
   PATCH  /api/users/me            → update profile (name, phone, avatar)
   PATCH  /api/users/me/password   → change password (requires current password)
   POST   /api/users/me/avatar     → upload avatar (Multer + Cloudinary)
   ```
2. Create `controllers/user.controller.ts` and `services/user.service.ts`
3. Create `middleware/upload.ts`:
   - Multer memory storage → Cloudinary upload
   - Returns the Cloudinary URL
   - File type validation (images only)
   - Max size: 5MB
4. Create `validators/user.validator.ts`
5. Mount user routes in `server.ts`
6. Update `server.ts` to mount ALL existing routes:
   ```
   app.use('/api/auth', authRoutes);
   app.use('/api/users', authMiddleware, userRoutes);
   app.use('/api/team', authMiddleware, requireRole('landlord'), teamRoutes);
   ```

**Files to create:**
```
server/src/routes/user.routes.ts
server/src/controllers/user.controller.ts
server/src/services/user.service.ts
server/src/middleware/upload.ts
server/src/validators/user.validator.ts
```

**✅ Verification:**
1. Login → `GET /api/users/me` → returns user profile ✅
2. `PATCH /api/users/me` with `{ name: "New Name" }` → profile updated ✅
3. `POST /api/users/me/avatar` with multipart form data (image file) → Cloudinary URL returned ✅
4. `PATCH /api/users/me/password` with wrong current password → 400 error ✅
5. `PATCH /api/users/me/password` with correct current password → password changed, can login with new password ✅

---

#### 🔧 Paul — Complete Routing & Layout Polish

**🤖 AI Model: Gemini** (routing config, standard React)

**Tasks:**
1. Update `App.tsx` with complete routing structure:
   ```tsx
   {/* Public */}
   /                      → redirect to /listings
   /listings              → ListingsPage
   /listings/:id          → PropertyDetailPage
   /listings/unit/:id     → UnitDetailPage
   
   {/* Auth */}
   /login                 → Login
   /register              → Register
   /forgot-password       → ForgotPassword
   /reset-password/:token → ResetPassword
   
   {/* Super Admin — ProtectedRoute role=['super_admin'] */}
   /admin                 → AdminLayout
     /admin               → Overview
     /admin/users         → Users
     /admin/properties    → Properties
     /admin/financials    → Placeholder
     /admin/reports       → Placeholder
     /admin/moderation    → Placeholder
     /admin/communications → Placeholder
     /admin/system        → Placeholder
     /admin/security      → Placeholder
   
   {/* Property Hub — ProtectedRoute role=['landlord', 'staff'] */}
   /hub                   → HubLayout
     /hub                 → Overview
     /hub/properties      → Placeholder
     /hub/units           → Placeholder
     /hub/tenants         → Placeholder
     /hub/bookings        → Placeholder
     /hub/billing         → Placeholder
     /hub/contracts       → Placeholder
     /hub/utilities       → Placeholder
     /hub/financials      → Placeholder
     /hub/inventory       → Placeholder
     /hub/maintenance     → Placeholder
     /hub/documents       → Placeholder
     /hub/reports         → Placeholder
     /hub/security        → Placeholder
     /hub/team            → TeamManagement
   
   {/* Tenant — ProtectedRoute role=['tenant'] */}
   /tenant                → TenantLayout
     /tenant              → Dashboard
     /tenant/my-room      → Placeholder
     /tenant/bills        → Placeholder
     /tenant/contract     → Placeholder
     /tenant/inventory    → Placeholder
     /tenant/maintenance  → Placeholder
     /tenant/notifications → Placeholder
     /tenant/profile      → Placeholder
   
   {/* Fallbacks */}
   /unauthorized          → Unauthorized
   *                      → NotFound
   ```
2. Create `presentation/pages/hub/Placeholders.tsx` — generic placeholder page component that shows "Feature Name — Coming Soon" with the PageHeader component
3. Update `ProtectedRoute.tsx`:
   - Add permission-based guarding (check if current route's module key is in user's permissions)
   - Import `HUB_MENU_ITEMS` to map path → permission key
4. Update `AdminLayout.tsx` sidebar to use `ADMIN_MENU_ITEMS` from menuConfig

**Files to modify:**
```
client/src/App.tsx (overwrite)
client/src/presentation/components/ProtectedRoute.tsx (modify)
client/src/presentation/pages/hub/Placeholders.tsx (new — replaces the old one)
client/src/presentation/layouts/AdminLayout.tsx (modify)
```

**✅ Verification:**
- Login as super_admin → redirected to `/admin` → sees admin sidebar ✅
- Login as landlord → redirected to `/hub` → sees full hub sidebar ✅
- Login as staff → redirected to `/hub` → sees filtered sidebar ✅
- Login as tenant → redirected to `/tenant` → sees tenant sidebar ✅
- Click each sidebar item → correct placeholder page loads with feature name ✅
- Unauthenticated → try `/hub` → redirected to `/login` ✅
- Staff → manually navigate to `/hub/financials` (not permitted) → 403 page ✅

---

#### 🔧 Emanuel — Overview Dashboards & Notification Component

**🤖 AI Model: Gemini** (UI layout, card components)

**Tasks:**
1. Create `presentation/pages/hub/overview/Overview.tsx`:
   - Welcome banner with user name + current date
   - Stat cards row: Total Properties, Total Units, Occupied Units, Vacancy Rate
   - Recent Activity list (placeholder data for now)
   - Quick Actions row (buttons): Add Property, View Bookings, Generate Bill
   - Cards should be conditionally visible based on permissions (use `usePermissions()` hook)
2. Create `presentation/pages/tenant/Dashboard.tsx`:
   - Welcome banner
   - "My Room" summary card (unit name, property, monthly rent)
   - "Current Bill" card (amount due, due date, status badge)
   - "My Contract" card (start date, end date, lock-in status)
   - "Quick Actions": Pay Bill, Submit Maintenance Request, View Contract
   - All placeholder data for now
3. Create `presentation/components/StatCard.tsx` — reusable metric card (icon, label, value, trend indicator)
4. Create `application/context/NotificationContext.tsx`:
   - State: `notifications[]`, `unreadCount`
   - For now: mock notifications array
   - Later: will connect to WebSocket/API
5. Create `presentation/components/NotificationBell.tsx`:
   - Bell icon with unread badge count
   - Clicking opens a dropdown with notification list
   - Mark as read functionality
   - Add to the AppBar in both HubLayout and TenantLayout

**Files to create:**
```
client/src/presentation/pages/hub/overview/Overview.tsx
client/src/presentation/pages/tenant/Dashboard.tsx
client/src/presentation/components/StatCard.tsx
client/src/application/context/NotificationContext.tsx
client/src/presentation/components/NotificationBell.tsx
```

**✅ Verification:**
- Login as landlord → `/hub` → shows Overview with stat cards, welcome message, quick actions ✅
- Login as staff with only `dashboard` permission → Overview still shows but hides irrelevant quick actions ✅
- Login as tenant → `/tenant` → shows tenant dashboard with room/bill/contract cards ✅ 
- Notification bell appears in top bar → click → dropdown opens with sample notifications ✅

---

### Day 5 — Foundation Integration Testing & Polish

---

#### 👑 Rey — Backend Integration Testing & API Docs

**🤖 AI Model: Gemini** (testing and documentation)

**Tasks:**
1. Test complete auth flow end-to-end:
   - Register landlord → login → get profile → update avatar → change password → login with new password → logout → refresh fails → login again
2. Test RBAC flow:
   - Landlord invites staff with limited permissions → login as staff → access permitted route (200) → access non-permitted route (403) → access non-assigned property (403)
3. Test edge cases:
   - Expired access token → refresh → new token works
   - Expired refresh token → returns 401 → requires re-login
   - Register with duplicate email → proper error message
   - Invalid JWT → proper 401 response
4. Fix any bugs found
5. Create `server/API_REFERENCE.md` — document all existing endpoints with method, path, body, response

**Files to create:**
```
server/API_REFERENCE.md
```

**✅ Verification:**
- All Postman tests pass ✅
- API Reference document covers all endpoints ✅
- No 500 errors in any scenario ✅

---

#### 🔧 Paul — Frontend Auth Flow Polish

**🤖 AI Model: Gemini** (UI polish)

**Tasks:**
1. Test complete frontend auth flow:
   - Register → login → dashboard → logout → login again
   - Test with each role type
2. Polish Login page:
   - Add "Remember Me" checkbox (persist refresh token longer)
   - Add password visibility toggle
   - Add animated logo/branding
3. Polish Register page with matching design
4. Add profile page shell `presentation/pages/common/Profile.tsx`:
   - Shows user info (name, email, phone, avatar)
   - Edit fields in-place
   - Avatar upload with preview
   - Change password section
5. Add route for profile in App.tsx (accessible from all dashboard scopes: `/hub/profile`, `/tenant/profile`, `/admin/profile`)
6. Ensure dark/light mode works perfectly across all layouts

**Files to create/modify:**
```
client/src/presentation/pages/auth/Login.tsx (polish)
client/src/presentation/pages/auth/Register.tsx (polish)
client/src/presentation/pages/common/Profile.tsx (new)
client/src/App.tsx (add profile routes)
```

**✅ Verification:**
- Dark mode toggle → all pages look correct in both modes ✅
- Profile page → shows correct user data → edit name → refresh → name persisted ✅
- Avatar upload → image appears in sidebar and profile ✅

---

#### 🔧 Emanuel — Seed Data Verification & Component Library

**🤖 AI Model: Gemini** (data and UI)

**Tasks:**
1. Update seed script with final test data:
   - Ensure all role types are represented
   - Staff members have varied permission sets
   - Add realistic Filipino names and property data
2. Test team management E2E:
   - Login as landlord → invite staff → check staff received email → login as staff → verify sidebar
   - Change staff permissions → refresh staff's page → sidebar updates
   - Remove staff → staff can no longer login
3. Create additional shared components:
   - `presentation/components/DataTable.tsx` — reusable sortable/filterable table using MUI DataGrid or custom MUI Table:
     - Configurable columns, sortable headers
     - Search/filter bar
     - Pagination
     - Row actions (edit, delete)
     - Loading skeleton state
     - Empty state
   - `presentation/components/FormDialog.tsx` — reusable dialog wrapper for forms (title, body slot, cancel/save buttons)
4. Fix any bugs found during testing

**Files to create/modify:**
```
server/src/seeds/seed.ts (update)
client/src/presentation/components/DataTable.tsx (new)
client/src/presentation/components/FormDialog.tsx (new)
```

**✅ Verification:**
- Run seed script → all users created with correct roles/permissions ✅
- DataTable component renders with sample data, sorting works, pagination works ✅
- FormDialog opens/closes cleanly ✅

---

## Phase 2: Core CRUD & Operations (Days 6–12)

> [!NOTE]
> From this point, each developer works on their own feature vertical (backend + frontend). No file conflicts. All routes use the auth + RBAC middleware from Phase 1.

### Day 6 — Properties, Bookings Backend & Tenants Backend

---

#### 👑 Rey — Property Backend (Full CRUD)

**🤖 AI Model: Gemini** (standard CRUD)

> [!NOTE]
> Rey temporarily takes Properties to to get it ready for Paul to build the frontend on Day 7. Rey's primary domain (billing/contracts) starts in Phase 3.

**Tasks:**
1. Enhance `models/Property.ts`:
   - Add missing fields: `inclusions`, `reviewCenters`, `schools`, `commercialEstablishments` (venue arrays), `metrics` (computed or stored)
   - Add landlordId reference
   - Add proper indexes
2. Create `routes/property.routes.ts`:
   ```
   GET    /api/properties              → list (landlord: own, staff: assigned, admin: all)
   GET    /api/properties/:id          → detail
   POST   /api/properties              → create (landlord only)
   PATCH  /api/properties/:id          → update (landlord + staff with 'properties' permission)
   DELETE /api/properties/:id          → soft-delete (landlord only)
   POST   /api/properties/:id/images   → upload images (Multer + Cloudinary)
   PATCH  /api/properties/:id/status   → change status
   ```
3. Create `controllers/property.controller.ts` and `services/property.service.ts`
4. Create `validators/property.validator.ts`
5. Auto-scope queries: landlord sees only own, staff sees only assigned, admin sees all

**Files to create:**
```
server/src/models/Property.ts (overwrite)
server/src/routes/property.routes.ts
server/src/controllers/property.controller.ts
server/src/services/property.service.ts
server/src/validators/property.validator.ts
```

**✅ Verification:**
1. Login as landlord → `POST /api/properties` → property created ✅
2. `GET /api/properties` → returns only landlord's properties ✅
3. Login as staff (assigned to property) → `GET /api/properties` → only assigned properties ✅
4. Login as staff (NOT assigned) → property not in results ✅
5. `POST /api/properties/:id/images` with image → Cloudinary URL added ✅

---

#### 🔧 Paul — Unit Backend (Full CRUD)

**🤖 AI Model: Gemini** (standard CRUD)

**Tasks:**
1. Enhance `models/Unit.ts`:
   - Add pricing fields: `roomRent`, `bedspaceRent`, `perHeadRate`, `deposit`
   - Add occupancy fields: `currentTenantIds` (array for bedspace), `maxOccupants`
   - Add `accommodationType: 'room' | 'bedspace' | 'both'`
   - Add `status: 'Vacant' | 'Occupied' | 'Reserved' | 'Maintenance'`
2. Create `routes/unit.routes.ts`:
   ```
   GET    /api/units                    → list (filterable by propertyId)
   GET    /api/units/:id                → detail
   POST   /api/units                    → create (requires propertyId)
   PATCH  /api/units/:id                → update
   DELETE /api/units/:id                → soft-delete
   PATCH  /api/units/:id/status         → change status
   POST   /api/units/:id/images         → upload images
   GET    /api/properties/:id/units     → units for a specific property
   ```
3. Create `controllers/unit.controller.ts` and `services/unit.service.ts`
4. Create `validators/unit.validator.ts`
5. Property access scoping (via the property's landlordId)

**Files to create:**
```
server/src/models/Unit.ts (overwrite)
server/src/routes/unit.routes.ts
server/src/controllers/unit.controller.ts
server/src/services/unit.service.ts
server/src/validators/unit.validator.ts
```

**✅ Verification:**
1. `POST /api/units` with `{ propertyId, unitIdentifier: "Room A", roomRent: 5000 }` → created ✅
2. `GET /api/properties/:id/units` → returns units for that property ✅
3. Update unit status to "Occupied" → reflected in GET ✅

---

#### 🔧 Emanuel — Booking & Tenant Model Backend

**🤖 AI Model: Gemini** (standard model setup)

**Tasks:**
1. Create `models/Booking.ts`:
   ```
   type: 'visit' | 'reservation'
   propertyId, unitId, fullName, contactNumber, email,
   numberOfVisitors, visitDate, visitTime,
   purpose: 'viewing' | 'inspection' | 'maintenance' | 'guest_visit',
   status: 'pending' | 'confirmed' | 'waiting_list' | 'cancelled' | 'refunded' | 'done' | 'closed_deal',
   assignedCaretakerId, depositPaid, depositAmount,
   checkInStatus: 'not_arrived' | 'tenant_arrived' | 'check_in_completed',
   checkInDate, checkOutDate, comments[]
   ```
2. Create `models/Notification.ts`:
   ```
   userId, title, message, type: 'info' | 'warning' | 'success' | 'error',
   category: 'visit' | 'booking' | 'billing' | 'contract' | 'maintenance' | 'system',
   isRead, readAt, link (optional URL to navigate to), createdAt
   ```
3. Create `routes/booking.routes.ts`:
   ```
   GET    /api/bookings                 → list (filterable by type, status, propertyId, date range)
   GET    /api/bookings/:id             → detail
   POST   /api/bookings                 → create visit/reservation
   PATCH  /api/bookings/:id             → update
   PATCH  /api/bookings/:id/status      → change status
   PATCH  /api/bookings/:id/assign      → assign caretaker
   PATCH  /api/bookings/:id/checkin     → update check-in status
   POST   /api/bookings/:id/comments    → add comment
   DELETE /api/bookings/:id             → cancel
   ```
4. Create `controllers/booking.controller.ts` and `services/booking.service.ts`
5. Create `validators/booking.validator.ts`
6. Create `routes/notification.routes.ts`:
   ```
   GET    /api/notifications            → list for current user
   PATCH  /api/notifications/:id/read   → mark as read
   PATCH  /api/notifications/read-all   → mark all as read
   GET    /api/notifications/unread-count → count
   ```

**Files to create:**
```
server/src/models/Booking.ts
server/src/models/Notification.ts
server/src/routes/booking.routes.ts
server/src/controllers/booking.controller.ts
server/src/services/booking.service.ts
server/src/validators/booking.validator.ts
server/src/routes/notification.routes.ts
server/src/controllers/notification.controller.ts
server/src/services/notification.service.ts
```

**✅ Verification:**
1. `POST /api/bookings` with type "visit" → booking created ✅
2. `PATCH /api/bookings/:id/status` to "confirmed" → status updated ✅
3. `PATCH /api/bookings/:id/assign` with caretakerId → assigned ✅
4. `GET /api/notifications` → returns notifications for logged-in user ✅

---

### Day 7 — Property & Unit Frontend, Booking Frontend Starts

---

#### 👑 Rey — Property Frontend (Hub Pages)

**🤖 AI Model: Gemini** (standard UI pages)

**Tasks:**
1. Create `infrastructure/services/PropertyService.ts` — real API calls (replaces MockPropertyService)
2. Create `application/hooks/useProperties.ts` — overwrite existing mock hook
3. Create `presentation/pages/hub/properties/PropertyList.tsx`:
   - DataTable with columns: Image (thumbnail), Name, Type, Location, Units, Status, Actions
   - Filter bar: property type dropdown, status dropdown, search
   - "Add Property" button (landlord only, not for staff)
   - Click row → navigate to property detail
4. Create `presentation/pages/hub/properties/PropertyForm.tsx`:
   - Multi-step form dialog or full page:
     - Step 1: Basic info (name, description, property type)
     - Step 2: Address (street, city, province, zip)
     - Step 3: Inclusions (multi-select chips)
     - Step 4: Nearby venues (review centers, schools, commercial)
     - Step 5: Images upload (drag & drop, preview gallery)
   - Used for both Create and Edit
5. Create `presentation/pages/hub/properties/PropertyDetail.tsx`:
   - Header with property name, status badge, actions (edit, change status)
   - Tabbed view: Overview | Units | Documents | Analytics
   - Overview tab: description, address, inclusions, nearby venues, image gallery
   - Units tab: embedded unit list filtered to this property

**Files to create:**
```
client/src/infrastructure/services/PropertyService.ts (new, replaces mock)
client/src/application/hooks/useProperties.ts (overwrite)
client/src/presentation/pages/hub/properties/PropertyList.tsx
client/src/presentation/pages/hub/properties/PropertyForm.tsx
client/src/presentation/pages/hub/properties/PropertyDetail.tsx
```

**✅ Verification:**
- Navigate to `/hub/properties` → see list of properties from DB ✅
- Click "Add Property" → form opens → fill all steps → submit → property appears in list ✅
- Click a property → detail page loads with correct data ✅
- Upload images → thumbnails appear in gallery ✅
- Edit property → changes saved ✅

---

#### 🔧 Paul — Unit Frontend (Hub Pages)

**🤖 AI Model: Gemini** (standard UI pages)

**Tasks:**
1. Create `infrastructure/services/UnitService.ts` — real API calls (replaces MockUnitService)
2. Create `application/hooks/useUnits.ts` — overwrite or create
3. Create `presentation/pages/hub/units/UnitList.tsx`:
   - DataTable with columns: Identifier, Property, Type, Rent, Status, Occupants, Actions
   - Filter bar: property dropdown, status dropdown, accommodation type, search
   - "Add Unit" button
   - Color-coded status (green=Vacant, red=Occupied, yellow=Reserved, gray=Maintenance)
4. Create `presentation/pages/hub/units/UnitForm.tsx`:
   - Property selector dropdown (from user's properties)
   - Unit identifier (e.g., "Room A", "Bed 3")
   - Accommodation type: Room for Rent / Bedspace / Both
   - Pricing: room rent, bedspace rent, per head rate (conditional based on type)
   - Capacity, size, features (multi-select chips)
   - Image upload
5. Create `presentation/pages/hub/units/UnitDetail.tsx`:
   - Header with unit name, property name, status badge
   - Tabs: Overview | Tenant | Billing History | Inventory
   - Overview: photos, features, pricing info, capacity
   - Tenant tab: current tenant info (if occupied) — placeholder for now

**Files to create:**
```
client/src/infrastructure/services/UnitService.ts (new)
client/src/application/hooks/useUnits.ts (new)
client/src/presentation/pages/hub/units/UnitList.tsx
client/src/presentation/pages/hub/units/UnitForm.tsx
client/src/presentation/pages/hub/units/UnitDetail.tsx
```

**✅ Verification:**
- Navigate to `/hub/units` → see all units from DB ✅
- Filter by property → only that property's units shown ✅
- Add new unit with bedspace pricing → appears in list ✅
- Click a unit → detail page shows correct pricing and features ✅
- Change status → badge color updates ✅

---

#### 🔧 Emanuel — Booking Frontend Start (Visit Scheduling)

**🤖 AI Model: Gemini** (form and table UI)

**Tasks:**
1. Create `infrastructure/services/BookingService.ts` — real API calls
2. Create `application/hooks/useBookings.ts`
3. Create `presentation/pages/hub/bookings/BookingList.tsx`:
   - Tabs at top: "Visits" | "Reservations" | "All"
   - DataTable with columns: Date, Time, Visitor Name, Contact, Room/Unit, Purpose, Status, Assigned To, Actions
   - Filter bar: date range, status, property, purpose
   - "Schedule Visit" button
   - Status color coding
4. Create `presentation/pages/hub/bookings/VisitSchedulingForm.tsx`:
   - Form fields matching the client spec:
     - Full Name, Contact Number, Room to Visit/Offer (dropdown of units)
     - Visit Date (date picker), Visit Time (time picker)
     - Number of Visitors
     - Purpose of Visit (dropdown: Viewing, Inspection, Maintenance, Guest Visit)
   - Auto-assigns status = "Pending" on creation
5. Create `infrastructure/services/NotificationService.ts` — API calls
6. Connect NotificationContext to real API instead of mock data

**Files to create:**
```
client/src/infrastructure/services/BookingService.ts
client/src/application/hooks/useBookings.ts
client/src/presentation/pages/hub/bookings/BookingList.tsx
client/src/presentation/pages/hub/bookings/VisitSchedulingForm.tsx
client/src/infrastructure/services/NotificationService.ts
```

**✅ Verification:**
- Navigate to `/hub/bookings` → see booking list (or empty state) ✅
- Click "Schedule Visit" → form opens → fill out → submit → booking appears with "Pending" status ✅
- Change status to "Confirmed" → status badge updates ✅
- Filter by "Visits" tab → only visit bookings shown ✅
- Notification bell shows updates when checking real API ✅

---

### Day 8 — Tenant Management, Booking Calendar & Reservation

---

#### 👑 Rey — Tenant Backend & Management

**🤖 AI Model: Gemini** (standard CRUD)

**Tasks:**
1. Create tenant-specific routes in `routes/tenant.routes.ts`:
   ```
   GET    /api/tenants                  → list tenants (for landlord/staff with 'tenants' permission)
   GET    /api/tenants/:id              → tenant detail (profile + unit + contract + bills summary)
   POST   /api/tenants                  → onboard tenant (create tenant user and assign to unit)
   PATCH  /api/tenants/:id              → update tenant info
   GET    /api/tenants/me               → current tenant's own view
   ```
2. Create `controllers/tenant.controller.ts` and `services/tenant.service.ts`:
   - `onboardTenant(data)` → create User with `tenant` role, assign `currentUnitId`, set unit status to "Occupied", send welcome email with credentials
   - `getTenantSummary(id)` → return tenant + their unit + active contract + outstanding bills (aggregated view)
3. Create `validators/tenant.validator.ts`
4. Property-scope tenant queries: only show tenants from landlord's properties

**Files to create:**
```
server/src/routes/tenant.routes.ts
server/src/controllers/tenant.controller.ts
server/src/services/tenant.service.ts
server/src/validators/tenant.validator.ts
```

**✅ Verification:**
1. `POST /api/tenants` with tenant details + unitId → tenant user created, unit status → "Occupied" ✅
2. `GET /api/tenants` → list of tenants in landlord's properties ✅
3. Login as tenant → `GET /api/tenants/me` → returns profile + unit info ✅

---

#### 🔧 Paul — Tenant Frontend (Hub Pages)

**🤖 AI Model: Gemini** (standard UI)

**Tasks:**
1. Create `infrastructure/services/TenantService.ts` — API calls
2. Create `application/hooks/useTenants.ts`
3. Create `presentation/pages/hub/tenants/TenantList.tsx`:
   - DataTable: Avatar, Name, Email, Phone, Unit, Property, Contract Status, Actions
   - Filter: property dropdown, contract status, search
   - "Onboard Tenant" button
4. Create `presentation/pages/hub/tenants/TenantOnboardForm.tsx`:
   - Select Property → Select Unit (only vacant units)
   - Tenant details: name, email, phone, emergency contact
   - Auto-generates temporary password
   - Monthly rent pre-filled from unit
5. Create `presentation/pages/hub/tenants/TenantDetail.tsx`:
   - Profile card with avatar, contact info
   - Tabs: Overview | Contract | Bills | Inventory | Comments
   - Overview: current unit, check-in date, lease period
   - Comments tab: post check-in comment system (caretaker/admin comments)

**Files to create:**
```
client/src/infrastructure/services/TenantService.ts
client/src/application/hooks/useTenants.ts
client/src/presentation/pages/hub/tenants/TenantList.tsx
client/src/presentation/pages/hub/tenants/TenantOnboardForm.tsx
client/src/presentation/pages/hub/tenants/TenantDetail.tsx
```

**✅ Verification:**
- `/hub/tenants` → list of tenants ✅
- "Onboard Tenant" → select unit → fill form → submit → tenant appears and unit becomes "Occupied" ✅
- Click tenant → detail page with profile + tabs ✅

---

#### 🔧 Emanuel — Booking Calendar, Reservation & Room Viewing

**🤖 AI Model: Gemini** (calendar UI, form logic)

**Tasks:**
1. Create `presentation/pages/hub/bookings/BookingCalendar.tsx`:
   - Month/week/day calendar view (use a library like `@fullcalendar/react` or build custom with MUI)
   - Color-coded events by type (visit=blue, reservation=green, check-in=gold)
   - Click event → view details popup
   - Click empty slot → create new booking
   - Show available time slots per unit
2. Create `presentation/pages/hub/bookings/ReservationForm.tsx`:
   - Based on visit scheduling form but for reservations:
     - All visit form fields PLUS:
     - Deposit amount, deposit paid? (checkbox)
     - Status starts as "Pending"
   - Note displayed: "No DP No Reservation"
3. Add to BookingList:
   - Assign caretaker button (opens dropdown of staff members)
   - Status change dropdown (Pending → Confirmed → Done → Closed Deal)
   - Auto-block double booking: when creating a booking, backend checks for time conflicts on same unit
4. Create logic in `services/booking.service.ts` (backend) — `checkTimeConflict(unitId, date, time)`:
   - Before creating a booking, check if another non-cancelled booking exists for same unit/date/time
   - Return 409 if conflict

**Files to create/modify:**
```
client/src/presentation/pages/hub/bookings/BookingCalendar.tsx
client/src/presentation/pages/hub/bookings/ReservationForm.tsx
client/src/presentation/pages/hub/bookings/BookingList.tsx (modify — add assign, status features)
server/src/services/booking.service.ts (modify — add double-booking check)
```

**✅ Verification:**
- Navigate to bookings → switch to Calendar view → see bookings plotted on calendar ✅
- Create a reservation → select a date/time → auto-checks conflicts → if conflict → error ✅
- Assign caretaker to a visit → assignment saved ✅
- "No DP No Reservation" note visible on reservation form ✅
- Click calendar event → detail popup with booking info ✅

---

### Day 9 — Check-in/Checkout Module & Documents Backend

---

#### 👑 Rey — Check-in Confirmation & Pre-Checkout Backend

**🤖 AI Model: Claude Opus** ⚡ (complex state machine: multi-step check-in triggers cascading updates across collections)

**Tasks:**
1. Create `services/checkin.service.ts`:
   - `confirmArrival(bookingId)` → update booking `checkInStatus` to `tenant_arrived`
   - `completeCheckIn(bookingId, { tenantUserId, unitId, contractData })` → complex multi-step:
     1. Update booking status to `check_in_completed`
     2. Update unit status to "Occupied", set `currentTenantIds`
     3. Create Contract record (auto-generate from template)
     4. Create first Bill record (if billing starts immediately)
     5. Create Notification for landlord: "Tenant {name} checked in to {unit}"
     6. Return summary of all created records
   - `initiateCheckout(tenantId, unitId)` → marks contract as ending, creates checkout notification chain
2. Create pre-checkout reminder logic in `services/reminder.service.ts`:
   - `scheduleCheckoutReminders(contractId)` → based on contract.endDate:
     - 7 days before: create notification for admin, caretaker, landlord, tenant
     - 3 days before: create notification
     - 1 day before: create notification
   - This will be triggered by a cron job (set up the function, actual cron in Phase 5)
3. Add check-in routes to `routes/booking.routes.ts`:
   ```
   PATCH /api/bookings/:id/arrive       → confirmArrival
   POST  /api/bookings/:id/complete-checkin → completeCheckIn (body: tenantUserId, contractData)
   POST  /api/bookings/:id/checkout     → initiateCheckout
   ```

**Files to create:**
```
server/src/services/checkin.service.ts
server/src/services/reminder.service.ts
```

**✅ Verification:**
1. Create a booking → change to "confirmed" → call `/arrive` → `checkInStatus` = "tenant_arrived" ✅
2. Call `/complete-checkin` with tenant data → unit becomes "Occupied" + contract created + bill created → verify all in Compass ✅
3. Call `/checkout` → contract marked as ending → checkout notifications created ✅

---

#### 🔧 Paul — Document Management Backend & Frontend

**🤖 AI Model: Gemini** (standard CRUD with file upload)

**Tasks:**
1. Create `models/Document.ts`:
   ```
   propertyId, unitId?, tenantId?, landlordId,
   documentType: 'lease_agreement' | 'id_document' | 'contract' | 'receipt' | 'incident_report' | 'inventory_form' | 'other',
   title, description?, fileUrl (Cloudinary), fileType, fileSize,
   uploadedById, createdAt
   ```
2. Create `routes/document.routes.ts`:
   ```
   GET    /api/documents             → list (filterable by type, property, tenant)
   GET    /api/documents/:id         → detail
   POST   /api/documents/upload      → upload (Multer + Cloudinary — PDF, images, docs)
   DELETE /api/documents/:id         → delete
   ```
3. Create `controllers/document.controller.ts` and `services/document.service.ts`
4. Create `presentation/pages/hub/documents/DocumentList.tsx`:
   - DataTable: Type icon, Title, Property, Tenant (if linked), Date, Size, Actions (download, delete)
   - Filter: document type, property, date range
   - "Upload Document" button
5. Create `presentation/pages/hub/documents/DocumentUploadForm.tsx`:
   - Drag & drop file zone
   - Document type dropdown
   - Link to property (optional) and tenant (optional)
   - Title and description
   - Supports: PDF, DOCX, JPG, PNG (up to 10MB)
6. Create `infrastructure/services/DocumentService.ts` — API calls

**Files to create:**
```
server/src/models/Document.ts
server/src/routes/document.routes.ts
server/src/controllers/document.controller.ts
server/src/services/document.service.ts
server/src/validators/document.validator.ts
client/src/presentation/pages/hub/documents/DocumentList.tsx
client/src/presentation/pages/hub/documents/DocumentUploadForm.tsx
client/src/infrastructure/services/DocumentService.ts
```

**✅ Verification:**
- Navigate to `/hub/documents` → document list (or empty state) ✅
- Click "Upload" → drag a PDF → fill type/title → submit → appears in list with correct icon ✅
- Click download → file downloads ✅
- Filter by type "lease_agreement" → only lease docs shown ✅

---

#### 🔧 Emanuel — Check-in/Checkout Frontend & Visit Reminders

**🤖 AI Model: Gemini** (UI for check-in flow)

**Tasks:**
1. Create `presentation/pages/hub/bookings/CheckInFlow.tsx`:
   - Panel displayed when viewing a "confirmed" booking:
     - Button: "Tenant Arrived" → calls arrive API → updates status badge
     - Once arrived, shows "Complete Check-In" section:
       - Link/select existing tenant user OR create new tenant inline
       - Contract details auto-populated (start date, monthly rent from unit, lock-in period input)
       - Confirmation button → calls complete-checkin → shows success summary
   - Post check-in: shows comment section (caretaker/tenant/admin comments)
2. Create `presentation/pages/hub/bookings/CheckoutPanel.tsx`:
   - Shown on tenant detail or booking with check-in completed:
     - Contract end date display
     - Countdown to checkout
     - "Initiate Checkout" button
     - Reminder schedule display (7 days / 3 days / 1 day status)
3. Add automated visit reminder logic to backend `services/booking.service.ts`:
   - When a booking is created with status "confirmed":
     - Create notification for 1 day before visit date
     - Create notification for 2 hours before visit time
   - Notified: Admin, Caretaker (assigned), Landlord, Visitor (if has email)
4. Connect comment system: `POST /api/bookings/:id/comments` with text + role badge

**Files to create:**
```
client/src/presentation/pages/hub/bookings/CheckInFlow.tsx
client/src/presentation/pages/hub/bookings/CheckoutPanel.tsx
server/src/services/booking.service.ts (modify — add reminder creation)
```

**✅ Verification:**
- Open a confirmed booking → click "Tenant Arrived" → status updates to "arrived" ✅
- Click "Complete Check-In" → fill contract fields → submit → see "Check-in completed!" message ✅
- Verify in DB: unit became Occupied, contract created, first bill created ✅
- Post a comment as caretaker → comment appears with role badge ✅
- Open checkout panel → see countdown and reminder schedule ✅

---

### Day 10 — Contract System

---

#### 👑 Rey — Contract Backend & PDF Generation

**🤖 AI Model: Claude Opus** ⚡ (complex: PDF template generation, contract auto-creation logic with multiple variable substitutions)

**Tasks:**
1. Create `models/Contract.ts`:
   ```
   tenantId, unitId, propertyId, landlordId,
   startDate, endDate, lockInPeriod (months), monthlyRent,
   utilityIncludedInRent (boolean), rateType: 'fixed' | 'submetered',
   securityDeposit, advancePayment,
   tenantSignature? (base64 data URL), landlordSignature?,
   signedAt?, status: 'draft' | 'active' | 'expired' | 'terminated',
   autoRenewal (boolean), documentUrl? (generated PDF URL),
   terms? (string — custom terms text),
   createdAt, updatedAt
   ```
2. Create `routes/contract.routes.ts`:
   ```
   GET    /api/contracts                → list (filterable)
   GET    /api/contracts/:id            → detail
   POST   /api/contracts                → create draft
   PATCH  /api/contracts/:id            → update draft
   POST   /api/contracts/:id/sign       → add signature (tenant or landlord)
   POST   /api/contracts/:id/activate   → activate contract
   POST   /api/contracts/:id/generate-pdf → generate & store PDF
   PATCH  /api/contracts/:id/terminate  → early termination
   GET    /api/contracts/expiring       → contracts expiring within N days
   ```
3. Create `services/contract.service.ts`:
   - `createDraft(data)` → create Contract with status "draft"
   - `addSignature(contractId, signatureData, role)` → save base64 signature image
   - `activate(contractId)` → change status to "active", generate PDF, start billing cycle, create lock-in tracker entry
   - `generatePDF(contractId)` → use Puppeteer or html-pdf to render contract template → upload to Cloudinary → save URL
   - `checkExpiring(daysAhead)` → find contracts where endDate is within N days
4. Install `puppeteer` or `html-pdf` for PDF generation
5. Create contract HTML template `services/templates/contractTemplate.ts`:
   - Professional lease agreement template
   - Variables: landlord name, tenant name, property address, unit, rent, dates, lock-in, terms
   - Signature images embedded

**Files to create:**
```
server/src/models/Contract.ts
server/src/routes/contract.routes.ts
server/src/controllers/contract.controller.ts
server/src/services/contract.service.ts
server/src/services/templates/contractTemplate.ts
server/src/validators/contract.validator.ts
```

**✅ Verification:**
1. `POST /api/contracts` → draft created ✅
2. `POST /api/contracts/:id/sign` with base64 signature → saved ✅
3. `POST /api/contracts/:id/generate-pdf` → PDF generated → Cloudinary URL returned → download URL → PDF looks correct ✅
4. `POST /api/contracts/:id/activate` → status becomes "active" ✅
5. `GET /api/contracts/expiring?days=30` → returns contracts ending within 30 days ✅

---

#### 🔧 Paul — Contract Frontend (Hub Pages)

**🤖 AI Model: Gemini** (standard UI with canvas)

**Tasks:**
1. Create `infrastructure/services/ContractService.ts` — API calls
2. Create `application/hooks/useContracts.ts`
3. Create `presentation/pages/hub/contracts/ContractList.tsx`:
   - DataTable: Tenant, Unit, Property, Start Date, End Date, Lock-in, Status, Actions
   - Filter: status, property, expiring soon toggle
   - "Create Contract" button
   - Row click → detail view
4. Create `presentation/pages/hub/contracts/ContractForm.tsx`:
   - Tenant selector (dropdown of tenants from landlord's properties)
   - Unit selector (dropdown of units)
   - Start date, end date, lock-in period
   - Monthly rent (pre-filled from unit)
   - Utility included? toggle → if no, show rate type (fixed/submetered)
   - Security deposit, advance payment
   - Custom terms textarea
   - Auto-renewal toggle
5. Create `presentation/pages/hub/contracts/ContractDetail.tsx`:
   - Contract summary (all fields)
   - Signature section: canvas drawing pad for both landlord and tenant signatures
   - "Generate PDF" button → downloads/opens PDF
   - "Activate Contract" button (requires both signatures)
   - Lock-in period tracker (visual progress bar showing months elapsed/remaining)
6. Create `presentation/components/SignaturePad.tsx`:
   - HTML5 Canvas-based signature drawing
   - Stylus/finger support
   - Clear button
   - Outputs base64 PNG data URL

**Files to create:**
```
client/src/infrastructure/services/ContractService.ts
client/src/application/hooks/useContracts.ts
client/src/presentation/pages/hub/contracts/ContractList.tsx
client/src/presentation/pages/hub/contracts/ContractForm.tsx
client/src/presentation/pages/hub/contracts/ContractDetail.tsx
client/src/presentation/components/SignaturePad.tsx
```

**✅ Verification:**
- `/hub/contracts` → contract list ✅
- "Create Contract" → fill form → submit → appears as "Draft" ✅
- Open contract detail → draw signature on canvas → "Sign" → signature saved ✅
- Both signatures present → "Activate" button enabled → click → contract activated ✅
- "Generate PDF" → PDF downloads → looks professional with all details and signatures ✅

---

#### 🔧 Emanuel — Inventory Backend

**🤖 AI Model: Gemini** (standard model + CRUD)

**Tasks:**
1. Create `models/Inventory.ts`:
   ```
   propertyId, unitId?,
   itemName, serialNumber, condition: 'new' | 'good' | 'fair' | 'working' | 'damaged',
   quantity, status: 'available' | 'issued' | 'returned' | 'lost' | 'condemned',
   purchaseDate?, purchaseCost?,
   createdAt, updatedAt
   ```
2. Create `models/InventoryRecord.ts`:
   ```
   inventoryItemId, tenantId, unitId, propertyId,
   issuedByUserId (caretaker/admin who issued), issuedDate,
   returnDate?, returnCondition?,
   damageNotes?, penaltyAmount?, deductedFromDeposit?,
   signedFormUrl?,
   status: 'active' | 'returned' | 'damaged' | 'lost'
   ```
3. Create `routes/inventory.routes.ts`:
   ```
   GET    /api/inventory                → list items (filterable by property, status)
   GET    /api/inventory/:id            → item detail
   POST   /api/inventory                → add item to inventory
   PATCH  /api/inventory/:id            → update item
   POST   /api/inventory/:id/issue      → issue item to tenant (creates InventoryRecord)
   POST   /api/inventory/:id/return     → tenant returns item (update record, check condition)
   GET    /api/inventory/records        → all accountability records
   GET    /api/inventory/records/:tenantId → records for specific tenant
   POST   /api/inventory/records/:id/damage → report damage + compute penalty
   ```
4. Create `controllers/inventory.controller.ts` and `services/inventory.service.ts`
5. Create `validators/inventory.validator.ts`

**Files to create:**
```
server/src/models/Inventory.ts
server/src/models/InventoryRecord.ts
server/src/routes/inventory.routes.ts
server/src/controllers/inventory.controller.ts
server/src/services/inventory.service.ts
server/src/validators/inventory.validator.ts
```

**✅ Verification:**
1. `POST /api/inventory` with `{ itemName: "Bed Frame", serialNumber: "BF-001" }` → created ✅
2. `POST /api/inventory/:id/issue` with `{ tenantId, unitId }` → InventoryRecord created, item status → "issued" ✅
3. `POST /api/inventory/:id/return` → item status → "available", record status → "returned" ✅
4. `POST /api/inventory/records/:id/damage` → penalty computed, deduction flag set ✅

---

### Day 11 — Billing Backend & Inventory Frontend

---

#### 👑 Rey — Billing & Payment Backend

**🤖 AI Model: Claude Opus** ⚡ (complex business logic: auto-bill generation with conditional late fees, utility breakdown calculations, partial payments, combined billing)

**Tasks:**
1. Create `models/Bill.ts`:
   ```
   tenantId, unitId, propertyId, contractId,
   billType: 'rent' | 'utility' | 'combined',
   billingPeriod: { start: Date, end: Date },
   rentAmount, utilityAmount, lateFee, totalAmount, paidAmount, balanceAmount,
   status: 'unpaid' | 'partial' | 'paid' | 'overdue',
   dueDate,
   utilityBreakdown?: {
     electricity?: { previousReading, currentReading, rate, amount },
     water?: { previousReading, currentReading, rate, amount },
     internet?, others?: [{ name, amount }]
   },
   isAutoGenerated (boolean),
   receiptUrl?, notes?,
   createdAt, updatedAt
   ```
2. Create `models/Payment.ts`:
   ```
   billId, tenantId, amount, paymentDate,
   paymentMethod: 'cash' | 'gcash' | 'bank_transfer' | 'other',
   referenceNumber?, proofImageUrl?,
   recordedByUserId (admin/caretaker who recorded the payment),
   notes?, createdAt
   ```
3. Create `routes/billing.routes.ts`:
   ```
   GET    /api/bills                    → list (filterable by tenant, property, status, date)
   GET    /api/bills/:id                → detail with payments
   POST   /api/bills                    → create manual bill
   POST   /api/bills/auto-generate      → auto-generate monthly bills for all active contracts
   PATCH  /api/bills/:id                → update bill (e.g., add utility readings)
   POST   /api/bills/:id/record-payment → record a payment (body: amount, method, proof)
   GET    /api/bills/:id/receipt         → generate OR/acknowledgement receipt PDF
   ```
4. Create `services/billing.service.ts`:
   - `autoGenerateMonthlyBills()`: find all active contracts → create bill for current period → set due date → compute rent + utility amounts → if past due → add late fee
   - `recordPayment(billId, paymentData)`: create Payment record → update bill `paidAmount` → recalculate `balanceAmount` → if paidAmount >= totalAmount → status = "paid", else "partial"
   - `generateReceipt(billId)`: create receipt PDF (OR number, tenant name, amount, date, payment method) → upload to Cloudinary → return URL
   - `computeLateFee(bill)`: if current date > dueDate and status != "paid" → apply late fee percentage
5. Create receipt template `services/templates/receiptTemplate.ts`
6. Create `routes/payment.routes.ts`:
   ```
   GET /api/payments                      → all payments (filterable)
   GET /api/payments/tenant/:tenantId     → tenant's payment history
   ```

**Files to create:**
```
server/src/models/Bill.ts
server/src/models/Payment.ts
server/src/routes/billing.routes.ts
server/src/routes/payment.routes.ts
server/src/controllers/billing.controller.ts
server/src/controllers/payment.controller.ts
server/src/services/billing.service.ts
server/src/services/templates/receiptTemplate.ts
server/src/validators/billing.validator.ts
```

**✅ Verification:**
1. `POST /api/bills` with manual bill data → bill created with "unpaid" status ✅
2. `POST /api/bills/auto-generate` → bills created for all active contracts ✅
3. `POST /api/bills/:id/record-payment` with full amount → bill status becomes "paid" ✅
4. Record partial payment → status becomes "partial", balance updated ✅
5. `GET /api/bills/:id/receipt` → PDF receipt generated and downloadable ✅

---

#### 🔧 Paul — Utility Dashboard Backend

**🤖 AI Model: Gemini** (aggregation queries)

**Tasks:**
1. Create `routes/utility.routes.ts`:
   ```
   GET /api/utilities/consumption          → monthly consumption data (for graphs)
   GET /api/utilities/highest-usage        → rooms with highest utility usage
   GET /api/utilities/overconsumption      → units exceeding average consumption
   GET /api/utilities/expense-summary      → total utility expenses by period
   GET /api/utilities/annual              → annual utility report
   POST /api/utilities/readings           → submit meter readings for a unit
   ```
2. Create `controllers/utility.controller.ts` and `services/utility.service.ts`:
   - `getConsumptionData(propertyId, period)` — aggregate bill utility breakdowns by month → return data for charting
   - `getHighestUsage(propertyId, period)` — sort units by utility amount desc → return top consumers
   - `checkOverconsumption(propertyId)` — compare each unit's usage vs property average → flag if >150% of average
   - `getExpenseSummary(propertyId, period)` — sum utility amounts by type (electricity, water, etc.)
3. Utility readings are stored as part of Bill records (the `utilityBreakdown` object on each bill). No separate model needed.

**Files to create:**
```
server/src/routes/utility.routes.ts
server/src/controllers/utility.controller.ts
server/src/services/utility.service.ts
```

**✅ Verification:**
1. Create several bills with utility breakdowns → `GET /api/utilities/consumption` returns monthly data ✅
2. `GET /api/utilities/highest-usage` → returns units sorted by consumption ✅
3. `GET /api/utilities/overconsumption` → flags units above average ✅

---

#### 🔧 Emanuel — Inventory Frontend

**🤖 AI Model: Gemini** (standard table/form UI)

**Tasks:**
1. Create `infrastructure/services/InventoryService.ts` — API calls
2. Create `application/hooks/useInventory.ts`
3. Create `presentation/pages/hub/inventory/InventoryList.tsx`:
   - DataTable matching client spec table format: Item, Serial No., Condition, Quantity, Status, Actions
   - Filter: property, status (available/issued/returned/lost), condition
   - "Add Item" button
   - Color-coded status badges
4. Create `presentation/pages/hub/inventory/InventoryForm.tsx`:
   - Property selector, unit selector (optional)
   - Item name, serial number, condition dropdown, quantity
   - Purchase date, purchase cost (optional)
5. Create `presentation/pages/hub/inventory/IssueItemDialog.tsx`:
   - Select tenant from dropdown (tenants in the property)
   - Select unit
   - Caretaker name (auto-filled with logged-in user if they are staff)
   - Issue date
   - "Issue Item" button → creates InventoryRecord
6. Create `presentation/pages/hub/inventory/AccountabilityRecords.tsx`:
   - Tab view within inventory page
   - Records table: Item, Tenant, Unit, Issued Date, Status, Condition, Penalty
   - "Return" button → opens return dialog (condition assessment, damage notes)
   - "Report Damage" action → penalty computation display → confirm deduction
7. Create `presentation/pages/hub/inventory/DamagePenaltyDialog.tsx`:
   - Shows item details
   - Damage description textarea
   - Penalty amount (auto-computed or manual)
   - "Deduct from security deposit?" checkbox
   - Confirm button

**Files to create:**
```
client/src/infrastructure/services/InventoryService.ts
client/src/application/hooks/useInventory.ts
client/src/presentation/pages/hub/inventory/InventoryList.tsx
client/src/presentation/pages/hub/inventory/InventoryForm.tsx
client/src/presentation/pages/hub/inventory/IssueItemDialog.tsx
client/src/presentation/pages/hub/inventory/AccountabilityRecords.tsx
client/src/presentation/pages/hub/inventory/DamagePenaltyDialog.tsx
```

**✅ Verification:**
- `/hub/inventory` → item list with sample data ✅
- "Add Item" → fill form → appears in list ✅
- "Issue" an item to a tenant → item status becomes "Issued", record created ✅
- "Return" an item → mark condition → item goes back to "Available" ✅
- "Report Damage" → penalty amount shown → confirm → deduction flag set ✅
- Accountability Records tab → all issuance/return history visible ✅

---

### Day 12 — Billing Frontend & Maintenance Module

---

#### 👑 Rey — Billing & Payment Frontend

**🤖 AI Model: Gemini** (UI pages, forms)

**Tasks:**
1. Create `infrastructure/services/BillingService.ts` — API calls
2. Create `application/hooks/useBilling.ts`
3. Create `presentation/pages/hub/billing/BillList.tsx`:
   - DataTable: Tenant, Unit, Period, Type, Amount, Paid, Balance, Status, Due Date, Actions
   - Filter: status (unpaid/partial/paid/overdue), property, tenant, date range
   - "Create Bill" and "Auto-Generate Bills" buttons
   - Overdue bills highlighted in red
4. Create `presentation/pages/hub/billing/BillForm.tsx`:
   - Manual bill creation:
     - Select tenant → auto-fills unit and property
     - Bill type (rent / utility / combined)
     - Rent amount (pre-filled from contract)
     - Utility breakdown section (if utility or combined):
       - Electricity: previous reading, current reading, rate → auto-compute amount
       - Water: same
       - Internet (flat)
       - Others (add more rows)
     - Due date
5. Create `presentation/pages/hub/billing/BillDetail.tsx`:
   - Full bill breakdown display
   - Payment history table (all payments made toward this bill)
   - "Record Payment" button → opens RecordPaymentDialog
   - "Generate Receipt" button → downloads PDF
6. Create `presentation/pages/hub/billing/RecordPaymentDialog.tsx`:
   - Amount (default: remaining balance)
   - Payment method dropdown (Cash, GCash, Bank Transfer, Other)
   - Reference number (optional)
   - Upload proof of payment image
   - Notes
7. Create `presentation/pages/hub/billing/AutoGenerateDialog.tsx`:
   - Confirmation dialog: "Generate bills for all active contracts for [current month]?"
   - Shows preview: N contracts found, estimated total billing
   - Confirm → POST to auto-generate → show results

**Files to create:**
```
client/src/infrastructure/services/BillingService.ts
client/src/application/hooks/useBilling.ts
client/src/presentation/pages/hub/billing/BillList.tsx
client/src/presentation/pages/hub/billing/BillForm.tsx
client/src/presentation/pages/hub/billing/BillDetail.tsx
client/src/presentation/pages/hub/billing/RecordPaymentDialog.tsx
client/src/presentation/pages/hub/billing/AutoGenerateDialog.tsx
```

**✅ Verification:**
- `/hub/billing` → bill list ✅ 
- "Create Bill" → fill utility readings → auto-compute total → submit ✅
- "Auto-Generate" → confirm → bills created for all active contracts ✅
- Open a bill → "Record Payment" → enter amount → bill status updates (partial or paid) ✅
- "Generate Receipt" → PDF downloads with OR number, amounts, date ✅

---

#### 🔧 Paul — Utility Dashboard Frontend

**🤖 AI Model: Gemini** (charts with Recharts library)

**Tasks:**
1. Create `infrastructure/services/UtilityService.ts` — API calls
2. Create `application/hooks/useUtilities.ts`
3. Create `presentation/pages/hub/utilities/UtilityDashboard.tsx`:
   - **Monthly Consumption Graph**: Line/bar chart (Recharts) showing monthly utility costs over the past 12 months. Toggle between electricity/water/total.
   - **Highest Usage Room Report**: Ranked list of units by utility consumption — top 5 with bar indicators
   - **Overconsumption Alert**: Warning cards for units consuming >150% of average — highlighted in orange/red
   - **Utility Expense Summary**: Donut/pie chart breaking down total utility costs by type (electricity, water, internet, others)
   - **Period Selector**: Month/Quarter/Year dropdown
   - **Property Selector**: Filter by property
4. Create `presentation/pages/hub/utilities/MeterReadingForm.tsx`:
   - Submit utility meter readings for a unit
   - Unit selector, reading type (electricity/water)
   - Previous reading (auto-filled from last bill)
   - Current reading → auto-computes consumption and cost

**Files to create:**
```
client/src/infrastructure/services/UtilityService.ts
client/src/application/hooks/useUtilities.ts
client/src/presentation/pages/hub/utilities/UtilityDashboard.tsx
client/src/presentation/pages/hub/utilities/MeterReadingForm.tsx
```

**✅ Verification:**
- `/hub/utilities` → dashboard loads with charts (even if data is sparse) ✅
- Consumption graph shows monthly bars/lines ✅
- Highest usage section shows ranked units ✅
- Overconsumption alerts appear for high-usage units ✅
- Submit meter reading → refreshes consumption data ✅

---

#### 🔧 Emanuel — Maintenance Module (Full Stack)

**🤖 AI Model: Gemini** (standard CRUD)

**Tasks:**
1. Create `models/MaintenanceRequest.ts`:
   ```
   propertyId, unitId, reportedByUserId (tenant or staff),
   title, description, category: 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'pest' | 'other',
   priority: 'low' | 'medium' | 'high' | 'urgent',
   status: 'open' | 'in_progress' | 'completed' | 'cancelled',
   assignedToUserId?, images?: string[],
   resolutionNotes?, completedAt?,
   estimatedCost?, actualCost?,
   createdAt, updatedAt
   ```
2. Create `routes/maintenance.routes.ts`:
   ```
   GET    /api/maintenance              → list (filterable)
   GET    /api/maintenance/:id          → detail
   POST   /api/maintenance              → create request
   PATCH  /api/maintenance/:id          → update
   PATCH  /api/maintenance/:id/assign   → assign staff
   PATCH  /api/maintenance/:id/status   → change status
   POST   /api/maintenance/:id/images   → upload photos
   ```
3. Create controllers and services
4. Create `presentation/pages/hub/maintenance/MaintenanceList.tsx`:
   - DataTable: Title, Unit, Category, Priority (color-coded), Status, Assigned To, Date, Actions
   - Filter: status, priority, category, property
   - "New Request" button
5. Create `presentation/pages/hub/maintenance/MaintenanceForm.tsx`:
   - Property + unit selectors
   - Title, description, category dropdown, priority dropdown
   - Photo upload (multiple)
6. Create `presentation/pages/hub/maintenance/MaintenanceDetail.tsx`:
   - Request info, photos gallery
   - Status timeline (open → in_progress → completed)
   - Assign staff dropdown
   - Resolution notes textarea (when completing)
   - Cost fields (estimated and actual)

**Files to create:**
```
server/src/models/MaintenanceRequest.ts
server/src/routes/maintenance.routes.ts
server/src/controllers/maintenance.controller.ts
server/src/services/maintenance.service.ts
server/src/validators/maintenance.validator.ts
client/src/infrastructure/services/MaintenanceService.ts
client/src/application/hooks/useMaintenance.ts
client/src/presentation/pages/hub/maintenance/MaintenanceList.tsx
client/src/presentation/pages/hub/maintenance/MaintenanceForm.tsx
client/src/presentation/pages/hub/maintenance/MaintenanceDetail.tsx
```

**✅ Verification:**
- `/hub/maintenance` → request list ✅
- "New Request" → fill form → photos attached → submit → appears as "Open" ✅
- Assign to staff → staff member sees it in their maintenance list ✅
- Change status to "in_progress" → timeline updates ✅
- Complete with resolution notes → status "completed", completedAt set ✅

---

## Phase 3: Financials, Reports & Forecasts (Days 13–16)

### Day 13 — Financial Module & Report Backends

---

#### 👑 Rey — Financial Dashboard Backend & Frontend

**🤖 AI Model: Gemini** (aggregation queries + charts)

**Tasks:**
1. Create `routes/financial.routes.ts`:
   ```
   GET /api/financials/summary         → total rent collected, utilities, penalties, refunds, net income
   GET /api/financials/monthly         → monthly breakdown for chart
   GET /api/financials/by-property     → income per property
   GET /api/financials/expenses        → expense tracking (maintenance costs, etc.)
   ```
2. Create `services/financial.service.ts`:
   - `getMonthlySummary(landlordId, month)` → aggregate: total rent from paid bills, total utilities, total penalties (late fees), total refunds, net = rent + utilities + penalties - refunds
   - `getMonthlyTrend(landlordId, months)` → last N months of the above
   - `getByProperty(landlordId)` → income grouped by property
3. Create `presentation/pages/hub/financials/FinancialDashboard.tsx`:
   - **Summary Cards**: Total Rent Collected, Total Utilities, Total Penalties, Total Refunds, Net Income
   - **Monthly Revenue Chart**: Line chart showing monthly income over past 12 months
   - **Income by Property**: Bar chart or donut chart
   - **Expense breakdown**: Maintenance costs by category
   - Period selector (month/quarter/year)

**Files to create:**
```
server/src/routes/financial.routes.ts
server/src/controllers/financial.controller.ts
server/src/services/financial.service.ts
client/src/infrastructure/services/FinancialService.ts
client/src/application/hooks/useFinancials.ts
client/src/presentation/pages/hub/financials/FinancialDashboard.tsx
```

**✅ Verification:**
- `/hub/financials` → dashboard loads with summary cards and charts ✅
- Cards show correct aggregated values matching DB data ✅
- Monthly chart shows correct trend ✅
- Filter by property → data updates ✅

---

#### 🔧 Paul — Incident Report & Security Module

**🤖 AI Model: Gemini** (standard CRUD)

**Tasks:**
1. Create `models/IncidentReport.ts`:
   ```
   propertyId, unitId?, reportedByUserId,
   title, description, category: 'safety' | 'security' | 'damage' | 'disturbance' | 'other',
   severity: 'low' | 'medium' | 'high' | 'critical',
   images?: string[], status: 'open' | 'investigating' | 'resolved',
   resolutionNotes?, resolvedAt?, createdAt
   ```
2. Create incident report CRUD (routes, controller, service) → add to document routes or own route file
3. Create `presentation/pages/hub/security/SecurityDashboard.tsx`:
   - Emergency Contact list (per property)
   - Add/edit emergency contacts
   - Incident report list (latest incidents)
   - "Report Incident" button → form
4. Create `presentation/pages/hub/security/IncidentReportForm.tsx`:
   - Property/unit, title, description, category, severity, photo upload
5. Add emergency contact fields to Property model:
   ```
   emergencyContacts?: [{ name: string, phone: string, role: string }]
   ```

**Files to create:**
```
server/src/models/IncidentReport.ts
server/src/routes/incident.routes.ts
server/src/controllers/incident.controller.ts
server/src/services/incident.service.ts
client/src/presentation/pages/hub/security/SecurityDashboard.tsx
client/src/presentation/pages/hub/security/IncidentReportForm.tsx
```

**✅ Verification:**
- `/hub/security` → security dashboard with emergency contacts ✅
- Add emergency contact to a property → appears in list ✅
- "Report Incident" → fill form → appears in incident list ✅
- Change incident status → timeline updates ✅

---

#### 🔧 Emanuel — Reports Backend (Occupancy, Checkout Forecast)

**🤖 AI Model: Claude Opus** ⚡ (complex: forecast algorithms based on historical data, contract expiry analysis, multi-factor predictions)

**Tasks:**
1. Create `routes/report.routes.ts`:
   ```
   GET /api/reports/occupancy           → monthly occupancy report
   GET /api/reports/checkout-forecast    → monthly checkout predictions
   GET /api/reports/vacancy-forecast     → vacancy predictions
   GET /api/reports/revenue-loss        → estimated revenue loss from predicted vacancies
   GET /api/reports/reservation-forecast → incoming tenant pipeline
   ```
2. Create `services/report.service.ts`:
   - `getOccupancyReport(landlordId)`:
     - Total rooms, occupied, vacant, reserved
     - Occupancy rate = occupied / total × 100
     - Breakdown by property
   - `getCheckoutForecast(landlordId, months)`:
     - Find contracts expiring in next N months
     - Count non-renewal notices
     - Historical checkout trend (avg checkouts per month over past 12 months)
     - Peak move-out month prediction (month with most contract expirations)
     - Revenue loss estimation (sum of monthly rents from expiring contracts)
   - `getVacancyForecast(landlordId)`:
     - Current vacant units
     - Units becoming vacant (from checkout forecast)
     - Auto-adjustment if tenant moves out
     - Room-based distribution (which properties will have vacancies)
   - `getReservationForecast(landlordId)`:
     - Pending reservations count
     - Confirmed but not yet checked-in count
     - Waiting list count
     - Expected check-in dates

**Files to create:**
```
server/src/routes/report.routes.ts
server/src/controllers/report.controller.ts
server/src/services/report.service.ts
```

**✅ Verification:**
1. `GET /api/reports/occupancy` → returns total/occupied/vacant/reserved counts ✅
2. `GET /api/reports/checkout-forecast?months=3` → returns contracts expiring + predictions ✅
3. `GET /api/reports/vacancy-forecast` → returns upcoming vacancies by property ✅
4. Validation: manually count units in Compass, compare with API response ✅

---

### Day 14 — Reports Frontend & Tenant Portal

---

#### 👑 Rey — Auto-Renewal & Lock-in Tracker

**🤖 AI Model: Gemini** (standard logic)

**Tasks:**
1. Add to contract service:
   - `sendAutoRenewalOffer(contractId)` → creates notification to tenant offering contract renewal → if tenant has email, sends email too
   - `getLockInStatus(contractId)` → returns months elapsed, months remaining, is lock-in complete (boolean), early termination penalty amount if applicable
2. Create `presentation/pages/hub/contracts/LockInTracker.tsx`:
   - Visual display within contract detail page
   - Progress bar: "Month 3 of 12" 
   - Warning if trying to terminate within lock-in
   - Early termination penalty display
3. Add to billing service:
   - `getPerHeadBilling(unitId)` → for boarding house units: divide utility costs by number of occupants
   - Per head usage calculation endpoint
4. Add lock-in period check to checkout flow: if tenant tries to check out within lock-in, show warning + penalty

**Files to create/modify:**
```
server/src/services/contract.service.ts (modify — add auto-renewal, lock-in)
client/src/presentation/pages/hub/contracts/LockInTracker.tsx (new)
server/src/services/billing.service.ts (modify — add per head calculation)
```

**✅ Verification:**
- Open a contract in lock-in period → progress bar shows correct month ✅
- Try to terminate within lock-in → penalty amount displayed ✅
- Boarding house unit with 3 tenants → per-head utility split calculated ✅

---

#### 🔧 Paul — Reports Frontend (Occupancy & Financial Reports)

**🤖 AI Model: Gemini** (charts and tables)

**Tasks:**
1. Create `infrastructure/services/ReportService.ts` — API calls
2. Create `application/hooks/useReports.ts`
3. Create `presentation/pages/hub/reports/ReportsDashboard.tsx`:
   - Tab view: Occupancy | Financial | Checkout Forecast | Vacancy Forecast
4. Create `presentation/pages/hub/reports/OccupancyReport.tsx`:
   - Summary cards: Total Rooms, Occupied, Vacant, Reserved, Occupancy Rate (%)
   - Donut chart: occupancy distribution
   - Per-property breakdown table
5. Create `presentation/pages/hub/reports/FinancialReport.tsx`:
   - Monthly financial report matching client spec: Total Rent Collected, Total Utilities Collected, Total Penalties, Total Refunds, Net Income
   - Month selector
   - Exportable table
6. Create `presentation/pages/hub/reports/CheckoutForecast.tsx`:
   - Monthly checkout count chart (bar chart, next 6 months)
   - Peak move-out month highlighted
   - Revenue loss estimation cards
   - "Required Marketing Alert" banner if high vacancy expected
   - Auto-renewal offer reminder list
7. Create `presentation/pages/hub/reports/VacancyForecast.tsx`:
   - Current vacancies vs predicted vacancies chart
   - Per-property vacancy breakdown
   - Automatic adjustment notes if tenant moves out

**Files to create:**
```
client/src/infrastructure/services/ReportService.ts
client/src/application/hooks/useReports.ts
client/src/presentation/pages/hub/reports/ReportsDashboard.tsx
client/src/presentation/pages/hub/reports/OccupancyReport.tsx
client/src/presentation/pages/hub/reports/FinancialReport.tsx
client/src/presentation/pages/hub/reports/CheckoutForecast.tsx
client/src/presentation/pages/hub/reports/VacancyForecast.tsx
```

**✅ Verification:**
- `/hub/reports` → tabbed dashboard loads ✅
- Occupancy tab → correct room counts, donut chart renders ✅
- Financial tab → select a month → shows correct totals ✅
- Checkout Forecast → bar chart shows next 6 months, peak highlighted ✅
- Marketing alert banner appears when vacancy > 30% predicted ✅

---

#### 🔧 Emanuel — Tenant Portal (Complete)

**🤖 AI Model: Gemini** (standard UI pages)

**Tasks:**
1. Create `presentation/pages/tenant/MyRoom.tsx`:
   - Current unit display: name, property, photos, features, amenities
   - Roommates info (if bedspace)
   - Property rules/policies
   - Contact landlord/caretaker button
2. Create `presentation/pages/tenant/MyBills.tsx`:
   - List of all bills (current + historical)
   - Current outstanding bill card (highlighted)
   - Payment history per bill
   - Download receipt buttons
3. Create `presentation/pages/tenant/MyContract.tsx`:
   - Contract summary: start date, end date, lock-in status, monthly rent
   - Lock-in progress bar
   - Download contract PDF button
   - Signature status (signed/unsigned)
4. Create `presentation/pages/tenant/MyInventory.tsx`:
   - Items issued to the tenant
   - Table: Item, Serial No, Condition, Date Issued
   - Total items count
5. Create `presentation/pages/tenant/SubmitMaintenance.tsx`:
   - Form: title, description, category, priority, photo upload
   - List of tenant's own past requests with status
6. Create `presentation/pages/tenant/TenantNotifications.tsx`:
   - Full notification list (not just dropdown)
   - Categories: billing reminders, maintenance updates, checkout notices, announcements
7. Update `TenantLayout.tsx` routes and navigation

**Files to create:**
```
client/src/presentation/pages/tenant/MyRoom.tsx
client/src/presentation/pages/tenant/MyBills.tsx
client/src/presentation/pages/tenant/MyContract.tsx
client/src/presentation/pages/tenant/MyInventory.tsx
client/src/presentation/pages/tenant/SubmitMaintenance.tsx
client/src/presentation/pages/tenant/TenantNotifications.tsx
```

**✅ Verification:**
- Login as tenant → `/tenant` → dashboard shows room, bill, contract cards ✅
- "My Room" → unit details match DB ✅
- "My Bills" → shows tenant's bills, can download receipts ✅
- "My Contract" → shows contract with lock-in tracker ✅
- "My Inventory" → shows items issued to this tenant ✅
- "Submit Maintenance" → create request → appears in landlord's maintenance list ✅

---

### Day 15 — Super Admin Dashboard & Cross-Module Integration

---

#### 👑 Rey — Super Admin Dashboard Backend

**🤖 AI Model: Gemini** (aggregation queries)

**Tasks:**
1. Create `routes/admin.routes.ts`:
   ```
   GET /api/admin/stats                 → platform KPIs
   GET /api/admin/users                 → all users with filters
   PATCH /api/admin/users/:id/status    → suspend/activate user
   GET /api/admin/properties            → all properties with filters
   GET /api/admin/revenue               → platform revenue analytics
   GET /api/admin/activity              → recent activity log (from AuditLog)
   ```
2. Create `services/admin.service.ts`:
   - `getPlatformStats()` → total users, total properties, total units, total active tenants, total revenue (this month), active contracts count
   - `getRevenueAnalytics()` → monthly platform revenue, growth rate
   - `getActivityFeed()` → latest audit log entries
3. Create `presentation/pages/admin/Overview.tsx` (overwrite existing):
   - Platform KPI cards row: Total Users, Total Properties, Total Revenue, Active Tenants
   - Growth charts (users over time, properties over time)
   - Recent Activity feed (timeline of recent actions)
   - Quick actions: View Users, View Properties, Send Announcement
4. Update `presentation/pages/admin/Users.tsx` (overwrite existing):
   - DataTable: Avatar, Name, Email, Role, Status, Registered Date, Actions
   - Filter: role dropdown, status dropdown, search
   - Actions: Suspend, Activate, View Details
   - Click row → user detail modal

**Files to create/modify:**
```
server/src/routes/admin.routes.ts
server/src/controllers/admin.controller.ts
server/src/services/admin.service.ts
client/src/presentation/pages/admin/Overview.tsx (overwrite)
client/src/presentation/pages/admin/Users.tsx (overwrite)
```

**✅ Verification:**
- Login as super_admin → `/admin` → KPI cards show correct counts ✅
- Charts render with data ✅
- `/admin/users` → all users from all roles visible ✅
- Suspend a user → user status changes → that user can no longer login ✅
- Activity feed shows recent actions ✅

---

#### 🔧 Paul — Hub Overview Enhancement & Cross-Module Data

**🤖 AI Model: Gemini** (widget UI)

**Tasks:**
1. Enhance `presentation/pages/hub/overview/Overview.tsx`:
   - Replace placeholder stat cards with real data:
     - Total Properties (from property API)
     - Total Units / Vacant Units (from unit API)
     - Occupancy Rate (from report API)
     - Outstanding Bills count (from billing API)
   - **Conditional widgets based on permissions** (using `usePermissions()` hook):
     - If `bookings` → "Today's Check-ins" widget
     - If `billing` → "Overdue Bills" warning widget
     - If `inventory` → "Pending Returns" widget
     - If `maintenance` → "Open Maintenance Requests" widget
     - If `reports` → "Occupancy Rate" mini chart
   - Recent Activity timeline (latest actions in their properties)
   - Quick Action buttons (permission-filtered)
2. Create API endpoint for dashboard aggregation:
   ```
   GET /api/dashboard/hub-summary → returns all widget data in one call
   ```
3. Create `services/dashboard.service.ts` on backend (combined queries for efficiency)

**Files to create/modify:**
```
server/src/routes/dashboard.routes.ts (new)
server/src/controllers/dashboard.controller.ts (new)
server/src/services/dashboard.service.ts (new)
client/src/presentation/pages/hub/overview/Overview.tsx (overwrite)
```

**✅ Verification:**
- Login as landlord → Overview shows all widgets with real data ✅
- Login as staff with only `dashboard` + `bookings` → only sees Today's Check-ins widget, not billing or inventory ✅
- Data matches what's in the DB ✅

---

#### 🔧 Emanuel — Cron Jobs & Automated Reminders

**🤖 AI Model: Claude Opus** ⚡ (complex: scheduled job orchestration, multi-channel notification dispatch, deadline-based triggers)

**Tasks:**
1. Install `node-cron` or `agenda` on the server
2. Create `services/scheduler.service.ts`:
   - **Bill Auto-Generation Job** (runs on 1st of every month):
     - Find all active contracts → generate bill for current month → set due date
   - **Late Fee Job** (runs daily):
     - Find all unpaid bills past due date → apply late fee → update status to "overdue"
   - **Visit Reminder Job** (runs hourly):
     - Find confirmed visits within next 24 hours → send 1-day reminder (if not already sent)
     - Find confirmed visits within next 2 hours → send 2-hour reminder
   - **Checkout Reminder Job** (runs daily):
     - Find contracts ending in 7/3/1 days → create notifications for admin, caretaker, landlord, tenant
   - **Auto-Renewal Offer Job** (runs daily):
     - Find contracts expiring in 30 days with `autoRenewal = true` → send renewal offer notification
3. Create `services/notificationDispatch.service.ts`:
   - `sendInApp(userId, notification)` → save to Notification model
   - `sendEmail(to, subject, body)` → use mailer config
   - `sendMultiChannel(userId, notification)` → in-app + email (SMS and push are placeholders for future)
4. Wire up all schedulers in `server.ts` (activate only in production or with a flag)

**Files to create:**
```
server/src/services/scheduler.service.ts
server/src/services/notificationDispatch.service.ts
```

**✅ Verification:**
- Manually trigger the bill auto-generation function → bills created for all active contracts ✅
- Manually trigger the late fee function → overdue bills get late fee added ✅
- Create a visit for tomorrow → trigger reminder function → notification appears in bell dropdown ✅
- Create a contract ending in 7 days → trigger checkout reminder → notifications created for all parties ✅
- Check email inbox (Mailtrap) → emails actually sent ✅

---

### Day 16 — Integration Testing & Bug Fixes

---

#### 👑 Rey — Full Flow Integration Testing

**🤖 AI Model: Gemini** (testing)

**Tasks:**
1. Test complete landlord flow E2E:
   ```
   Register landlord → Add property → Add units → Invite staff with specific permissions →
   Staff logs in (sees only permitted features) → Staff creates a booking →
   Booking confirmed → Tenant arrives → Complete check-in →
   Contract created → Bill auto-generated → Tenant logs in → Sees bill →
   Payment recorded → Receipt generated → Pre-checkout reminder → Checkout
   ```
2. Test billing edge cases:
   - Partial payment → balance correct
   - Late fee application → amount correct
   - Combined bill → rent + utility totals match
   - Per-head billing for boarding house
3. Fix all bugs found
4. Update API_REFERENCE.md with all new endpoints

**✅ Verification:**
- Complete flow works without errors ✅
- No 500 errors in server logs ✅

---

#### 🔧 Paul — UI Polish & Responsive Testing

**🤖 AI Model: Gemini** (UI polish)

**Tasks:**
1. Test all pages on:
   - Desktop (1920px)
   - Tablet (768px)
   - Mobile (375px)
2. Fix responsive issues:
   - Tables → horizontal scroll on mobile
   - Forms → stack to single column
   - Charts → resize correctly
3. Dark/light mode verification across all pages
4. Loading states on all data-fetching pages (skeleton or spinner)
5. Error states on all pages (show friendly error message if API fails)
6. Empty states on all list pages (show illustration when no data)

**✅ Verification:**
- Every page renders correctly on mobile ✅
- No horizontal overflow on any page ✅
- Toggle dark mode → no broken styling ✅
- Disconnect server → pages show error state, not blank screen ✅

---

#### 🔧 Emanuel — Tenant Flow Testing & Notification Polish

**🤖 AI Model: Gemini** (testing)

**Tasks:**
1. Test complete tenant flow E2E:
   ```
   Tenant receives account → Logs in → Sees dashboard →
   Views My Room → Views My Bills → Views My Contract →
   Submits maintenance request → Views notifications →
   Receives checkout reminder
   ```
2. Polish notification system:
   - Ensure all notification types display correctly in the bell dropdown
   - Clicking a notification → navigates to relevant page
   - Mark as read → badge count updates
   - "Mark All Read" works
3. Test staff with minimal permissions (only `dashboard`):
   - Sidebar shows only Overview
   - All other URL routes blocked
   - No data leaks in API responses
4. Fix all bugs found

**✅ Verification:**
- Tenant flow works completely ✅
- Notifications navigate to correct pages ✅
- Minimal-permission staff sees no unauthorized data ✅

---

## Phase 4: Final Polish & Deployment Prep (Days 17–20)

### Day 17 — Advanced Features & Data Enhancement

---

#### 👑 Rey — Receipt Enhancement & Billing Settings

**🤖 AI Model: Gemini** (template refinement)

**Tasks:**
1. Enhance receipt PDF template with proper formatting:
   - OR number sequence (auto-incrementing)
   - Landlord's name and property info
   - Detailed line items (rent, electricity, water, others, late fee)
   - Payment method and reference
   - "This is an official receipt" footer
2. Add billing settings to Property model:
   - `billingDay` — which day of month bills are generated (default: 1st)
   - `dueDay` — which day bills are due (default: 5th)
   - `lateFeePercentage` — late fee rate (default: 5%)
   - `utilityIncludedByDefault` — toggle
3. Create billing settings UI within property detail page
4. Annual utility report endpoint: aggregate full year of utility data

**Files to modify:**
```
server/src/services/templates/receiptTemplate.ts (improve)
server/src/models/Property.ts (add billing settings)
client/src/presentation/pages/hub/properties/PropertyDetail.tsx (add billing tab)
```

**✅ Verification:**
- Generated receipt looks professional, includes OR number ✅
- Billing settings saved per property → auto-generate respects custom billing day ✅

---

#### 🔧 Paul — Public Listings Integration with Real Data

**🤖 AI Model: Gemini** (replacing mocks)

**Tasks:**
1. Create public API routes (no auth required):
   ```
   GET /api/public/listings              → active properties with metrics
   GET /api/public/listings/:id          → property detail with units
   GET /api/public/listings/unit/:id     → unit detail
   ```
2. Update public listing pages to fetch from real API:
   - Replace MockPropertyService and MockUnitService with real API calls
   - Update `ListingsPage.tsx` to use real data
   - Update `PropertyDetailPage.tsx` to use real data
   - Update `UnitDetailPage.tsx` to use real data
3. Maintain the filter functionality using real data
4. Image carousels use real Cloudinary URLs

**Files to create/modify:**
```
server/src/routes/public.routes.ts (new)
server/src/controllers/public.controller.ts (new)
client/src/infrastructure/services/MockPropertyService.ts (delete)
client/src/infrastructure/services/MockUnitService.ts (delete)
client/src/infrastructure/services/ListingService.ts (new — real API)
client/src/presentation/pages/listings/ListingsPage.tsx (modify)
client/src/presentation/pages/listings/PropertyDetailPage.tsx (modify)
client/src/presentation/pages/listings/UnitDetailPage.tsx (modify)
```

**✅ Verification:**
- Visit `/listings` (public) → properties from DB displayed ✅
- Click a property → detail page with real images, units, pricing ✅
- Filter works (by type, price range, location) ✅
- No auth required for public pages ✅

---

#### 🔧 Emanuel — Seed All Demo Data

**🤖 AI Model: Gemini** (data creation)

**Tasks:**
1. Create comprehensive seed script `server/src/seeds/seedAll.ts`:
   - 1 super_admin
   - 2 landlords
   - 3 staff members per landlord (with varied permissions and positions)
   - 3 properties per landlord (with images from placeholder service)
   - 5 units per property (mix of room and bedspace types)
   - 2-3 tenants per property
   - Active contracts for all tenants
   - 3 months of billing history per tenant
   - Payment records for some bills
   - Inventory items for each property
   - Issued inventory records for tenants
   - Sample bookings (visits and reservations)
   - Maintenance requests
   - Notifications
   - Documents
2. Make the seed script idempotent (can be re-run without duplicating data)
3. Pin down realistic Filipino data (names, addresses, phone numbers)

**Files to create:**
```
server/src/seeds/seedAll.ts
```

**✅ Verification:**
- Run `npx tsx server/src/seeds/seedAll.ts` → see creation logs ✅
- Login as any role → see populated dashboards with realistic data ✅
- All charts have enough data to display meaningful trends ✅
- Listings page shows real seeded properties ✅

---

### Day 18 — Cross-Feature Refinement

---

#### 👑 Rey — Audit Logging & Security Hardening

**🤖 AI Model: Gemini** (middleware)

**Tasks:**
1. Create audit logging middleware `middleware/auditLog.ts`:
   - Automatically logs: user ID, action (create/update/delete), resource type, resource ID, timestamp
   - Attach to all POST/PATCH/DELETE routes
2. Add rate limiting per route group:
   - Auth routes: 10 requests per 15 minutes
   - General API: 100 requests per 15 minutes
3. Add input sanitization (prevent NoSQL injection)
4. Add CORS whitelist (only allow client URL)
5. Verify all sensitive routes require proper auth + RBAC
6. Add account lockout after 5 failed login attempts
7. Create activity log page for super admin: `presentation/pages/admin/ActivityLog.tsx`

**Files to create/modify:**
```
server/src/middleware/auditLog.ts (new)
server/src/server.ts (add rate limiting, CORS config)
client/src/presentation/pages/admin/ActivityLog.tsx (new)
```

**✅ Verification:**
- Perform actions as landlord → check AuditLog collection in Compass → entries logged ✅
- Super admin → Activity Log page → see all recent actions ✅
- Rapid-fire 15 login attempts → rate limited after 10 ✅
- 5 failed logins → account temporarily locked ✅

---

#### 🔧 Paul — Missing UI Pages & Hub Navigation Polish

**🤖 AI Model: Gemini** (UI pages)

**Tasks:**
1. Add nested routing within hub pages:
   - Properties: `/hub/properties` → `/hub/properties/:id` → `/hub/properties/:id/edit`
   - Units: `/hub/units` → `/hub/units/:id`
   - Tenants: `/hub/tenants` → `/hub/tenants/:id`
   - Bookings: `/hub/bookings` → `/hub/bookings/:id` → calendar view
   - Contracts: `/hub/contracts` → `/hub/contracts/:id`
   - Billing: `/hub/billing` → `/hub/billing/:id`
2. Add breadcrumb navigation component
3. Add "back" button behavior on detail pages
4. Verify all sidebar items link to working pages (no more placeholders)
5. Add search in AppBar (global search across properties, units, tenants)

**Files to create/modify:**
```
client/src/App.tsx (add nested routes)
client/src/presentation/components/Breadcrumbs.tsx (new)
```

**✅ Verification:**
- Click through every sidebar item → each page loads ✅
- Breadcrumbs show correct path ✅
- Back button works on all detail pages ✅
- Global search returns results across entities ✅

---

#### 🔧 Emanuel — Tenant Portal Refinement & Mobile

**🤖 AI Model: Gemini** (UI refinement)

**Tasks:**
1. Polish tenant portal pages:
   - Bill payment status colors and progress indicators
   - Contract lock-in visual improvements
   - Maintenance request status timeline
2. Add tenant ability to add comment after check-in (post check-in comment system)
3. Mobile-first verification of tenant pages (tenants will most likely use phones)
4. Add transition animations between pages (subtle page transitions)
5. Ensure all data tables on mobile become card layouts instead of horizontal-scroll tables
6. Create `presentation/components/MobileCardList.tsx` — mobile-friendly alternative to DataTable

**Files to create/modify:**
```
client/src/presentation/components/MobileCardList.tsx (new)
client/src/presentation/pages/tenant/* (polish all)
```

**✅ Verification:**
- Open tenant portal on phone → all pages look great on mobile ✅
- Tables become card lists on small screens ✅
- Page transitions are smooth ✅

---

### Day 19 — End-to-End Testing (All Roles)

---

#### All Three Developers — Role-Based E2E Testing

**🤖 AI Model: Gemini** (testing)

Each developer tests a complete role scenario:

**Rey tests: Landlord complete flow**
```
1. Login as landlord
2. Add property with images
3. Add 3 units (mix of room and bedspace)
4. Invite a staff member with "Operations Manager" preset
5. Invite a caretaker with "Basic Staff" preset  
6. Schedule a visit → confirm → assign caretaker
7. Complete check-in → contract created → bill generated
8. Record payment → download receipt
9. Submit meter readings → utility dashboard updates
10. View financial reports → totals correct
11. View occupancy report → percentages correct
12. Check checkout forecast → expiring contracts listed
13. Logout
```

**Paul tests: Staff with limited permissions**
```
1. Login as staff with Operations Manager permissions
2. Verify sidebar shows only permitted items
3. Try to access /hub/financials via URL → redirected to 403
4. Add a booking → confirm it
5. Complete check-in for a tenant
6. View inventory → issue item to tenant
7. Submit maintenance request
8. View utility dashboard for assigned properties only
9. Try to access another landlord's property via API → 403
10. Logout
```

**Emanuel tests: Tenant + Super Admin**
```
Tenant:
1. Login as tenant
2. View My Room → correct unit
3. View My Bills → see outstanding bill
4. View My Contract → lock-in tracker correct
5. View My Inventory → items match
6. Submit maintenance request → appears in landlord's list
7. Receive checkout reminder notification

Super Admin:
8. Login as super_admin
9. View all users → paginated, filterable
10. Suspend a landlord → landlord can no longer login
11. View platform KPIs → totals correct
12. View activity log → recent actions listed
13. View all properties across all landlords
```

**✅ Each developer documents:**
- ✅ Passing scenarios
- ❌ Bugs found (create a shared bug list)
- 🟡 Polish items (nice-to-haves)

---

### Day 20 — Bug Fixes, Polish & Deployment

---

#### 👑 Rey — Bug Fixes & Backend Optimization

**🤖 AI Model: Gemini** (fixes)

**Tasks:**
1. Fix all bugs from Day 19 testing (backend)
2. Add pagination to all list endpoints (default 20 per page)
3. Add response compression (gzip)
4. Optimize MongoDB queries (add missing indexes)
5. Verify `.env.example` is complete
6. Create production build script
7. Test with production build: `npm run build && npm run start`

---

#### 🔧 Paul — Bug Fixes & Frontend Optimization  

**🤖 AI Model: Gemini** (fixes)

**Tasks:**
1. Fix all bugs from Day 19 testing (frontend)
2. Add lazy loading for route components (`React.lazy()`)
3. Optimize bundle size (check for unused imports)
4. Test production build: `cd client && npm run build`
5. Verify Vercel deployment config (`vercel.json`)
6. Ensure all meta tags and SEO elements are correct
7. Favicon and site branding

---

#### 🔧 Emanuel — Bug Fixes & Demo Prep

**🤖 AI Model: Gemini** (fixes)

**Tasks:**
1. Fix all bugs from Day 19 testing
2. Ensure seed script creates a clean, demo-ready dataset
3. Create a quick-start guide: `README.md` update with:
   - How to install
   - How to run (dev mode)
   - How to seed demo data
   - Test accounts and passwords
   - Feature overview
4. Final responsive check on all pages
5. Final dark mode check on all pages

---

## Summary

| Phase | Days | Focus |
|---|---|---|
| **Phase 1**: Foundation & Auth | Days 1–5 | Authentication, RBAC, layouts, routing, team management |
| **Phase 2**: Core CRUD & Operations | Days 6–12 | Properties, units, tenants, bookings, contracts, billing, inventory, maintenance |
| **Phase 3**: Financials, Reports & Forecasts | Days 13–16 | Financial dashboard, occupancy/vacancy/checkout reports, tenant portal, cron jobs, super admin |
| **Phase 4**: Final Polish & Deployment | Days 17–20 | Data integration, testing, bug fixes, optimization, deployment |

### AI Model Usage Summary

| Model | Usage Count | Used For |
|---|---|---|
| **Gemini Pro 3.1** | ~85% of tasks | Standard CRUD, UI pages, forms, charts, styling, testing, data |
| **Claude Opus 4.6** | ~15% of tasks | Auth/JWT system, RBAC middleware, billing logic, contract PDF, checkout state machine, forecast algorithms, cron scheduling |

### Claude Opus Specific Tasks (6 total):
1. Day 2 — Rey: Backend JWT auth with token rotation
2. Day 2 — Paul: Frontend AuthContext with auto-refresh
3. Day 3 — Rey: 3-layer RBAC middleware
4. Day 3 — Paul: Dynamic permission-filtered sidebar
5. Day 9 — Rey: Check-in state machine with cascading updates
6. Day 11 — Rey: Billing auto-generation with late fees and per-head calculation
7. Day 13 — Emanuel: Forecast algorithms (checkout, vacancy prediction)
8. Day 15 — Emanuel: Cron job orchestration & notification dispatch
