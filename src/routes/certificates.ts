import express from "express";
import * as certificateCtrl from "../controllers/certificates";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const certificateRouter = express.Router();

certificateRouter.get(
    "/certificates",
    authenticateJWT,
    accessControl(["ADMIN"]),
    paginate(10),
    certificateCtrl.getCertificates
);