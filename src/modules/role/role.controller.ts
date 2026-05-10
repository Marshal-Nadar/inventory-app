import { Request, Response, NextFunction } from "express";
import * as roleService from "./role.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await roleService.getAllRoles(
      is_super_admin,
      restaurant_id ?? 0,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getByRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await roleService.getRolesByRestaurant(
      Number(req.params.restaurantId),
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
    const data = await roleService.getRoleById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Role not found" });
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
    const { restaurant_id, name, description } = req.body;
    if (!restaurant_id || !name) {
      res.status(400).json({
        success: false,
        message: "restaurant_id and name are required",
      });
      return;
    }
    const data = await roleService.createRole(restaurant_id, name, description);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Role name already exists for this restaurant",
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
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const data = await roleService.updateRole(
      Number(req.params.id),
      name,
      description,
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await roleService.deleteRole(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    res.json({ success: true, message: "Role deleted", data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
