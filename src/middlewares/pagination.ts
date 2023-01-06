import { NextFunction, Request, Response } from "express";

// export const defaultMaxElementsPerPage =
//   parseInt(String(process.env.PAGINATION_MAX_ELEMS_PER_PAGE)) || 10;
const defaultMaxElementsPerPage = 1_000;

export const paginate = (
  maxElementsPerPage: number = defaultMaxElementsPerPage
) => {
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
