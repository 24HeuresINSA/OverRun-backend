import express from "express";
import * as paymentCtrl from "../controllers/payments";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { orderBy } from "../middlewares/orderBy";
import { PaymentStatus } from "../controllers/payments";
import { query } from "express-validator";
import { InscriptionStatus } from "../controllers/inscriptions";

export const paymentRouter = express.Router();

paymentRouter.get(
  "/payments",
  authenticateJWT,
  accessControl(["ADMIN"]),
  query(
    "paymentStatus",
    `Value should be one of : ${Object.values(PaymentStatus)}`
  )
    .optional()
    .isIn(Object.values(PaymentStatus)),
  query(
    "inscriptionStatus",
    `Value should be one of : ${Object.values(InscriptionStatus)}`
  )
    .optional()
    .isIn(Object.values(InscriptionStatus)),
  query("raceId").optional().isNumeric(),
  filter([
    [["editionId", "id"], "number", true, ["inscription", "edition", "is"]],
  ]),
  paginate(),
  orderBy([]),
  paymentCtrl.getPayments
);

paymentRouter.get(
  "/payment/amountByDate",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.getAmountByDate
);

paymentRouter.get("/payments/me", authenticateJWT, paymentCtrl.getMypayments);

paymentRouter.get(
  "/payments/total",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.getTotalPayments
);

paymentRouter.get(
  "/payments/export",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.paymentsByDateToJSON
);
paymentRouter.get(
  "/payments/exportInCSV",
  authenticateJWT,
  accessControl(["ADMIN"]),
  paymentCtrl.paymentsByDateToCSV
);

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
