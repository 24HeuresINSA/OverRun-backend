import { Response, Request, NextFunction } from "express";

export const accessControl = (allowedRoles: Array<string>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(accessControl);
    
    if (req.user.role && req.user.role.length > 0) {
        let access = false;
        for (const role of req.user.role) {
          if (allowedRoles.includes(role)) {
            access = true;
            console.log(allowedRoles, "==>", "ALLOWED");
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
          console.log(allowedRoles, "==>", "NOT ALLOWED");
        }
    } else {
      res.status(403);
      res.json({
        err: "Unauthorized.",
      });
    } 
  };
};
