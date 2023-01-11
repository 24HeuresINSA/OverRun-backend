import express from "express";
import * as paymentCtrl from "../controllers/payments";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";

export const paymentRouter = express.Router();

paymentRouter.get(
  "/payments",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.getPayments
);

paymentRouter.get("/payments/me", authenticateJWT, paymentCtrl.getMypayments);

paymentRouter.get(
  "/payments/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.getPaymentById
);

paymentRouter.post("/payments", authenticateJWT, paymentCtrl.createPayment);

paymentRouter.post(
  "/payments/:id/initiate",
  authenticateJWT,
  paymentCtrl.initiatePayment
);
