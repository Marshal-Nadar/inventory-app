import { Request, Response, NextFunction } from "express";
import * as transferRequestService from "./transferRequest.service";

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { is_super_admin, can_manage_store, restaurant_id, branch_id } =
      req.user!;
    const data = await transferRequestService.getAllTransferRequests(
      is_super_admin,
      can_manage_store,
      restaurant_id ?? 0,
      branch_id ?? null,
    );
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
    const {
      is_super_admin,
      can_manage_store,
      restaurant_id,
      branch_id,
      role,
      id: userId,
    } = req.user!;

    // only storekeeper cannot raise requests
    // admin and super admin CAN raise on behalf of branches
    if (role === "storekeeper") {
      res.status(403).json({
        success: false,
        message: "Storekeepers cannot raise transfer requests",
      });
      return;
    }

    if (!branch_id) {
      res.status(400).json({
        success: false,
        message: "You must be assigned to a branch to raise a request",
      });
      return;
    }

    const { items, notes, branch_id: bodyBranchId } = req.body;

    // admin and super admin pass branch_id in body
    // branch level users use their own branch_id
    const isAdminLevel = role === "admin" || is_super_admin;
    const finalBranchId = isAdminLevel ? bodyBranchId : branch_id;

    if (!finalBranchId) {
      res.status(400).json({
        success: false,
        message: "Branch is required",
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
      if (!item.raw_material_id || !item.quantity || !item.metric) {
        res.status(400).json({
          success: false,
          message: "Each item must have raw_material_id, quantity and metric",
        });
        return;
      }
    }

    const data = await transferRequestService.createTransferRequest(
      restaurant_id ?? 0,
      finalBranchId,
      items,
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

export const approve = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { can_manage_store, is_super_admin, id: userId } = req.user!;

    if (!can_manage_store && !is_super_admin) {
      res.status(403).json({
        success: false,
        message: "Only store managers can approve requests",
      });
      return;
    }

    const data = await transferRequestService.approveTransferRequest(
      Number(req.params.id),
      userId,
    );

    res.json({ success: true, message: "Request approved", data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const reject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { can_manage_store, is_super_admin, id: userId } = req.user!;

    if (!can_manage_store && !is_super_admin) {
      res.status(403).json({
        success: false,
        message: "Only store managers can reject requests",
      });
      return;
    }

    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
      return;
    }

    const data = await transferRequestService.rejectTransferRequest(
      Number(req.params.id),
      userId,
      rejection_reason,
    );

    res.json({ success: true, message: "Request rejected", data });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
