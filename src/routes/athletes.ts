import express from "express";
import { body, check } from "express-validator";
import * as athleteCtrl from "../controllers/athletes";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";
import { normalizeEmailOptions } from "../utils/normalizeEmailOptions";

export const athleteRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Athlete:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The athlete ID.
 *           example: 0
 *           required: true
 *         email:
 *           type: email
 *           description: The athlete's e-mail address
 *           example: pintade@24heures.com
 *           required: true
 *         pseudo:
 *           type: string
 *           description: The athlete's pseudo.
 *           example: pintade
 *           required: true
 *         firstName:
 *           type: string
 *           description: The athlete's first name
 *           example: François
 *           required: true
 *         lastName:
 *           type: string
 *           description: The athlete's last name
 *           example: Rault
 *           required: true
 *         address:
 *           type: string
 *           description: The athlete's address
 *           example: 20 av Albert Einstein
 *           required: true
 *         zipCode:
 *           type: string
 *           description: The athlete city zip code
 *           example: 69100
 *           required: true
 *         city:
 *           type: string
 *           description: The athlete city
 *           example: Villeurbanne
 *           required: true
 *         country:
 *           type: string
 *           description: The athlete city
 *           default: France
 *           example: France
 *           required: false
 *         phoneNumber:
 *           type: string
 *           description: The athlete phone number
 *           example: 0472437000
 *           required: true
 *
 */

athleteRouter.get(
  "/athletes",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([[["editionId", "id"], "number", true, ["inscription", "edition"]]]),
  search([
    ["email", "string", true, ["user"]],
    ["username", "string", true, ["user"]],
    ["firstName", "string", false],
    ["lastName", "string", false],
  ]),
  paginate(),
  athleteCtrl.getAthletes
);
athleteRouter.get("/athletes/me", authenticateJWT, athleteCtrl.getAthleteMe);

athleteRouter.get("/athletes/:id", authenticateJWT, athleteCtrl.getAthleteById);

athleteRouter.post(
  "/athletes",
  check("email").isEmail().normalizeEmail(normalizeEmailOptions),
  check("firstName").isLength({ min: 3 }),
  check("lastName").isLength({ min: 3 }),
  check("password").isLength({ min: 8 }),
  check("dateOfBirth")
    .toDate()
    .custom((birthDate) => birthDate <= new Date()),
  athleteCtrl.createAthlete
);

athleteRouter.put(
  "/athletes/:id",
  authenticateJWT,
  body("sex").toBoolean(),
  athleteCtrl.updateAthlete
);

athleteRouter.delete(
  "/athletes/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  athleteCtrl.deleteAthlete
);
