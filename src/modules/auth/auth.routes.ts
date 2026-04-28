import { Router } from "express";
import * as authController from "./auth.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.post("/login", authController.login);
router.post(
  "/impersonate/:userId",
  authenticate,
  authorize("admin"),
  authController.impersonate,
);

export default router;
