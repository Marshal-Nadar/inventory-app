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
