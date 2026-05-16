import { Router } from "express";
import * as miscExpenseController from "./miscExpense.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/", authenticate, miscExpenseController.getAll);
router.post("/", authenticate, miscExpenseController.create);
router.delete("/:id", authenticate, miscExpenseController.remove);

export default router;
