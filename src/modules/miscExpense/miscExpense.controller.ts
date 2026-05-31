import { Request, Response, NextFunction } from "express";
import * as miscExpenseService from "./miscExpense.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id, branch_id, can_manage_store } =
      req.user!;
    const { date, page = "1", limit = "20" } = req.query;

    const result = await miscExpenseService.getAllMiscExpenses(
      is_super_admin,
      restaurant_id ?? 0,
      branch_id,
      can_manage_store,
      {
        date: date as string,
        page: Number(page),
        limit: Number(limit),
      },
    );

    res.json({ success: true, ...result });
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
    const {
      role,
      is_super_admin,
      restaurant_id,
      branch_id,
      id: userId,
    } = req.user!;

    const {
      expense_type_id,
      subcategory_id,
      amount,
      payment_method,
      expense_date,
      notes,
      branch_id: bodyBranchId,
    } = req.body;

    if (!expense_type_id || !amount || !payment_method || !expense_date) {
      res.status(400).json({
        success: false,
        message:
          "expense_type_id, amount, payment_method and expense_date are required",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
      return;
    }

    // date restriction — non-admin can only use today
    const isAdmin = role === "admin" || is_super_admin;
    const today = new Date().toISOString().split("T")[0];

    if (!isAdmin && expense_date !== today) {
      res.status(400).json({
        success: false,
        message: "You can only add expenses for today",
      });
      return;
    }

    // branch — admin can pass body branch_id, others use their own
    const finalBranchId = isAdmin ? bodyBranchId || branch_id : branch_id;

    if (!finalBranchId) {
      res.status(400).json({
        success: false,
        message: "branch_id is required",
      });
      return;
    }

    const finalRestaurantId = is_super_admin
      ? req.body.restaurant_id
      : restaurant_id;

    if (!finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "restaurant_id is required",
      });
      return;
    }

    const data = await miscExpenseService.createMiscExpense(
      finalRestaurantId,
      finalBranchId,
      expense_type_id,
      subcategory_id || null,
      amount,
      payment_method,
      expense_date,
      notes || "",
      userId,
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
    const { role, is_super_admin } = req.user!;
    const isAdmin = role === "admin" || is_super_admin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only admin can edit expenses",
      });
      return;
    }

    const {
      expense_type_id,
      subcategory_id,
      amount,
      payment_method,
      expense_date,
      notes,
    } = req.body;

    if (!expense_type_id || !amount || !payment_method || !expense_date) {
      res.status(400).json({
        success: false,
        message:
          "expense_type_id, amount, payment_method and expense_date are required",
      });
      return;
    }

    const data = await miscExpenseService.updateMiscExpense(
      Number(req.params.id),
      expense_type_id,
      subcategory_id || null,
      amount,
      payment_method,
      expense_date,
      notes || "",
    );

    if (!data) {
      res.status(404).json({ success: false, message: "Expense not found" });
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
    const { role, is_super_admin } = req.user!;
    const isAdmin = role === "admin" || is_super_admin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only admin can delete expenses",
      });
      return;
    }

    const data = await miscExpenseService.deleteMiscExpense(
      Number(req.params.id),
    );

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Expense not found",
      });
      return;
    }

    res.json({ success: true, message: "Expense deleted", data });
  } catch (err) {
    next(err);
  }
};

export const getReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin, restaurant_id, can_manage_store } = req.user!;

    const isAllowed = is_super_admin || role === "admin" || can_manage_store;

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    const { date_from, date_to, branch_id, payment_method } = req.query;

    if (!date_from || !date_to) {
      res.status(400).json({
        success: false,
        message: "date_from and date_to are required",
      });
      return;
    }

    const data = await miscExpenseService.getMiscExpenseReport(
      is_super_admin,
      restaurant_id ?? 0,
      {
        date_from: date_from as string,
        date_to: date_to as string,
        branch_id: branch_id ? Number(branch_id) : undefined,
        payment_method: payment_method as string | undefined,
      },
    );

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
