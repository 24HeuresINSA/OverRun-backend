import express from "express";
import * as raceCtrl from "../controllers/races";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const raceRouter = express.Router();

raceRouter.get(
    "/races",
    filter([
        [["editionId", "id"], "number", true, ["edition", "id"]],
    ]),
    search([
        ["name", "string", false],
        [["discipline_name", "name"], "string", true, ["disciplines", "race"]],
        [["category_name", "name"], "string", true, ["category"]]
    ]),
  paginate(10),
  raceCtrl.getRaces
);

raceRouter.get(
    "/races/:id",
    raceCtrl.getRaceById
);


raceRouter.post(
    "/races",
    authenticateJWT, 
    accessControl(["ADMIN"]),
    raceCtrl.createRace
);

raceRouter.put(
    "/races/:id", 
    authenticateJWT, 
    accessControl(["ADMIN"]), 
    raceCtrl.updateRace
)

raceRouter.delete(
    "/races/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    raceCtrl.deleteRace
);