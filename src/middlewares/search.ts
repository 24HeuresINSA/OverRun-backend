import { Response, Request, NextFunction } from "express";
import { fusion } from "../utils/concatenateObjects";

export const search = (fields: Array<Array<any>>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(search);
    for (const field of fields) {
      let fieldname = ""
      let queryELement = ""
      if (Array.isArray(field)) {
        queryELement = String(field[0][0])
        fieldname = String(field[0][1])
      } else {
        queryELement = String(field[0])
        fieldname = String(field[0]);
      }
      
      const type = String(field[1]);
      const nested = Boolean(field[2]);
      let searchDict: { [k: string]: any } = {};

      let queryValue = req.query[String(queryELement)];
      if (queryValue) {
        queryValue = String(queryValue);
        switch (type) {
          case "number":
                searchDict[fieldname] = {
                  contains: parseInt(queryValue),
                };
            break;
          case "boolean":
            if (queryValue === "1" || queryValue === "true") {
                searchDict[fieldname] = {
                  contains: true,
                };
            } else {
                searchDict[fieldname] = {
                  contains: false,
                };
            }
            break;
          default:
                searchDict[fieldname] = {
                  contains: queryValue,
                };
        }

        if (nested) {
          const nestedFields = field[3];
          for (let i = nestedFields.length - 1; i >= 0; i--) {
            const tempSearch: { [k: string]: any } = {};
            tempSearch[nestedFields[i]] = searchDict;
            searchDict = tempSearch;
          }
        }
      }
        
        req.search = fusion(req.search, searchDict );
    }
    console.log(req.search);
    next();
  };
};
