import express from "express";
import * as vaCtrl from "../controllers/VA";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const vaRouter = express.Router();

vaRouter.get(
  "/vas",
  authenticateJWT,
  accessControl(["ADMIN"]),
  search([
    [
      ["athlete_firstname", "firstName"],
      "string",
      true,
      ["athlete", "firstName"],
    ],
    [["athlete_lastname", "lastName"]],
  ]),
  paginate(),
  vaCtrl.getVAs
);

vaRouter.get(
  "/vas/me/last/:editionId",
  authenticateJWT,
  vaCtrl.findPreviousVA
);

vaRouter.post("/checkVA", authenticateJWT, vaCtrl.checkVA);

vaRouter.patch("/vas/:vaId", authenticateJWT, vaCtrl.updateVA);
