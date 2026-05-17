import { Router } from "express";
import * as productController from "./product.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/", authenticate, productController.getAll);
router.post("/", authenticate, productController.create);
router.put("/:id", authenticate, productController.update);
router.delete("/:id", authenticate, productController.remove);

export default router;
