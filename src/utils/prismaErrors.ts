import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { response, Response } from "express";

export const analyseError = (e: Error, res: Response) => {
    if (e instanceof PrismaClientKnownRequestError) {
        switch(e.code) {
            case "P2000":
                res.status(400)
                res.json({
                    'err': "The value is to long for" + e.meta["column_name"]
                })
                break;
            case "P2001":
                res.status(404)
                res.json({
                    'err': ""
                })
            case "P2002":
                res.status(400)
                res.json({
                    'err': ""
                })
            
        }
    }

};