import { Request, Response, NextFunction } from "express";
import * as vendorPaymentService from "./vendorPayment.service";

const PERMITTED_ROLES = ["admin", "manager", "storekeeper"];

const hasPermission = (role: string, isSuperAdmin: boolean): boolean => {
  if (isSuperAdmin) return true;
  return PERMITTED_ROLES.includes(role);
};

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await vendorPaymentService.getVendorPaymentSummary(
      is_super_admin,
      restaurant_id ?? 0,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await vendorPaymentService.getVendorInvoices(
      Number(req.params.vendorId),
      restaurant_id ?? 0,
      is_super_admin,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin, restaurant_id, id: userId } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to record payments",
      });
      return;
    }

    const { vendor_id, payments } = req.body;

    if (!vendor_id) {
      res.status(400).json({
        success: false,
        message: "vendor_id is required",
      });
      return;
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one payment is required",
      });
      return;
    }

    const validPayments = payments.filter(
      (p) => p.amount && Number(p.amount) > 0,
    );

    if (validPayments.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one payment amount must be greater than 0",
      });
      return;
    }

    for (const p of validPayments) {
      if (!p.payment_mode) {
        res.status(400).json({
          success: false,
          message: "Payment mode is required for all payments",
        });
        return;
      }
    }

    const data = await vendorPaymentService.createPayments(
      restaurant_id ?? 0,
      vendor_id,
      validPayments,
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({
        success: false,
        message: err.message,
      });
      return;
    }
    next(err);
  }
};

export const getReceipts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const { vendor_id, date_from, date_to, payment_mode } = req.query;

    const data = await vendorPaymentService.getPaymentReceipts(
      is_super_admin,
      restaurant_id ?? 0,
      {
        vendor_id: vendor_id ? Number(vendor_id) : undefined,
        date_from: date_from as string,
        date_to: date_to as string,
        payment_mode: payment_mode as string,
      },
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPending = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const { vendor_id } = req.query;

    const data = await vendorPaymentService.getPendingPayments(
      is_super_admin,
      restaurant_id ?? 0,
      vendor_id ? Number(vendor_id) : undefined,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
