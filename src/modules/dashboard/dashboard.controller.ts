import { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service";

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id, branch_id, can_manage_store } =
      req.user!;

    const data = await dashboardService.getDashboardStats(
      is_super_admin,
      restaurant_id ?? 0,
      branch_id,
      can_manage_store,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSuperAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin } = req.user!;
    if (!is_super_admin) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }
    const data = await dashboardService.getSuperAdminStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
