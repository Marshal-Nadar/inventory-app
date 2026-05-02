import { Router } from "express";
import * as branchController from "./branch.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  branchController.getAll,
);
router.get(
  "/restaurant/:restaurantId",
  authenticate,
  authorize("admin", "manager"),
  branchController.getByRestaurant,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  branchController.getById,
);
router.post("/", authenticate, authorize("admin"), branchController.create);
router.put("/:id", authenticate, authorize("admin"), branchController.update);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  branchController.remove,
);
router.patch(
  "/:id/activate",
  authenticate,
  authorize("admin"),
  branchController.activate,
);

export default router;
