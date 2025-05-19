import express from "express";
import { query } from "express-validator";
import * as inscriptionCtrl from "../controllers/inscriptions";
import { InscriptionStatus } from "../controllers/inscriptions";
import { PaymentStatus } from "../controllers/payments";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";

export const inscriptionRouter = express.Router();

inscriptionRouter.get(
  "/inscriptions",
  authenticateJWT,
  accessControl(["ADMIN"]),
  query(
    "certificateStatus",
    "Value should be one of : 1 (Validated), 4 (To validate), 5 (Refused)"
  )
    .optional()
    .isNumeric()
    .isIn([1, 4, 5]),
  query(
    "paymentStatus",
    `Value should be one of : ${Object.values(PaymentStatus)}`
  )
    .optional()
    .isIn(Object.values(PaymentStatus)),
  query(
    "status",
    `Value should be one of : ${Object.values(InscriptionStatus)}`
  )
    .optional()
    .isIn(Object.values(InscriptionStatus)),
  filter([
    [["editionId", "id"], "number", true, ["edition", "is"]],
    [["raceId", "id"], "number", true, ["race", "is"]],
  ]),
  inscriptionCtrl.getInscriptions
);

inscriptionRouter.get(
  "/inscriptions/countLast24h",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.getLast24hInscriptions
);

inscriptionRouter.get(
  "/inscriptions/countByDate",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.getCountByDate
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

inscriptionRouter.post(
  "/inscriptions/:id/validate",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.validateInscription
);

inscriptionRouter.post(
  "/inscriptions/:id/cancel",
  authenticateJWT,
  accessControl(["ADMIN"]),
  inscriptionCtrl.cancelInscription
);
