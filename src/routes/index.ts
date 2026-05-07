import { Router } from "express";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import branchRoutes from "../modules/branch/branch.routes";
import userRoutes from "../modules/user/user.routes";
import authRoutes from "../modules/auth/auth.routes";
import roleRoutes from "../modules/role/role.routes";
import rawMaterialRoutes from "../modules/rawMaterial/rawMaterial.routes";
import vendorRoutes from "../modules/vendor/vendor.routes";
import purchaseRoutes from "../modules/purchase/purchase.routes";

const router = Router();

router.use("/restaurants", restaurantRoutes);
router.use("/branches", branchRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/roles", roleRoutes);
router.use("/raw-materials", rawMaterialRoutes);
router.use("/vendors", vendorRoutes);
router.use("/purchases", purchaseRoutes);

export default router;
