import express from "express";
import * as helloassoCtrl from "../controllers/helloassoNotifications";

export const helloassoRouter = express.Router();

helloassoRouter.post(
  "/helloassonotifications",
  helloassoCtrl.handleNotification
);
