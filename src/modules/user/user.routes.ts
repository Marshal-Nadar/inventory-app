import { Router } from "express";
import * as userController from "./user.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  userController.getAll,
);
router.get(
  "/branch/:branchId",
  authenticate,
  authorize("admin", "manager"),
  userController.getByBranch,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  userController.getById,
);
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  userController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  userController.update,
);
router.delete("/:id", authenticate, authorize("admin"), userController.remove);

export default router;
