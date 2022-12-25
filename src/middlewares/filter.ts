import { NextFunction, Request, Response } from "express";
import { fusion } from "../utils/concatenateObjects";

export const filter = (fields: Array<Array<any>>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.filter = {};
    for (const field of fields) {
      let fieldname = "";
      let queryELement = "";
      if (Array.isArray(field[0])) {
        queryELement = String(field[0][0]);
        fieldname = String(field[0][1]);
      } else {
        queryELement = String(field[0]);
        fieldname = String(field[0]);
      }

      const type = String(field[1]);
      const nested = Boolean(field[2]);
      let filterDict: { [k: string]: any } = {};

      let queryValue = req.query[String(queryELement)];
      if (queryValue) {
        queryValue = String(queryValue);
        switch (type) {
          case "number":
            filterDict[fieldname] = parseInt(queryValue);
            break;
          case "boolean":
            if (queryValue === "1" || queryValue === "true") {
              filterDict[fieldname] = true;
            } else {
              filterDict[fieldname] = false;
            }
            break;
          default:
            filterDict[fieldname] = queryValue;
        }

        if (nested) {
          const nestedFields = field[3];
          for (let i = nestedFields.length - 1; i >= 0; i--) {
            const tempFilter: { [k: string]: any } = {};
            tempFilter[nestedFields[i]] = filterDict;
            filterDict = tempFilter;
          }
        }
        req.filter = fusion(req.filter, filterDict);
      }
    }
    next();
  };
};
