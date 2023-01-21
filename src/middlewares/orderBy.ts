import { Response, Request, NextFunction } from "express";

export const orderBy = (allowedFields: Array<string>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.orderBy = {};
    const requestedField = String(req.query.orderColumn);
    let key = "id";
    let value = "desc";

    if (requestedField && allowedFields.includes(requestedField)) {
      key = requestedField;
    }

    const availableOrders = ["asc", "desc"];
    const requestedOrder = String(req.query.order);
    if (requestedOrder && availableOrders.includes(requestedOrder)) {
      value = requestedOrder;
    }
    req.orderBy[key] = value;
    next();
  };
};
