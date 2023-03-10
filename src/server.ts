import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { app } from "./app";

axios.interceptors.response.use(
  (res) => {
    return res;
  },
  async (err) => {
    return err.response;
  }
);

export const prisma = new PrismaClient();
export const accessTokenSecret = String(process.env.ACCESS_TOKEN_SECRET);
export const accessTokenTimeout =
  parseInt(String(process.env.ACCESS_TOKEN_TIMEOUT)) || 30000;
export const refreshTokenSecret = String(process.env.REFRESH_TOKEN_SECRET);
export const refreshTokenTimeout =
  parseInt(String(process.env.REFRESH_TOKEN_TIMEOUT)) || 21600;
export const port = parseInt(String(process.env.PORT)) || 3000;
export const PATH = "/api/v" + (process.env.API_VERSION || "1");
export const saltRounds = parseInt(String(process.env.SALT_ROUNDS)) || 10;
export const defaultMaxElementsPerPage =
  parseInt(String(process.env.PAGINATION_MAX_ELEMS_PER_PAGE)) || 10;
export const DEBUG = Boolean(parseInt(String(process.env.DEBUG)));
export const emailTimeout =
  parseInt(String(process.env.EMAIL_TIMEOUT)) || 21600;

app.listen(port, () =>
  console.log("REST API server ready at: http://localhost:" + port + PATH + "/")
);
