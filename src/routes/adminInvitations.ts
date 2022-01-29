import express from "express";
import * as adminInvitationCtrl from "../controllers/adminInvitations"
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";


export const adminInvitationRouter = express.Router();

adminInvitationRouter.get(
    "/adminInvitations",
    authenticateJWT,
    accessControl(["ADMIN"]),
    filter([
        ["id", "number", false]
    ]),
    search([
        ["email", "string", false]
    ]),
    paginate(10),
    adminInvitationCtrl.getInvitations
); 

adminInvitationRouter.post(
    "/adminInvitations",
    authenticateJWT,
    accessControl(["ADMIN"]),
    adminInvitationCtrl.createInvitation
);

adminInvitationRouter.post(
    "/adminInvitations/:id",
    adminInvitationCtrl.acceptInvitation
);

adminInvitationRouter.delete(
    "/adminInvitations/:id", 
    adminInvitationCtrl.deleteInvitation
)