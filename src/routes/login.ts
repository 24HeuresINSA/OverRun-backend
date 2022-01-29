import express from "express";
import * as loginCtrl from "../controllers/login";
import { body, oneOf } from "express-validator";

export const loginRouter = express.Router();

loginRouter.post(
  "/login",
  oneOf([
    body("email").isEmail().normalizeEmail(),
    body("username").notEmpty(),
  ]),
  loginCtrl.login
);

loginRouter.post(
  "/refresh",
  body("refreshToken").notEmpty(),
  loginCtrl.refreshToken
);

loginRouter.post(
    "/logout", 
    body("refreshToken").notEmpty(),
    loginCtrl.logout
);
