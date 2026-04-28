# Restaurant Management API

A modular, scalable REST API for managing multi-branch restaurant operations — built with Node.js, Express, TypeScript, and PostgreSQL.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Installation Steps](#installation-steps)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [API Endpoints](#api-endpoints)
7. [Authentication](#authentication)
8. [Error Handling](#error-handling)
9. [Best Practices Used](#best-practices-used)
10. [Future Improvements](#future-improvements)

---

## Project Overview

The Restaurant Management API is a backend system designed to handle the core operations of a multi-restaurant, multi-branch food business. It supports organization setup, user management, role-based access, and authentication — with a clean, modular architecture that makes it easy to extend.

### What it does

- Manage multiple restaurants and their branches
- Create and manage users assigned to specific branches and roles
- Authenticate users securely using bcrypt password hashing and JWT
- Allow admin to impersonate other users for support operations
- Provide a structured, RESTful API for frontend consumption

### Tech Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Runtime          | Node.js               |
| Framework        | Express.js v4         |
| Language         | TypeScript            |
| Database         | PostgreSQL            |
| ORM / Query      | pg (node-postgres)    |
| Authentication   | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs              |
| Validation       | Zod                   |
| Dev Tools        | ts-node, nodemon      |

---

## Project Structure

```
restaurant-api/
├── src/
│   ├── config/
│   │   └── db.ts                  # PostgreSQL connection pool
│   ├── middlewares/
│   │   └── errorHandler.ts        # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts # Login and impersonate handlers
│   │   │   ├── auth.routes.ts     # Auth route definitions
│   │   │   └── auth.service.ts    # Auth business logic
│   │   ├── branch/
│   │   │   ├── branch.controller.ts
│   │   │   ├── branch.routes.ts
│   │   │   └── branch.service.ts
│   │   ├── restaurant/
│   │   │   ├── restaurant.controller.ts
│   │   │   ├── restaurant.routes.ts
│   │   │   └── restaurant.service.ts
│   │   └── user/
│   │       ├── user.controller.ts
│   │       ├── user.routes.ts
│   │       └── user.service.ts
│   ├── routes/
│   │   └── index.ts               # Root router — mounts all modules
│   └── app.ts                     # Express app entry point
├── src/db/
│   ├── migrations/
│   │   └── 001_init_org_auth.sql  # Initial schema — all tables
│   └── seeds/
│       └── 001_roles.sql          # Default roles seed data
├── .env                           # Environment variables (not committed)
├── nodemon.json                   # Nodemon watch config
├── tsconfig.json                  # TypeScript compiler config
└── package.json
```

### Folder Responsibilities

- **config/** — database connection and environment setup
- **modules/** — each feature (restaurant, branch, user, auth) is self-contained with its own routes, controller, and service
- **middlewares/** — shared middleware like global error handling
- **routes/index.ts** — single entry point that registers all module routes under `/api`

---

## Installation Steps

### Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- npm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/restaurant-api.git
cd restaurant-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
# edit .env with your values
```

### 4. Set up the database

```bash
# create the database
psql -U postgres -c "CREATE DATABASE restaurant_db;"

# run the migration
psql -U postgres -h 127.0.0.1 -d restaurant_db -f src/db/migrations/001_init_org_auth.sql

# seed default roles
psql -U postgres -h 127.0.0.1 -d restaurant_db -f src/db/seeds/001_roles.sql
```

### 5. Run the project

```bash
# development
npm run dev

# production build
npm run build
npm start
```

Server runs on `http://localhost:3001` by default.

---

## Environment Variables

Create a `.env` file in the root of the project:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/restaurant_db

# Server port
PORT=3001

# JWT secret for signing access tokens
JWT_ACCESS_SECRET=your_super_secret_key_here
```

| Variable            | Description                                   |
| ------------------- | --------------------------------------------- |
| `DATABASE_URL`      | Full PostgreSQL connection string             |
| `PORT`              | Port the Express server listens on            |
| `JWT_ACCESS_SECRET` | Secret key used to sign and verify JWT tokens |

> **Note:** Never commit your `.env` file to Git. Add it to `.gitignore`.

---

## Database Setup

### Tables

The database consists of 4 core tables:

```
restaurants   — top-level tenant (each restaurant is isolated)
branches      — branches belonging to a restaurant
roles         — roles defined per restaurant (admin, manager, cashier, kitchen)
users         — users assigned to a branch with a role
```

### Schema Overview

```sql
restaurants
  id, name, slug, timezone, is_active, created_at, updated_at

branches
  id, restaurant_id, name, address, phone, is_active, created_at, updated_at

roles
  id, restaurant_id, name, description, created_at

users
  id, restaurant_id, branch_id, role_id, name, email, password_hash, is_active, created_at, updated_at
```

### Default Roles (seeded)

| Role      | Description                  |
| --------- | ---------------------------- |
| `admin`   | Full access to everything    |
| `manager` | Manage branch operations     |
| `cashier` | Handle orders and payments   |
| `kitchen` | View and update order status |

### Connection

The database connection is managed via a `pg.Pool` in `src/config/db.ts`. The pool reuses connections efficiently and logs errors to the console.

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

---

## API Endpoints

Base URL: `http://localhost:3001/api`

### Health Check

| Method | Route     | Description                |
| ------ | --------- | -------------------------- |
| GET    | `/health` | Check if server is running |

### Restaurants

| Method | Route                  | Description                |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/restaurants`     | Get all active restaurants |
| GET    | `/api/restaurants/:id` | Get a restaurant by ID     |
| POST   | `/api/restaurants`     | Create a new restaurant    |
| PUT    | `/api/restaurants/:id` | Update a restaurant        |
| DELETE | `/api/restaurants/:id` | Soft delete a restaurant   |

**POST /api/restaurants — request body:**

```json
{
  "name": "Max Restaurant",
  "slug": "max-restaurant",
  "timezone": "Asia/Kolkata"
}
```

### Branches

| Method | Route                                    | Description                |
| ------ | ---------------------------------------- | -------------------------- |
| GET    | `/api/branches`                          | Get all active branches    |
| GET    | `/api/branches/:id`                      | Get a branch by ID         |
| GET    | `/api/branches/restaurant/:restaurantId` | Get branches by restaurant |
| POST   | `/api/branches`                          | Create a new branch        |
| PUT    | `/api/branches/:id`                      | Update a branch            |
| DELETE | `/api/branches/:id`                      | Soft delete a branch       |

**POST /api/branches — request body:**

```json
{
  "restaurant_id": 1,
  "name": "Andheri Branch",
  "address": "Shop 4, Andheri West, Mumbai",
  "phone": "9876543210"
}
```

### Users

| Method | Route                         | Description          |
| ------ | ----------------------------- | -------------------- |
| GET    | `/api/users`                  | Get all active users |
| GET    | `/api/users/:id`              | Get a user by ID     |
| GET    | `/api/users/branch/:branchId` | Get users by branch  |
| POST   | `/api/users`                  | Create a new user    |
| PUT    | `/api/users/:id`              | Update a user        |
| DELETE | `/api/users/:id`              | Soft delete a user   |

**POST /api/users — request body:**

```json
{
  "restaurant_id": 1,
  "branch_id": 1,
  "role_id": 1,
  "name": "Tamil Selvan",
  "email": "tamil@max.com",
  "password": "Password@123"
}
```

### Auth

| Method | Route                           | Description                   |
| ------ | ------------------------------- | ----------------------------- |
| POST   | `/api/auth/login`               | Login with email and password |
| POST   | `/api/auth/impersonate/:userId` | Admin logs in as another user |

**POST /api/auth/login — request body:**

```json
{
  "email": "tamil@max.com",
  "password": "Password@123"
}
```

**POST /api/auth/impersonate/:userId — request body:**

```json
{
  "requesting_user_id": 1
}
```

---

## Authentication

### Password Hashing

Passwords are never stored as plain text. When a user is created, the password is hashed using **bcryptjs** with a salt round of 10:

```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

Bcrypt is a one-way hashing algorithm — it cannot be reversed or decrypted. This is intentional and is the industry standard for password storage.

### Login Flow

1. User sends `email` and `password` to `POST /api/auth/login`
2. API looks up the user by email
3. bcrypt compares the submitted password against the stored hash
4. If matched, a JWT access token is generated and returned
5. The token contains the user's `id`, `email`, `role`, `branch_id`, and `restaurant_id`
6. The token expires in `1 day`

```typescript
const token = jwt.sign(
  { id, email, role, branch_id, restaurant_id },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: "1d" },
);
```

### Impersonation

Admin can generate a token for any other user without knowing their password. This is used for support operations. The token includes `impersonated: true` and `impersonated_by: adminId` for audit purposes. Only users with the `admin` role can use this feature.

---

## Error Handling

All errors flow through a centralized global error handler in `src/middlewares/errorHandler.ts`:

```typescript
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ success: false, message });
};
```

### Error response format

All error responses follow this consistent structure:

```json
{
  "success": false,
  "message": "Description of what went wrong"
}
```

### Common error codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 400  | Bad request — missing or invalid fields |
| 401  | Unauthorized — wrong credentials        |
| 403  | Forbidden — insufficient permissions    |
| 404  | Not found — resource does not exist     |
| 500  | Internal server error                   |

### Duplicate email handling

PostgreSQL unique constraint violations (error code `23505`) are caught in the user controller and returned as a clean 400 response:

```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

## Best Practices Used

### Modular Architecture

Each feature domain (restaurant, branch, user, auth) lives in its own folder with three dedicated files — routes, controller, and service. Adding a new feature means adding a new folder, nothing else changes.

### Separation of Concerns

| Layer      | Responsibility                            |
| ---------- | ----------------------------------------- |
| Routes     | Define endpoints and HTTP methods         |
| Controller | Handle request/response, input validation |
| Service    | Business logic and database queries       |
| Config     | Database connection and environment       |

### Soft Deletes

Records are never hard deleted from the database. Instead, `is_active` is set to `false`. This preserves data integrity and allows recovery.

### No Plain Text Passwords

Passwords are always hashed with bcrypt before storage. The `password_hash` column is never returned in any API response — only `id`, `name`, `email`, and role info are exposed.

### Consistent API Response Format

Every response — success or error — follows the same structure:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Future Improvements

### JWT Middleware

Add an `authenticate` middleware that validates the JWT token on protected routes before the request reaches the controller.

### Role-Based Access Control

Add an `authorize` middleware that checks the user's role from the token and restricts access to certain routes — for example, only `admin` and `manager` can create users.

### Zod Validation

Add Zod schema validation on all request bodies in the controller layer to return structured validation errors instead of raw database errors.

### Refresh Tokens

Add a `refresh_tokens` table to support long-lived sessions with short-lived access tokens and secure token rotation on logout.

### Pagination

Add `limit` and `offset` query parameters to all list endpoints to handle large datasets efficiently.

### Menu, Orders, Inventory

Extend the system with additional modules for menu management, order processing, inventory tracking, and financial reporting.

### Docker

Containerize the API and PostgreSQL database with Docker Compose for consistent local development and deployment.

---

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run compiled production build
```

---

## License

ISC
