import { Request, Response, NextFunction } from "express";
import * as preBookingService from "./preBooking.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id, branch_id, can_manage_store } =
      req.user!;
    const { status, page = "1", limit = "20" } = req.query;

    const result = await preBookingService.getAllPreBookings(
      is_super_admin,
      restaurant_id ?? 0,
      branch_id,
      can_manage_store,
      {
        status: status as string,
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
    const data = await preBookingService.getPreBookingById(
      Number(req.params.id),
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Order not found" });
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
    const { is_super_admin, restaurant_id, branch_id, id: userId } = req.user!;

    const {
      branch_id: bodyBranchId,
      restaurant_id: bodyRestaurantId,
      customer_name,
      mobile,
      email,
      delivery_address,
      items,
      subtotal,
      product_discount_total,
      overall_discount,
      final_amount,
      amount_paid,
      payment_method,
      delivery_date,
      delivery_time,
      remarks,
      notes,
    } = req.body;

    if (
      !customer_name ||
      !mobile ||
      !delivery_address ||
      !delivery_date ||
      !delivery_time
    ) {
      res.status(400).json({
        success: false,
        message:
          "customer_name, mobile, delivery_address, delivery_date and delivery_time are required",
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
      return;
    }

    const finalBranchId = is_super_admin ? bodyBranchId : branch_id;

    const finalRestaurantId = is_super_admin ? bodyRestaurantId : restaurant_id;

    if (!finalBranchId || !finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "branch_id and restaurant_id are required",
      });
      return;
    }

    const data = await preBookingService.createPreBooking(
      finalRestaurantId,
      finalBranchId,
      customer_name,
      mobile,
      email || "",
      delivery_address,
      items,
      subtotal || 0,
      product_discount_total || 0,
      overall_discount || 0,
      final_amount || 0,
      amount_paid || 0,
      payment_method || null,
      delivery_date,
      delivery_time,
      remarks || "",
      notes || "",
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const updatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = req.user!;
    const { additional_payment, payment_method, remarks } = req.body;

    if (!additional_payment || additional_payment <= 0) {
      res.status(400).json({
        success: false,
        message: "additional_payment must be greater than 0",
      });
      return;
    }

    if (!payment_method) {
      res.status(400).json({
        success: false,
        message: "payment_method is required",
      });
      return;
    }

    const data = await preBookingService.updatePreBookingPayment(
      Number(req.params.id),
      additional_payment,
      payment_method,
      remarks || "",
      userId,
    );

    res.json({ success: true, data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
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
    const data = await preBookingService.updatePreBooking(
      Number(req.params.id),
      req.body,
    );
    res.json({ success: true, data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
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
    const isAdmin = role === "admin" || is_super_admin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only admin can delete orders",
      });
      return;
    }

    const data = await preBookingService.deletePreBooking(
      Number(req.params.id),
    );

    if (!data) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, message: "Order deleted", data });
  } catch (err) {
    next(err);
  }
};

export const productReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id, role, can_manage_store } = req.user!;

    const isAllowed = is_super_admin || role === "admin" || can_manage_store;

    if (!isAllowed) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { branch_id, product_id, date_from, date_to } = req.query;

    if (!product_id || !date_from || !date_to) {
      res.status(400).json({
        success: false,
        message: "product_id, date_from and date_to are required",
      });
      return;
    }

    const data = await preBookingService.getProductReport(
      is_super_admin,
      restaurant_id ?? 0,
      {
        branch_id: branch_id ? Number(branch_id) : undefined,
        product_id: Number(product_id),
        date_from: date_from as string,
        date_to: date_to as string,
      },
    );

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
