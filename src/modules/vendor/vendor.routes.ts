import { Router } from "express";
import * as vendorController from "./vendor.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/", authenticate, vendorController.getAll);
router.get("/:id", authenticate, vendorController.getById);
router.post("/", authenticate, vendorController.create);
router.put("/:id", authenticate, vendorController.update);
router.delete("/:id", authenticate, vendorController.remove);

export default router;
