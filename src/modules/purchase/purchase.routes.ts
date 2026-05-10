import { Router } from "express";
import * as purchaseController from "./purchase.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/purchase-report", authenticate, purchaseController.purchaseReport);
router.get("/stock-summary", authenticate, purchaseController.stockSummary);
router.get("/", authenticate, purchaseController.getAll);
router.get("/:id", authenticate, purchaseController.getById);
router.post("/", authenticate, purchaseController.create);
router.put("/:id", authenticate, purchaseController.update);
router.delete("/:id", authenticate, purchaseController.remove);

export default router;
