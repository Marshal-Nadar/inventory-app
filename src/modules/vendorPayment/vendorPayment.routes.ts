import { Router } from "express";
import * as vendorPaymentController from "./vendorPayment.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/summary", authenticate, vendorPaymentController.getSummary);
router.get(
  "/invoices/:vendorId",
  authenticate,
  vendorPaymentController.getInvoices,
);
router.post("/", authenticate, vendorPaymentController.createPayments);
router.get("/receipts", authenticate, vendorPaymentController.getReceipts);
router.get("/pending", authenticate, vendorPaymentController.getPending);

export default router;
