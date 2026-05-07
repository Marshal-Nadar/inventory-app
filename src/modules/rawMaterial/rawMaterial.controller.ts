import { Request, Response, NextFunction } from "express";
import * as rawMaterialService from "./rawMaterial.service";

// flexible roles check — add any future role here
const PERMITTED_ROLES = ["admin", "manager", "supervisor"];

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
    const data = await rawMaterialService.getAllRawMaterials(
      is_super_admin,
      restaurant_id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await rawMaterialService.getRawMaterialById(
      Number(req.params.id),
    );
    if (!data) {
      res
        .status(404)
        .json({ success: false, message: "Raw material not found" });
      return;
    }
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
        message: "You do not have permission to add raw materials",
      });
      return;
    }

    const { items, restaurant_id: bodyRestaurantId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Items array is required",
      });
      return;
    }

    // validate each item
    for (const item of items) {
      if (!item.category || !item.name || !item.metric) {
        res.status(400).json({
          success: false,
          message: "Each item must have category, name and metric",
        });
        return;
      }
    }

    const finalRestaurantId = is_super_admin ? bodyRestaurantId : restaurant_id;

    if (!finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "restaurant_id is required",
      });
      return;
    }

    const data = await rawMaterialService.createRawMaterials(
      items,
      finalRestaurantId,
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message:
          "One or more raw material names already exist for this restaurant",
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
        message: "You do not have permission to update raw materials",
      });
      return;
    }

    const { category, name, metric } = req.body;

    if (!category || !name || !metric) {
      res.status(400).json({
        success: false,
        message: "Category, name and metric are required",
      });
      return;
    }

    const data = await rawMaterialService.updateRawMaterial(
      Number(req.params.id),
      category,
      name,
      metric,
    );

    if (!data) {
      res
        .status(404)
        .json({ success: false, message: "Raw material not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "A raw material with this name already exists",
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
        message: "You do not have permission to delete raw materials",
      });
      return;
    }

    const data = await rawMaterialService.deleteRawMaterial(
      Number(req.params.id),
    );

    if (!data) {
      res
        .status(404)
        .json({ success: false, message: "Raw material not found" });
      return;
    }

    res.json({ success: true, message: "Raw material deleted", data });
  } catch (err) {
    next(err);
  }
};
