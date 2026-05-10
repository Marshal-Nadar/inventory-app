import { Router } from "express";
import * as stockLedgerController from "./stockLedger.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/", authenticate, stockLedgerController.getByRestaurant);
router.get(
  "/:rawMaterialId",
  authenticate,
  stockLedgerController.getByRawMaterial,
);

export default router;
