import { Router } from "express";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import branchRoutes from "../modules/branch/branch.routes";
import userRoutes from "../modules/user/user.routes";
import authRoutes from "../modules/auth/auth.routes";

const router = Router();

router.use("/restaurants", restaurantRoutes);
router.use("/branches", branchRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);

export default router;
