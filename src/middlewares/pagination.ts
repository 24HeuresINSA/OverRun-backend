import { NextFunction, Request, Response } from "express";

export const paginate = (maxElementsPerPage: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const paginateObject = {
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      limit: maxElementsPerPage,
      skipIndex: 0,
    };
    req.paginate = paginateObject;
    req.paginate.skipIndex = (req.paginate.page - 1) * req.paginate.limit;
    next();
  };
};
