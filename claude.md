# Restaurant Management — Backend API

A modular, scalable REST API for managing multi-branch, multi-restaurant operations — built with Node.js, Express, TypeScript, and PostgreSQL.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Installation Steps](#installation-steps)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [API Endpoints](#api-endpoints)
8. [Authentication & Authorization](#authentication--authorization)
9. [Super Admin vs Restaurant Admin](#super-admin-vs-restaurant-admin)
10. [Error Handling](#error-handling)
11. [Best Practices Used](#best-practices-used)
12. [Future Improvements](#future-improvements)

---

## Project Overview

The Restaurant Management API handles the full backend for a SaaS-style restaurant management platform. It supports multiple restaurants, each with multiple branches, users, and roles — all isolated per restaurant. A super admin sits above all restaurants and manages the platform.

### What it does

- Multi-restaurant, multi-branch architecture
- JWT-based authentication with bcrypt password hashing
- Role-based access control (RBAC) — admin, manager, cashier, kitchen
- Super admin login — above all restaurants, sees everything
- Restaurant-scoped data — users only see their own restaurant's data
- User impersonation — admin can log in as any user for support
- Full CRUD for restaurants, branches, users, and roles
- Default role protection — system roles cannot be deleted
- Soft deletes — records deactivated, never hard deleted
- Activate/deactivate for restaurants and branches

---

## Tech Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Runtime          | Node.js                              |
| Framework        | Express.js v4                        |
| Language         | TypeScript                           |
| Database         | PostgreSQL v18                       |
| DB Client        | pg (node-postgres) — raw SQL, no ORM |
| Authentication   | JSON Web Tokens (JWT)                |
| Password Hashing | bcryptjs                             |
| Validation       | Zod (planned)                        |
| Dev Tools        | ts-node, nodemon                     |

---

## Project Structure

```
inventory-app/
├── src/
│   ├── config/
│   │   └── db.ts                      # PostgreSQL connection pool
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 001_init_org_auth.sql  # Initial schema
│   │   ├── 002_raw_materials.sql
│   │   └── 003_vendors.sql
│   │   └── 004_purchases.sql
│   │   └── seeds/
│   │       └── 001_roles.sql          # Default roles seed
│   ├── middlewares/
│   │   ├── authenticate.ts            # JWT token validation
│   │   ├── authorize.ts               # Role-based access control
│   │   └── errorHandler.ts            # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.service.ts
│   │   ├── branch/
│   │   │   ├── branch.controller.ts
│   │   │   ├── branch.routes.ts
│   │   │   └── branch.service.ts
│   │   ├── restaurant/
│   │   │   ├── restaurant.controller.ts
│   │   │   ├── restaurant.routes.ts
│   │   │   └── restaurant.service.ts
│   │   ├── role/
│   │   │   ├── role.controller.ts
│   │   │   ├── role.routes.ts
│   │   │   └── role.service.ts
│   │   └── user/
│   │       ├── user.controller.ts
│   │       ├── user.routes.ts
│   │       └── user.service.ts
│   │   └── purchase/
│   │       ├── purchase.controller.ts
│   │       ├── purchase.routes.ts
│   │       └── purchase.service.ts
│   │   ├── rawMaterial/
│   │   │   ├── rawMaterial.controller.ts
│   │   │   ├── rawMaterial.routes.ts
│   │   │   └── rawMaterial.service.ts
│   │   └── vendor/
│   │       ├── vendor.controller.ts
│   │       ├── vendor.routes.ts
│   │       └── vendor.service.ts
│   ├── routes/
│   │   └── index.ts                   # Root router
│   └── app.ts                         # Express entry point
├── .env
├── nodemon.json
├── tsconfig.json
└── package.json
```

---

## Installation Steps

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- npm

### 1. Clone and install

```bash
git clone https://github.com/your-username/inventory-app.git
cd inventory-app
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# edit .env with your values
```

### 3. Create database

```bash
psql -U postgres
CREATE DATABASE inventory;
\q
```

### 4. Run migrations

```bash
psql -U postgres -h 127.0.0.1 -d inventory -f src/db/migrations/001_init_org_auth.sql
```

### 5. Seed default roles

```bash
psql -U postgres -h 127.0.0.1 -d inventory -f src/db/seeds/001_roles.sql
```

### 6. Create super admin

```bash
psql -U postgres -h 127.0.0.1 -d inventory
```

```sql
INSERT INTO users (name, email, password_hash, is_active, is_super_admin)
VALUES (
  'Super Admin',
  'superadmin@system.com',
  '<bcrypt_hash_of_your_password>',
  true,
  true
);
```

Generate hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword', 10).then(h => console.log(h))"
```

### 7. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:3001`.

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/inventory
PORT=3001
JWT_ACCESS_SECRET=your_super_secret_key_here
```

| Variable            | Description                   |
| ------------------- | ----------------------------- |
| `DATABASE_URL`      | PostgreSQL connection string  |
| `PORT`              | Express server port           |
| `JWT_ACCESS_SECRET` | Secret for signing JWT tokens |

---

## Database Setup

### Tables

```
restaurants      — top-level tenant
branches         — branches per restaurant
roles            — roles per restaurant (with is_default flag)
users            — users with restaurant + branch + role assignment
refresh_tokens   — JWT refresh token storage (planned)
raw_materials    — master list of ingredients per restaurant
vendors          — supplier/vendor list per restaurant
purchases        — purchase header (vendor, invoice, date, total cost)
purchase_items   — line items per purchase (raw material, qty, metric, price)
```

### Schema

```sql
restaurants
  id SERIAL PK, name, slug UNIQUE, timezone, is_active, created_at, updated_at

branches
  id SERIAL PK, restaurant_id FK, name, address, phone, is_active, created_at, updated_at

roles
  id SERIAL PK, restaurant_id FK, name, description, is_default, created_at
  UNIQUE(restaurant_id, name)

users
  id SERIAL PK, restaurant_id FK (nullable), branch_id FK (nullable),
  role_id FK (nullable), name, email UNIQUE, password_hash,
  is_active, is_super_admin, created_at, updated_at

refresh_tokens
  id SERIAL PK, user_id FK, token UNIQUE, expires_at, created_at

raw_materials
  id SERIAL PK, restaurant_id FK, category, name,
  metric CHECK(kg/g/l/ml/unit), is_active, created_by FK, created_at, updated_at
  UNIQUE(restaurant_id, name)

vendors
  id SERIAL PK, restaurant_id FK, name, phone VARCHAR(10),
  address, description, is_active, created_by FK, created_at, updated_at
  UNIQUE(restaurant_id, phone)

restaurants (updated)
  added: storage_room_name VARCHAR(255) DEFAULT 'Main Store'

purchases
  id SERIAL PK, restaurant_id FK, vendor_id FK, invoice_number,
  purchase_date DATE, total_cost NUMERIC(10,2), notes,
  created_by FK, created_at, updated_at
  UNIQUE(restaurant_id, invoice_number)

purchase_items
  id SERIAL PK, purchase_id FK ON DELETE CASCADE,
  raw_material_id FK, quantity NUMERIC(10,3), metric CHECK(kg/g/l/ml/unit),
  price_per_unit NUMERIC(10,2), total_cost NUMERIC(10,2), created_at
```

### Key design decisions

**Serial PKs** — simple integer IDs. Easy to query manually, easy to debug.

**Nullable restaurant/branch/role on users** — super admin has no restaurant affiliation. These columns are NULL for super admin accounts.

**`is_super_admin` flag** — single boolean on users table. Super admin bypasses all role checks and sees all data across all restaurants.

**`is_default` on roles** — marks system-seeded roles. Default roles cannot be deleted. Custom roles created by restaurant admins can be freely deleted (unless users are assigned).

**Soft deletes** — `is_active = false` instead of DELETE. Preserves data integrity and referential consistency.

**Append-only pattern** — designed for future inventory ledger and audit logs.

### Default roles (seeded)

| Role      | Description            | is_default |
| --------- | ---------------------- | ---------- |
| `admin`   | Full restaurant access | true       |
| `manager` | Branch operations      | true       |
| `cashier` | Orders and payments    | true       |
| `kitchen` | View and update orders | true       |

---

## API Endpoints

Base URL: `http://localhost:3001/api`

### Health

| Method | Route     | Auth | Description         |
| ------ | --------- | ---- | ------------------- |
| GET    | `/health` | None | Server health check |

### Auth

| Method | Route                           | Auth  | Description                     |
| ------ | ------------------------------- | ----- | ------------------------------- |
| POST   | `/api/auth/login`               | None  | Login with email + password     |
| POST   | `/api/auth/impersonate/:userId` | Admin | Generate token for another user |

**Login request:**

```json
{
  "email": "tamil@max.com",
  "password": "Password@123"
}
```

**Login response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "id": 1,
      "name": "Tamil Selvan",
      "email": "tamil@max.com",
      "role": "admin",
      "branch": "Andheri Branch",
      "branch_id": 1,
      "restaurant_id": 1,
      "is_super_admin": false
    }
  }
}
```

### Restaurants

| Method | Route                           | Auth  | Description           |
| ------ | ------------------------------- | ----- | --------------------- |
| GET    | `/api/restaurants`              | Admin | Get all restaurants   |
| GET    | `/api/restaurants/:id`          | Admin | Get restaurant by ID  |
| POST   | `/api/restaurants`              | Admin | Create restaurant     |
| PUT    | `/api/restaurants/:id`          | Admin | Update restaurant     |
| DELETE | `/api/restaurants/:id`          | Admin | Deactivate restaurant |
| PATCH  | `/api/restaurants/:id/activate` | Admin | Activate restaurant   |

### Branches

| Method | Route                          | Auth           | Description                         |
| ------ | ------------------------------ | -------------- | ----------------------------------- |
| GET    | `/api/branches`                | Admin, Manager | Get branches (scoped by restaurant) |
| GET    | `/api/branches/:id`            | Admin, Manager | Get branch by ID                    |
| GET    | `/api/branches/restaurant/:id` | Admin, Manager | Get branches by restaurant          |
| POST   | `/api/branches`                | Admin          | Create branch                       |
| PUT    | `/api/branches/:id`            | Admin          | Update branch                       |
| DELETE | `/api/branches/:id`            | Admin          | Deactivate branch                   |
| PATCH  | `/api/branches/:id/activate`   | Admin          | Activate branch                     |

### Users

| Method | Route                   | Auth           | Description                      |
| ------ | ----------------------- | -------------- | -------------------------------- |
| GET    | `/api/users`            | Admin, Manager | Get users (scoped by restaurant) |
| GET    | `/api/users/:id`        | Admin, Manager | Get user by ID                   |
| GET    | `/api/users/branch/:id` | Admin, Manager | Get users by branch              |
| POST   | `/api/users`            | Admin, Manager | Create user                      |
| PUT    | `/api/users/:id`        | Admin, Manager | Update user                      |
| DELETE | `/api/users/:id`        | Admin          | Deactivate user                  |

### Roles

| Method | Route                       | Auth           | Description                      |
| ------ | --------------------------- | -------------- | -------------------------------- |
| GET    | `/api/roles`                | Admin, Manager | Get roles (scoped by restaurant) |
| GET    | `/api/roles/:id`            | Admin, Manager | Get role by ID                   |
| GET    | `/api/roles/restaurant/:id` | Admin, Manager | Get roles by restaurant          |
| POST   | `/api/roles`                | Admin          | Create role                      |
| PUT    | `/api/roles/:id`            | Admin          | Update role                      |
| DELETE | `/api/roles/:id`            | Admin          | Delete role                      |

### Raw Materials

| Method | Route                    | Auth                       | Description                    |
| ------ | ------------------------ | -------------------------- | ------------------------------ |
| GET    | `/api/raw-materials`     | Authenticated              | Get all (scoped by restaurant) |
| GET    | `/api/raw-materials/:id` | Authenticated              | Get by ID                      |
| POST   | `/api/raw-materials`     | Admin, Manager, Supervisor | Bulk create                    |
| PUT    | `/api/raw-materials/:id` | Admin, Manager, Supervisor | Update                         |
| DELETE | `/api/raw-materials/:id` | Admin, Manager, Supervisor | Soft delete                    |

### Vendors

| Method | Route              | Auth                       | Description                    |
| ------ | ------------------ | -------------------------- | ------------------------------ |
| GET    | `/api/vendors`     | Authenticated              | Get all (scoped by restaurant) |
| GET    | `/api/vendors/:id` | Authenticated              | Get by ID                      |
| POST   | `/api/vendors`     | Admin, Manager, Supervisor | Create vendor                  |
| PUT    | `/api/vendors/:id` | Admin, Manager, Supervisor | Update vendor                  |
| DELETE | `/api/vendors/:id` | Admin, Manager, Supervisor | Soft delete                    |

### Purchases

| Method | Route                            | Auth                       | Description                                      |
| ------ | -------------------------------- | -------------------------- | ------------------------------------------------ |
| GET    | `/api/purchases`                 | Authenticated              | Get all purchases (scoped, server-side filtered) |
| GET    | `/api/purchases/purchase-report` | Authenticated              | Vendor purchase report by date range             |
| GET    | `/api/purchases/:id`             | Authenticated              | Get purchase with line items                     |
| POST   | `/api/purchases`                 | Admin, Manager, Supervisor | Create purchase with items (transaction)         |
| DELETE | `/api/purchases/:id`             | Admin, Manager, Supervisor | Delete purchase + cascade items                  |

**Query params for GET `/api/purchases`:**

- `vendor_id` — filter by vendor
- `invoice_number` — partial match search
- `date_from` / `date_to` — date range filter

**Query params for GET `/api/purchases/purchase-report`:**

- `vendor_id` — required
- `date_from` — required
- `date_to` — required

**Response includes stats:**

```json
{
  "data": {
    "purchases": [...],
    "stats": {
      "total_count": 4,
      "total_spend": 3740.00
    }
  }
}
```

---

## Authentication & Authorization

### Flexible Role Permission Pattern

Some modules (Raw Materials, Vendors) use a flexible permitted roles array
instead of the authorize middleware. This allows adding new roles without
touching route definitions.

const PERMITTED_ROLES = ['admin', 'manager', 'supervisor'];
// add any future role here — routes don't change

### Password Hashing

Passwords hashed with bcryptjs, salt rounds 10. Never stored or returned as plain text.

```typescript
const passwordHash = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(plainPassword, passwordHash);
```

### JWT Token

Signed with `JWT_ACCESS_SECRET`. Expires in 1 day. Contains:

```json
{
  "id": 1,
  "email": "tamil@max.com",
  "role": "admin",
  "branch_id": 1,
  "restaurant_id": 1,
  "is_super_admin": false
}
```

### Authenticate Middleware

Validates Bearer token on every protected route. Attaches decoded user to `req.user`.

```
Authorization: Bearer <token>
```

Returns `401` if token missing or invalid.

### Authorize Middleware

Checks `req.user.role` against allowed roles. Super admin bypasses all role checks automatically.

```typescript
router.post("/", authenticate, authorize("admin"), controller.create);
router.get("/", authenticate, authorize("admin", "manager"), controller.getAll);
```

Returns `403` if role not permitted.

### Impersonation

Admin generates a token for any user without their password. Token includes `impersonated: true` and `impersonated_by: adminId`. Valid for 2 hours. Only `admin` role or super admin can impersonate.

---

## Super Admin vs Restaurant Admin

|                        | Super Admin | Restaurant Admin                         |
| ---------------------- | ----------- | ---------------------------------------- |
| `restaurant_id`        | NULL        | Set to their restaurant                  |
| `branch_id`            | NULL        | Set to their branch                      |
| `role_id`              | NULL        | Set to their role                        |
| `is_super_admin`       | true        | false                                    |
| Sees restaurants       | All         | Own only                                 |
| Sees branches          | All         | Own restaurant only                      |
| Sees users             | All         | Own restaurant only (excl. super admins) |
| Sees roles             | All         | Own restaurant only                      |
| Can create restaurants | Yes         | No                                       |

### Data scoping

All list endpoints check `is_super_admin` from the JWT token:

```typescript
if (isSuperAdmin) {
  // return all records
} else {
  // filter by restaurant_id from token
}
```

Super admins are hidden from non-super-admin user lists via `AND u.is_super_admin = false`.

---

## Error Handling

All errors flow through `src/middlewares/errorHandler.ts`.

### Error response format

```json
{
  "success": false,
  "message": "Description of what went wrong"
}
```

### HTTP status codes

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| 400  | Bad request — missing fields, validation, business rule violation |
| 401  | Unauthorized — missing or invalid token                           |
| 403  | Forbidden — insufficient role                                     |
| 404  | Not found                                                         |
| 500  | Internal server error                                             |

### Business rule errors

| Scenario                       | Response                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| Duplicate email                | 400 — Email already exists                                 |
| Delete default role            | 400 — Cannot delete a default role                         |
| Delete role with active users  | 400 — Cannot delete role — active users are assigned to it |
| Login with wrong password      | 401 — Invalid email or password                            |
| Non-admin impersonating        | 403 — Only owners can impersonate users                    |
| Duplicate vendor phone         | 400 — A vendor with this phone number already exists       |
| Invalid phone format           | 400 — Phone must be exactly 10 digits                      |
| Duplicate raw material name    | 400 — One or more raw material names already exist         |
| Duplicate invoice number       | 400 — Invoice number already exists for this restaurant    |
| Missing purchase items         | 400 — At least one item is required                        |
| purchase-report missing params | 400 — vendor_id, date_from and date_to are required        |

---

## Best Practices Used

### PostgreSQL Transactions

Purchase creation uses `pool.connect()` with explicit BEGIN/COMMIT/ROLLBACK.
If any line item insert fails, the entire purchase is rolled back — no orphaned
header records. Client is always released in the finally block.

### Modular architecture

Each domain (restaurant, branch, user, role, auth) is a self-contained module with routes, controller, and service. Adding a new module means adding a new folder — nothing else changes.

### Separation of concerns

| Layer      | Responsibility                                               |
| ---------- | ------------------------------------------------------------ |
| Routes     | HTTP method + path + middleware chain                        |
| Controller | Request parsing, response formatting, error forwarding       |
| Service    | All business logic and SQL queries                           |
| Middleware | Cross-cutting concerns — auth, authorization, error handling |

### Raw SQL over ORM

Using `pg` directly with parameterized queries. Full control, no magic, easy to debug, no ORM overhead. Queries are readable and explicit.

### Two-query pattern for scoped data

Instead of dynamic SQL string building, two separate clean queries — one for super admin, one for scoped access. No string interpolation risk, no SQL injection surface.

### Soft deletes everywhere

`is_active = false` instead of `DELETE`. Data is never lost. Reactivation is always possible.

### No plain text passwords

`password_hash` column never returned in any API response. All queries explicitly select only safe columns.

---

## Future Improvements

### Zod Validation

Add Zod schema validation on all request bodies for structured field-level error messages.

### Refresh Tokens

Implement token rotation — short-lived access tokens (15 min) + long-lived refresh tokens (7 days) stored in `refresh_tokens` table.

### Pagination

Add `limit` and `offset` to all list endpoints for large dataset handling.

### Menu, Orders, Inventory

Extend with menu management, order processing, inventory tracking
(stock levels per branch using raw materials and vendors), and financials.

### Audit Logs

Universal audit trail — entity_type + entity_id + action + payload for every create/update/delete.

### Inventory Ledger

Auto-deduct raw material stock when a purchase is created. Append-only ledger
entries per raw material — quantity in from purchases, quantity out from production.

### Docker

Docker Compose setup for API + PostgreSQL for consistent dev and deployment environments.

---

## Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Run compiled build
```

---

## License

ISC
