import { Request, Response, NextFunction } from "express";
import * as userService from "./user.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await userService.getAllUsers();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getByBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await userService.getUsersByBranch(
      Number(req.params.branchId),
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
) => {
  try {
    const data = await userService.getUserById(Number(req.params.id));
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { restaurant_id, branch_id, role_id, name, email, password } =
      req.body;
    if (
      !restaurant_id ||
      !branch_id ||
      !role_id ||
      !name ||
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const data = await userService.createUser(
      restaurant_id,
      branch_id,
      role_id,
      name,
      email,
      password,
    );
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }
    next(err);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branch_id, role_id, name, email } = req.body;
    const data = await userService.updateUser(
      Number(req.params.id),
      branch_id,
      role_id,
      name,
      email,
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await userService.deleteUser(Number(req.params.id));
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deactivated", data });
  } catch (err) {
    next(err);
  }
};
