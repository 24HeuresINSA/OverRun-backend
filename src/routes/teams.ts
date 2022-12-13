import express from "express";
import * as teamCtrl from "../controllers/teams"
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const teamRouter = express.Router();

teamRouter.get(
  "/teams",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([
    [["editionId", "id"], "number", true, ["edition", "id"]],
    [
      [
        "maxParticipants",
        "number",
        true,
        ["race", "category", "maxParticipants"],
      ],
    ],
  ]),
  search([["name", "string", false]]),
  paginate(10),
  teamCtrl.getTeams
); 

teamRouter.get(
  "/teams/light",
  authenticateJWT,
    filter([
        [["editionId", "id"], "number", true, ["edition", "id"]],
        [["maxParticipants", "number", true, ["race", "category", "maxParticipants"]]]
    ]),
  search([["name", "string", false]]),
  paginate(10),
  teamCtrl.getTeamsLight
); 


teamRouter.get(
    "/teams/:id",
    authenticateJWT,
    teamCtrl.getTeamById
);

teamRouter.post(
    "/teams",
    authenticateJWT,
    teamCtrl.createTeam
);

teamRouter.delete(
    "/teams/:id",
    authenticateJWT,
    accessControl(["ADMIN"]),
    teamCtrl.deleteTeam
); 

teamRouter.post(
    "/teams/:id/join",
    authenticateJWT,
    teamCtrl.joinTeam
);

teamRouter.post(
    "/teams/:id/leave",
    authenticateJWT,
    teamCtrl.leaveTeam
);

teamRouter.post(
    "/teams/:id/admin",
    authenticateJWT,
    teamCtrl.addTeamAdmin
);

teamRouter.post(
    "/teams/:id/removeAdmin/",
    authenticateJWT,
    teamCtrl.removeTeamAdmin
);

teamRouter.post(
    "/teams/:id/removeMember",
    authenticateJWT,
    teamCtrl.removeTeamMember
);

teamRouter.post(
    "/teams/:id/updatePassword",
    authenticateJWT,
    teamCtrl.updateTeamPassword
);