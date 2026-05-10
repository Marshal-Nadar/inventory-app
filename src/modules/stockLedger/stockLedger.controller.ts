import { Request, Response, NextFunction } from "express";
import * as stockLedgerService from "./stockLedger.service";

export const getByRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await stockLedgerService.getLedgerByRestaurant(
      restaurant_id ?? 0,
      is_super_admin,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getByRawMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, restaurant_id } = req.user!;
    const data = await stockLedgerService.getLedgerByRawMaterial(
      Number(req.params.rawMaterialId),
      restaurant_id ?? 0,
      is_super_admin,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
