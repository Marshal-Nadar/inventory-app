import { Request, Response, NextFunction } from "express";
import * as branchService from "./branch.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await branchService.getAllBranches(
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
    const data = await branchService.getBranchesByRestaurant(
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
    const data = await branchService.getBranchById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Branch not found" });
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
    const { restaurant_id, name, address, phone } = req.body;
    if (!restaurant_id || !name) {
      res.status(400).json({
        success: false,
        message: "Restaurant ID and name are required",
      });
      return;
    }
    const data = await branchService.createBranch(
      restaurant_id,
      name,
      address,
      phone,
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
): Promise<void> => {
  try {
    const { name, address, phone } = req.body;
    const data = await branchService.updateBranch(
      Number(req.params.id),
      name,
      address,
      phone,
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Branch not found" });
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
    const data = await branchService.deleteBranch(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Branch not found" });
      return;
    }
    res.json({ success: true, message: "Branch deactivated", data });
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
    const data = await branchService.activateBranch(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Branch not found" });
      return;
    }
    res.json({ success: true, message: "Branch activated", data });
  } catch (err) {
    next(err);
  }
};
