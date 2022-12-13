import { Response, Request, NextFunction } from "express";
import { fusion } from "../utils/concatenateObjects";

export const search = (fields: Array<Array<any>>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(search);
    req.search = {};
    console.log(fields);
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
      console.log("Query element: " + queryELement);
      console.log("Field name: " + fieldname);

      // const type = String(field[1]);
      const nested = Boolean(field[2]);
      let searchDict: { [k: string]: any } = {};

      let queryValue = req.query[String("search")];
      console.log("Query value: " + queryValue);
      if (queryValue) {
        queryValue = String(queryValue);
        // switch (type) {
        //   case "number":
        //     searchDict[fieldname] = {
        //       contains: parseInt(queryValue),
        //     };
        //     break;
        //   default:
        //     searchDict[fieldname] = {
        //       contains: queryValue,
        //     };
        // }
        searchDict[fieldname] = {
          contains: queryValue,
        };
        console.log(searchDict);

        if (nested) {
          const nestedFields = field[3];
          for (let i = nestedFields.length - 1; i >= 0; i--) {
            const tempSearch: { [k: string]: any } = {};
            tempSearch[nestedFields[i]] = searchDict;
            searchDict = tempSearch;
          }
        }
        console.log(searchDict);
        req.search = fusion(req.search, searchDict);
        console.log(req.search);
      }
    }
    console.log(req.search);
    next();
  };
};
