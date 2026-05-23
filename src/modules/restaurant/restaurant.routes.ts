import { Router } from "express";
import * as restaurantController from "./restaurant.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.get("/", authenticate, authorize("admin"), restaurantController.getAll);
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  restaurantController.getById,
);
router.post("/", authenticate, authorize("admin"), restaurantController.create);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  restaurantController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  restaurantController.remove,
);
router.patch(
  "/:id/activate",
  authenticate,
  authorize("admin"),
  restaurantController.activate,
);

router.patch(
  "/:id/print-settings",
  authenticate,
  restaurantController.updatePrintSettings,
);
router.get(
  "/:id/print-settings",
  authenticate,
  restaurantController.getPrintSettings,
);

export default router;
