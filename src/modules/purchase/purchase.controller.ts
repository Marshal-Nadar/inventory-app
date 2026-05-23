import { Request, Response, NextFunction } from "express";
import * as purchaseService from "./purchase.service";

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
    const {
      vendor_id,
      invoice_number,
      date_from,
      date_to,
      page = "1",
      limit = "20",
    } = req.query;

    const result = await purchaseService.getAllPurchases(
      is_super_admin,
      restaurant_id ?? 0,
      {
        vendor_id: vendor_id ? Number(vendor_id) : undefined,
        invoice_number: invoice_number as string,
        date_from: date_from as string,
        date_to: date_to as string,
        page: Number(page),
        limit: Number(limit),
      },
    );

    res.json({ success: true, ...result });
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
    const data = await purchaseService.getPurchaseById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Purchase not found" });
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
        message: "You do not have permission to create purchases",
      });
      return;
    }

    const {
      vendor_id,
      invoice_number,
      purchase_date,
      notes,
      items,
      restaurant_id: bodyRestaurantId,
    } = req.body;

    if (!vendor_id || !invoice_number || !purchase_date) {
      res.status(400).json({
        success: false,
        message: "vendor_id, invoice_number and purchase_date are required",
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
      return;
    }

    for (const item of items) {
      if (
        !item.raw_material_id ||
        !item.quantity ||
        !item.metric ||
        !item.price_per_unit
      ) {
        res.status(400).json({
          success: false,
          message:
            "Each item must have raw_material_id, quantity, metric and price_per_unit",
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

    const data = await purchaseService.createPurchase(
      finalRestaurantId,
      vendor_id,
      invoice_number,
      purchase_date,
      notes || "",
      items,
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Invoice number already exists for this restaurant",
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
        message: "You do not have permission to delete purchases",
      });
      return;
    }

    const data = await purchaseService.deletePurchase(Number(req.params.id));

    if (!data) {
      res.status(404).json({ success: false, message: "Purchase not found" });
      return;
    }

    res.json({ success: true, message: "Purchase deleted", data });
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
    const { role, is_super_admin, restaurant_id, id: userId } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to update purchases",
      });
      return;
    }

    const { vendor_id, invoice_number, purchase_date, notes, items } = req.body;

    if (!vendor_id || !invoice_number || !purchase_date) {
      res.status(400).json({
        success: false,
        message: "vendor_id, invoice_number and purchase_date are required",
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
      return;
    }

    const data = await purchaseService.updatePurchase(
      Number(req.params.id),
      restaurant_id ?? 0,
      vendor_id,
      invoice_number,
      purchase_date,
      notes || "",
      items,
      userId,
    );

    res.json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Invoice number already exists for this restaurant",
      });
      return;
    }
    next(err);
  }
};

export const purchaseReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const { vendor_id, date_from, date_to } = req.query;

    if (!vendor_id || !date_from || !date_to) {
      res.status(400).json({
        success: false,
        message: "vendor_id, date_from and date_to are required",
      });
      return;
    }

    // Optional: Basic date validation
    if (new Date(date_from as string) > new Date(date_to as string)) {
      res.status(400).json({
        success: false,
        message: "date_from cannot be after date_to",
      });
      return;
    }

    const data = await purchaseService.getPurchaseReport(
      restaurant_id || 0,
      is_super_admin,
      Number(vendor_id),
      date_from as string,
      date_to as string,
    );

    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Vendor Report Error:", err);
    next(err);
  }
};

export const stockSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await purchaseService.getStockSummary(
      is_super_admin,
      restaurant_id ?? 0,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
