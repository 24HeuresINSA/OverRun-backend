import express from "express";
import * as editionCtrl from "../controllers/editions";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";


export const editionRouter = express.Router();

editionRouter.get(
    "/editions",
    filter([
        ["active", "boolean", false],
    ]),
    search([
        ["name", "string", false],
    ]),
    paginate(10),
    editionCtrl.getEditions
);

editionRouter.get(
    "/editions/:id",
    editionCtrl.getEditionById,
);

editionRouter.post(
    "/editions",
    authenticateJWT,
    accessControl(["ADMIN"]),
    editionCtrl.createEdition,
);

editionRouter.put(
    "/editions/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    editionCtrl.updateEdition,
);

editionRouter.delete(
    "/editions/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    editionCtrl.deleteEdition,
);