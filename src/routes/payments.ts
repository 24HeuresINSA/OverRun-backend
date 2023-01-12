import express from "express";
import * as paymentCtrl from "../controllers/payments";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { paginate } from "../middlewares/pagination";

export const paymentRouter = express.Router();

paymentRouter.get(
  "/payments",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paginate(),
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

paymentRouter.patch(
  "/payments/:id/update",
  authenticateJWT,
  paymentCtrl.updatePayment
);

paymentRouter.patch(
  "/payments/:id/validate",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.validatePayment
);

paymentRouter.patch(
  "/payments/:id/refuse",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.refusePayment
);

paymentRouter.patch(
  "/payments/:id/refund",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.refundPayment
);

paymentRouter.patch(
  "/payments/:id/setstatusbyhelloasso",
  authenticateJWT,
  paymentCtrl.setStatusByHelloasso
);
