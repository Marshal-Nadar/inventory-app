import { Request, Response, NextFunction } from "express";
import * as restaurantService from "./restaurant.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin } = req.user!;
    const data = await restaurantService.getAllRestaurants(is_super_admin);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await restaurantService.getRestaurantById(
      Number(req.params.id),
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug, timezone } = req.body;
    if (!name || !slug) {
      return res
        .status(400)
        .json({ success: false, message: "Name and slug are required" });
    }
    const data = await restaurantService.createRestaurant(
      name,
      slug,
      timezone || "Asia/Kolkata",
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug, timezone } = req.body;
    const data = await restaurantService.updateRestaurant(
      Number(req.params.id),
      name,
      slug,
      timezone,
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await restaurantService.deleteRestaurant(
      Number(req.params.id),
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, message: "Restaurant deactivated", data });
  } catch (err) {
    next(err);
  }
};

export const activate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await restaurantService.activateRestaurant(
      Number(req.params.id),
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    res.json({ success: true, message: "Restaurant activated", data });
  } catch (err) {
    next(err);
  }
};
