import express from "express";
import * as inscriptionCtrl from "../controllers/inscriptions";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { paginate } from "../middlewares/pagination";

export const inscriptionRouter = express.Router();

inscriptionRouter.get(
    "/inscriptions", 
    authenticateJWT, 
    accessControl(["ADMIN"]),
    
    paginate(100),
    inscriptionCtrl.getInscriptions
)

