import express from "express";
import * as categoryCtrl from "../controllers/categories";
import { accessControl } from "../middlewares/accessControl";
import { authenticateJWT } from "../middlewares/authentication";
import { filter } from "../middlewares/filter";
import { paginate } from "../middlewares/pagination";
import { search } from "../middlewares/search";

export const categoryRouter = express.Router();

categoryRouter.get(
  "/categories",
  authenticateJWT,
  accessControl(["ADMIN"]),
  filter([
    ["id", "number", false],
    [["editionId", "id"], "number", true, ["edition", "is"]],
  ]),
  search([["name", "string", false]]),
  paginate(),
  categoryCtrl.getCategories
);

categoryRouter.get(
  "/categories/light",
  authenticateJWT,
  filter([
    ["id", "number", false],
    [["editionId", "id"], "number", true, ["edition", "is"]],
    [["maxTeamMembers", "gt"], "number", true, ["maxTeamMembers"]],
  ]),
  search([["name", "string", false]]),
  paginate(),
  categoryCtrl.getCategoriesLight
);

categoryRouter.get(
  "/categories/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  categoryCtrl.getCategoryById
);

categoryRouter.post(
  "/categories",
  authenticateJWT,
  accessControl(["ADMIN"]),
  categoryCtrl.createCategroy
);

categoryRouter.delete(
  "/categories/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  categoryCtrl.deleteCatgeory
);

categoryRouter.put(
  "/categories/:id",
  authenticateJWT,
  accessControl(["ADMIN"]),
  categoryCtrl.updateCategory
);
