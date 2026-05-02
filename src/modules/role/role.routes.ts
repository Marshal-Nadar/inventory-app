import { Router } from "express";
import * as roleController from "./role.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  roleController.getAll,
);
router.get(
  "/restaurant/:restaurantId",
  authenticate,
  authorize("admin", "manager"),
  roleController.getByRestaurant,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  roleController.getById,
);
router.post("/", authenticate, authorize("admin"), roleController.create);
router.put("/:id", authenticate, authorize("admin"), roleController.update);
router.delete("/:id", authenticate, authorize("admin"), roleController.remove);

export default router;
