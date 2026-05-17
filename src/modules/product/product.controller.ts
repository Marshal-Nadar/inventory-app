import { Request, Response, NextFunction } from "express";
import * as productService from "./product.service";

const PERMITTED_ROLES = ["admin", "storekeeper"];

const hasPermission = (role: string, isSuperAdmin: boolean): boolean => {
  if (isSuperAdmin) return true;
  return PERMITTED_ROLES.includes(role);
};

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await productService.getAllProducts(
      is_super_admin,
      restaurant_id ?? 0,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin, restaurant_id, id: userId } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to create products",
      });
      return;
    }

    const {
      name,
      price,
      is_active,
      restaurant_id: bodyRestaurantId,
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "name and price are required",
      });
      return;
    }

    if (price <= 0) {
      res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
      return;
    }

    const finalRestaurantId = is_super_admin ? bodyRestaurantId : restaurant_id;

    if (!finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "restaurant_id is required",
      });
      return;
    }

    const data = await productService.createProduct(
      finalRestaurantId,
      name,
      price,
      is_active ?? true,
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      });
      return;
    }
    next(err);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to update products",
      });
      return;
    }

    const { name, price, is_active } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "name and price are required",
      });
      return;
    }

    if (price <= 0) {
      res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
      return;
    }

    const data = await productService.updateProduct(
      Number(req.params.id),
      name,
      price,
      is_active ?? true,
    );

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      });
      return;
    }
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to delete products",
      });
      return;
    }

    const data = await productService.deleteProduct(Number(req.params.id));

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.json({ success: true, message: "Product deleted", data });
  } catch (err) {
    next(err);
  }
};
