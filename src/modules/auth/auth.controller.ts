import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
      return;
    }
    const data = await authService.login(email, password);
    res.json({ success: true, data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const impersonate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requesting_user_id } = req.body;
    const targetUserId = Number(req.params.userId);

    if (!requesting_user_id) {
      res
        .status(400)
        .json({ success: false, message: "requesting_user_id is required" });
      return;
    }

    const data = await authService.impersonate(
      requesting_user_id,
      targetUserId,
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

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = req.user!;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
      return;
    }

    if (new_password === current_password) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const data = await authService.changePassword(
      userId,
      current_password,
      new_password,
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

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: adminId, role, is_super_admin, restaurant_id } = req.user!;

    const isAdmin = role === "admin" || is_super_admin;
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only admin can reset passwords",
      });
      return;
    }

    const { new_password, confirm_password } = req.body;
    const targetUserId = Number(req.params.userId);

    if (!new_password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: "new_password and confirm_password are required",
      });
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
      return;
    }

    const data = await authService.resetPassword(
      adminId,
      targetUserId,
      new_password,
      is_super_admin,
      restaurant_id ?? 0,
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
