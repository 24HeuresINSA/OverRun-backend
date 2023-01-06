import { Request } from "express";

export const jsonPaginateResponse = (array: Array<any>, req: Request) => {
  return {
    data:
      array.length > req.paginate.limit
        ? array.slice(0, req.paginate.limit - 1)
        : array,
    page: req.paginate.page,
    elements:
      array.length > req.paginate.limit ? req.paginate.limit : array.length,
    next: array.length > req.paginate.limit,
    previous: req.paginate.page !== 1,
  };
};
