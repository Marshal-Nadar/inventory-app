import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
// import { getStats, getSuperAdminStats } from "./dashboard.controller";
import * as dashboardController from "./dashboard.controller";

const router = Router();
router.get("/stats", authenticate, dashboardController.getStats);
router.get(
  "/super-admin",
  authenticate,
  dashboardController.getSuperAdminStats,
);
export default router;
