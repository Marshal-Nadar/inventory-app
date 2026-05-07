import { Router } from "express";
import * as rawMaterialController from "./rawMaterial.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

// authenticate on all routes
// permission check is handled inside controller
// so any logged in user can view, but only permitted roles can mutate

router.get("/", authenticate, rawMaterialController.getAll);
router.get("/:id", authenticate, rawMaterialController.getById);
router.post("/", authenticate, rawMaterialController.create);
router.put("/:id", authenticate, rawMaterialController.update);
router.delete("/:id", authenticate, rawMaterialController.remove);

export default router;
