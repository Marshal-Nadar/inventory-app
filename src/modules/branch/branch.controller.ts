import { Request, Response, NextFunction } from "express";
import * as branchService from "./branch.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await branchService.getAllBranches();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getByRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
) => {
  try {
    const data = await branchService.getBranchById(Number(req.params.id));
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
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
    const { restaurant_id, name, address, phone } = req.body;
    if (!restaurant_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID and name are required",
      });
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
) => {
  try {
    const { name, address, phone } = req.body;
    const data = await branchService.updateBranch(
      Number(req.params.id),
      name,
      address,
      phone,
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
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
    const data = await branchService.deleteBranch(Number(req.params.id));
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.json({ success: true, message: "Branch deactivated", data });
  } catch (err) {
    next(err);
  }
};
