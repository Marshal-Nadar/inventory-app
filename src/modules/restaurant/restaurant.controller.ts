import { Request, Response, NextFunction } from "express";
import * as restaurantService from "./restaurant.service";
import pool from "../../config/db";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin } = req.user!;
    const data = await restaurantService.getAllRestaurants(is_super_admin);
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
    const data = await restaurantService.getRestaurantById(
      Number(req.params.id),
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
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
    const { name, slug, timezone } = req.body;
    if (!name || !slug) {
      return res
        .status(400)
        .json({ success: false, message: "Name and slug are required" });
    }
    const data = await restaurantService.createRestaurant(
      name,
      slug,
      timezone || "Asia/Kolkata",
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
) => {
  try {
    const {
      name,
      slug,
      timezone,
      print_company_name,
      print_address,
      print_contact,
      print_footer_note,
    } = req.body;

    const data = await restaurantService.updateRestaurant(
      Number(req.params.id),
      {
        name,
        slug,
        timezone,
        print_company_name,
        print_address,
        print_contact,
        print_footer_note,
      },
    );

    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });

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
    const data = await restaurantService.deleteRestaurant(
      Number(req.params.id),
    );
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, message: "Restaurant deactivated", data });
  } catch (err) {
    next(err);
  }
};

export const activate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await restaurantService.activateRestaurant(
      Number(req.params.id),
    );
    if (!data) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    res.json({ success: true, message: "Restaurant activated", data });
  } catch (err) {
    next(err);
  }
};

export const getPrintSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT
         id, name,
         COALESCE(print_company_name, name) AS print_company_name,
         print_address,
         print_contact,
         print_footer_note
       FROM restaurants
       WHERE id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updatePrintSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, is_super_admin, restaurant_id } = req.user!;
    const isAdmin = role === "admin" || is_super_admin;
    if (!isAdmin) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const {
      print_company_name,
      print_address,
      print_contact,
      print_footer_note,
    } = req.body;

    const result = await pool.query(
      `UPDATE restaurants SET
         print_company_name = $1,
         print_address = $2,
         print_contact = $3,
         print_footer_note = $4
       WHERE id = $5
       RETURNING id, name,
         COALESCE(print_company_name, name) AS print_company_name,
         print_address, print_contact, print_footer_note`,
      [
        print_company_name || null,
        print_address || null,
        print_contact || null,
        print_footer_note || null,
        req.params.id,
      ],
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
