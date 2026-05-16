import { Router } from "express";
import * as expenseTypeController from "./expenseType.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.get("/", authenticate, expenseTypeController.getAll);
router.get("/:id", authenticate, expenseTypeController.getById);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  expenseTypeController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  expenseTypeController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  expenseTypeController.remove,
);

// subcategory routes
router.post(
  "/:id/subcategories",
  authenticate,
  authorize("admin"),
  expenseTypeController.addSubcategory,
);
router.put(
  "/:id/subcategories/:subId",
  authenticate,
  authorize("admin"),
  expenseTypeController.updateSubcategory,
);
router.delete(
  "/:id/subcategories/:subId",
  authenticate,
  authorize("admin"),
  expenseTypeController.removeSubcategory,
);

export default router;
