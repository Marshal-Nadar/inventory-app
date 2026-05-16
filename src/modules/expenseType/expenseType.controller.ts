import { Request, Response, NextFunction } from "express";
import * as expenseTypeService from "./expenseType.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await expenseTypeService.getAllExpenseTypes(
      is_super_admin,
      restaurant_id ?? 0,
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
    const data = await expenseTypeService.getExpenseTypeById(
      Number(req.params.id),
    );
    if (!data) {
      res
        .status(404)
        .json({ success: false, message: "Expense type not found" });
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
    const { is_super_admin, restaurant_id } = req.user!;
    const {
      name,
      has_subcategory,
      subcategories,
      restaurant_id: bodyRestaurantId,
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    const finalRestaurantId = is_super_admin ? bodyRestaurantId : restaurant_id;

    if (!finalRestaurantId) {
      res
        .status(400)
        .json({ success: false, message: "restaurant_id is required" });
      return;
    }

    const data = await expenseTypeService.createExpenseType(
      finalRestaurantId,
      name,
      has_subcategory || false,
      subcategories || [],
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Expense type with this name already exists",
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
    const { name, has_subcategory } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const data = await expenseTypeService.updateExpenseType(
      Number(req.params.id),
      name,
      has_subcategory || false,
    );
    if (!data) {
      res
        .status(404)
        .json({ success: false, message: "Expense type not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Expense type with this name already exists",
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
    const data = await expenseTypeService.deleteExpenseType(
      Number(req.params.id),
    );
    res.json({ success: true, message: "Expense type deleted", data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const addSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const data = await expenseTypeService.addSubcategory(
      Number(req.params.id),
      name,
    );
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Subcategory already exists",
      });
      return;
    }
    next(err);
  }
};

export const updateSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const data = await expenseTypeService.updateSubcategory(
      Number(req.params.subId),
      name,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const removeSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await expenseTypeService.deleteSubcategory(
      Number(req.params.subId),
    );
    res.json({ success: true, message: "Subcategory deleted", data });
  } catch (err) {
    next(err);
  }
};
