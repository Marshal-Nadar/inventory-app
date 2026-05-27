import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { getStats } from "./dashboard.controller";

const router = Router();
router.get("/stats", authenticate, getStats);
export default router;
