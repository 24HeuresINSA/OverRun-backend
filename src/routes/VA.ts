import express from "express";
import * as vaCtrl from "../controllers/VA";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";


export const vaRouter = express.Router();

vaRouter.get(
    "/vas",
    search([
        [["athlete_firstname", "firstName"], "string", true, ["athlete", "firstName"]],
        [["athlete_lastname", "lastName"]]
    ]),
    paginate(10),

)