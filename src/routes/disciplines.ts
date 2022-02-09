import express from "express";
import * as disciplineCtrl from "../controllers/disciplines";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const disciplineRouter = express.Router();

disciplineRouter.get(
    "/disciplines",
    authenticateJWT,
    accessControl(["ADMIN"]),
    filter([
        [["editonId", "id"], "number", true, ["edition", "id"]],
    ]),
    search([
        ["name", "string", false],
    ]),
    paginate(10),
    disciplineCtrl.getDisciplines
); 

disciplineRouter.get(
    "/disciplines/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    disciplineCtrl.getDisciplineById
); 

disciplineRouter.post(
    "/disciplines",
    authenticateJWT,
    accessControl(["ADMIN"]),
    disciplineCtrl.createDiscipline
);

disciplineRouter.put(
    "/disciplines/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    disciplineCtrl.updateDiscipline
);

disciplineRouter.delete(
    "/disciplines/:id", 
    authenticateJWT, 
    accessControl(["ADMIN"]), 
    disciplineCtrl.deleteDiscipline
);