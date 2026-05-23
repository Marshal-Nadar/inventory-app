import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler";
import router from "./routes/index";

dotenv.config();

// ─── Validate required env vars ───────────────────────────────────
const requiredEnvVars = ["DATABASE_URL", "JWT_ACCESS_SECRET", "PORT"];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Rate limiting ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit on login endpoint
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes.",
  },
});

// ─── Middleware ───────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// ─── Apply rate limits ────────────────────────────────────────────
app.use("/api", limiter);
app.use("/api/auth/login", authLimiter); // stricter on login

// ─── Routes ───────────────────────────────────────────────────────
app.use("/api", router);

// ─── Health check ─────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── Error handler ────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
