import express from "express";
import * as adminCtrl from "../controllers/admins";
import { authenticateJWT } from "../middlewares/authentication";
import { accessControl } from "../middlewares/accessControl";
import { paginate } from "../middlewares/pagination";
import { filter } from "../middlewares/filter";
import { search } from "../middlewares/search";

export const adminRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The admin ID.
 *           example: 0
 *         email:
 *           type: email
 *           description: The admin's e-mail address
 *           example: pintade@24heures.com
 *         pseudo:
 *           type: string
 *           description: The admin's pseudo.
 *           example: pintade
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *          - Admins
 *     summary: Retrieve a list of JSONPlaceholder admins.
 *     description: Retrieve a list of admin from JSONPlaceholder. Can be used to populate a list of fake users when prototyping or testing an API.
 *     responses:
 *       200:
 *         description: A list of admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Admin'
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The user ID.
 *                         example: 0
 *                       name:
 *                         type: string
 *                         description: The user's name.
 *                         example: Leanne Graham
 */
adminRouter.get(
  "/admins",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([
    ["id", "number", false],
    ["active", "boolean", false],
  ]),
  search([
    ["email", "string", true, ["user"]],
    ["username", "string", true, ["user"]],
  ]),
  paginate(10),
  adminCtrl.getAdmins
);

adminRouter.get(
  "/admins/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  adminCtrl.getAdminById
);

adminRouter.delete(
  "/admins/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  adminCtrl.deleteAdmin
);


