import { Router } from "express";
import * as preBookingController from "./preBooking.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/product-report", authenticate, preBookingController.productReport);
router.get("/", authenticate, preBookingController.getAll);
router.get("/:id", authenticate, preBookingController.getById);
router.post("/", authenticate, preBookingController.create);
router.patch("/:id/payment", authenticate, preBookingController.updatePayment);
router.put("/:id", authenticate, preBookingController.update);
router.delete("/:id", authenticate, preBookingController.remove);

export default router;
