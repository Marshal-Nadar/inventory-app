import { Router } from "express";
import * as transferRequestController from "./transferRequest.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/", authenticate, transferRequestController.getAll);
router.post("/", authenticate, transferRequestController.create);
router.patch("/:id/approve", authenticate, transferRequestController.approve);
router.patch("/:id/reject", authenticate, transferRequestController.reject);
router.get(
  "/branch-stock",
  authenticate,
  transferRequestController.branchStockView,
);

export default router;
