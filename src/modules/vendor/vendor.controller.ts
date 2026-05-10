import { Request, Response, NextFunction } from "express";
import * as vendorService from "./vendor.service";

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
    const data = await vendorService.getAllVendors(
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
    const data = await vendorService.getVendorById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, message: "Vendor not found" });
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
        message: "You do not have permission to add vendors",
      });
      return;
    }

    const {
      name,
      phone,
      address,
      description,
      restaurant_id: bodyRestaurantId,
    } = req.body;

    if (!name || !phone) {
      res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      res.status(400).json({
        success: false,
        message: "Phone must be exactly 10 digits",
      });
      return;
    }

    const finalRestaurantId = is_super_admin ? bodyRestaurantId : restaurant_id;

    if (!finalRestaurantId) {
      res.status(400).json({
        success: false,
        message: "restaurant_id is required",
      });
      return;
    }

    const data = await vendorService.createVendor(
      finalRestaurantId,
      name,
      phone,
      address || "",
      description || "",
      userId,
    );

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "A vendor with this phone number already exists",
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
    const { role, is_super_admin } = req.user!;

    if (!hasPermission(role, is_super_admin)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to update vendors",
      });
      return;
    }

    const { name, phone, address, description } = req.body;

    if (!name || !phone) {
      res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      res.status(400).json({
        success: false,
        message: "Phone must be exactly 10 digits",
      });
      return;
    }

    const data = await vendorService.updateVendor(
      Number(req.params.id),
      name,
      phone,
      address || "",
      description || "",
    );

    if (!data) {
      res.status(404).json({ success: false, message: "Vendor not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({
        success: false,
        message: "A vendor with this phone number already exists",
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
        message: "You do not have permission to delete vendors",
      });
      return;
    }

    const data = await vendorService.deleteVendor(Number(req.params.id));

    if (!data) {
      res.status(404).json({ success: false, message: "Vendor not found" });
      return;
    }

    res.json({ success: true, message: "Vendor deleted", data });
  } catch (err) {
    next(err);
  }
};
