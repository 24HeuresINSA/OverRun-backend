import express from "express";
import * as raceCtrl from "../controllers/races";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { paginate } from "../middlewares/pagination";

export const raceRouter = express.Router();

raceRouter.get(
    "/races",
    paginate(10),
    raceCtrl.getRaces
);

raceRouter.get(
    "/races/:id",
    raceCtrl.getRaceById
); 

raceRouter.put(
    "/races/:id", 
    authenticateJWT, 
    accessControl(["ADMIN"])
    
)