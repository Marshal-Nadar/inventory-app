import { Request, Response, NextFunction } from "express";
import * as dailySalesService from "./dailySales.service";

export const getAutoValues = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branch_id, date } = req.query;
    if (!branch_id || !date) {
      res.status(400).json({
        success: false,
        message: "branch_id and date are required",
      });
      return;
    }
    const data = await dailySalesService.getAutoValues(
      Number(branch_id),
      date as string,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getByBranchAndDate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branch_id, date } = req.query;
    if (!branch_id || !date) {
      res.status(400).json({
        success: false,
        message: "branch_id and date are required",
      });
      return;
    }
    const data = await dailySalesService.getByBranchAndDate(
      Number(branch_id),
      date as string,
    );
    res.json({ success: true, data: data || null });
  } catch (err) {
    next(err);
  }
};

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id, can_manage_store, branch_id } =
      req.user!;
    const { branch_id: filterBranchId, date_from, date_to } = req.query;

    const data = await dailySalesService.getAllDailySales(
      is_super_admin,
      restaurant_id ?? 0,
      can_manage_store,
      branch_id,
      {
        branch_id: filterBranchId ? Number(filterBranchId) : undefined,
        date_from: date_from as string,
        date_to: date_to as string,
      },
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const upsert = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      is_super_admin,
      restaurant_id,
      branch_id,
      id: userId,
      role,
    } = req.user!;

    const {
      branch_id: bodyBranchId,
      sale_date,
      petpooja_total,
      ns_total,
      outdoor_catering,
      upi,
      cash,
      misc_expense,
      swiggy,
      zomato,
      net_sales,
      net_counter,
      difference,
    } = req.body;

    if (!sale_date) {
      res.status(400).json({
        success: false,
        message: "sale_date is required",
      });
      return;
    }

    const isAdmin = role === "admin" || is_super_admin;

    // non-admin can only submit for today
    const today = new Date().toLocaleDateString("en-CA");
    if (!isAdmin && sale_date !== today) {
      res.status(400).json({
        success: false,
        message: "You can only submit sales for today",
      });
      return;
    }

    const finalBranchId = isAdmin ? bodyBranchId || branch_id : branch_id;
    const finalRestaurantId = is_super_admin
      ? req.body.restaurant_id
      : restaurant_id;

    if (!finalBranchId || !finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "branch_id and restaurant_id are required",
      });
      return;
    }

    const data = await dailySalesService.upsertDailySales(
      finalRestaurantId,
      finalBranchId,
      sale_date,
      {
        petpooja_total: Number(petpooja_total) || 0,
        ns_total: Number(ns_total) || 0,
        outdoor_catering: Number(outdoor_catering) || 0,
        upi: Number(upi) || 0,
        cash: Number(cash) || 0,
        misc_expense: Number(misc_expense) || 0,
        swiggy: Number(swiggy) || 0,
        zomato: Number(zomato) || 0,
        net_sales: Number(net_sales) || 0,
        net_counter: Number(net_counter) || 0,
        difference: Number(difference) || 0,
      },
      userId,
    );

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
    const { role, is_super_admin } = req.user!;
    const isAdmin = role === "admin" || is_super_admin;
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only admin can delete sales records",
      });
      return;
    }
    const data = await dailySalesService.deleteDailySales(
      Number(req.params.id),
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
    res.json({ success: true, message: "Deleted", data });
  } catch (err) {
    next(err);
  }
};
