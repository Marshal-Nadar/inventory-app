import { Router } from "express";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import branchRoutes from "../modules/branch/branch.routes";
import userRoutes from "../modules/user/user.routes";
import authRoutes from "../modules/auth/auth.routes";
import roleRoutes from "../modules/role/role.routes";
import rawMaterialRoutes from "../modules/rawMaterial/rawMaterial.routes";
import vendorRoutes from "../modules/vendor/vendor.routes";
import purchaseRoutes from "../modules/purchase/purchase.routes";
import stockLedgerRoutes from "../modules/stockLedger/stockLedger.routes";
import transferRequestRoutes from "../modules/transferRequest/transferRequest.routes";
import vendorPaymentRoutes from "../modules/vendorPayment/vendorPayment.routes";
import expenseTypeRoutes from "../modules/expenseType/expenseType.routes";
import miscExpenseRoutes from "../modules/miscExpense/miscExpense.routes";

const router = Router();

router.use("/restaurants", restaurantRoutes);
router.use("/branches", branchRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/roles", roleRoutes);
router.use("/raw-materials", rawMaterialRoutes);
router.use("/vendors", vendorRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/stock-ledger", stockLedgerRoutes);
router.use("/transfer-requests", transferRequestRoutes);
router.use("/vendor-payments", vendorPaymentRoutes);
router.use("/expense-types", expenseTypeRoutes);
router.use("/misc-expenses", miscExpenseRoutes);

export default router;
