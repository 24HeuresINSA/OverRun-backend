import express from "express";
import * as certificateCtrl from "../controllers/certificates";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
// import { search } from "../middlewares/search";

export const certificateRouter = express.Router();

certificateRouter.get(
  "/certificates",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([[["editionId", "id"], "number", true, ["inscription", "edition"]]]),
  paginate(),
  certificateCtrl.getCertificates
);

certificateRouter.post(
  "/certificates/upload",
  authenticateJWT,
  certificateCtrl.uploadCertificate
);

certificateRouter.get(
  "/certificates/:id/download",
  authenticateJWT,
  certificateCtrl.uploadCertificate
);

certificateRouter.get(
  "/certificates/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  certificateCtrl.getCertificateData
);

certificateRouter.get(
  "/certificates/me/last",
  authenticateJWT,
  certificateCtrl.findPreviousCertificate
);

certificateRouter.patch(
  "/certificates/:id",
  authenticateJWT,
  certificateCtrl.updateCertificateInscription
);

certificateRouter.post(
  "/certificates/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  certificateCtrl.updateCertificateStatus
);
