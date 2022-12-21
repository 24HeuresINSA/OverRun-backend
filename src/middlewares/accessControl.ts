import { NextFunction, Request, Response } from "express";

export const accessControl = (allowedRoles: Array<string>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role && req.user.role.length > 0) {
      let access = false;
      for (const role of req.user.role) {
        if (allowedRoles.includes(role)) {
          access = true;
          break;
        }
      }
      if (access) {
        next();
      } else {
        res.status(403);
        res.json({
          err: "Unauthorized.",
        });
      }
    } else {
      res.status(403);
      res.json({
        err: "Unauthorized.",
      });
    }
  };
};
