import express from "express";
import * as inscriptionCtrl from "../controllers/inscriptions";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";

export const inscriptionRouter = express.Router();

inscriptionRouter.get(
  "/inscriptions",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([[["editionId", "id"], "number", true, ["edition", "is"]]]),
  paginate(),
  inscriptionCtrl.getInscriptions
);

inscriptionRouter.get(
  "/inscriptions/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),

  paginate(),
  inscriptionCtrl.getInscriptionById
);

inscriptionRouter.post(
  "/inscriptions",
  authenticateJWT,
  inscriptionCtrl.createInscription
);

inscriptionRouter.patch(
  // TODO: change to /inscriptions/:id/validate with post method for REST compliance
  "/inscriptions/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.validateInscription
);

inscriptionRouter.post(
  "/inscriptions/:id/cancelation",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.cancelInscription
);
