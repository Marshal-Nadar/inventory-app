import { Router } from "express";
import * as dailySalesController from "./dailySales.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/auto-values", authenticate, dailySalesController.getAutoValues);
router.get("/by-date", authenticate, dailySalesController.getByBranchAndDate);
router.get("/", authenticate, dailySalesController.getAll);
router.post("/", authenticate, dailySalesController.upsert);
router.delete("/:id", authenticate, dailySalesController.remove);

export default router;
