import express from "express";
import { body, oneOf } from "express-validator";
import * as loginCtrl from "../controllers/login";
import { normalizeEmailOptions } from "../utils/normalizeEmailOptions";

export const loginRouter = express.Router();

loginRouter.post(
  "/login",
  oneOf([
    body("email").isEmail().normalizeEmail(normalizeEmailOptions),
    body("username").notEmpty(),
  ]),
  loginCtrl.login
);

loginRouter.post(
  "/refresh",
  body("refreshToken").notEmpty(),
  loginCtrl.refreshToken
);

loginRouter.post("/logout", body("refreshToken").notEmpty(), loginCtrl.logout);
