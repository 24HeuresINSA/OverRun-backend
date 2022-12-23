import bodyParser from "body-parser";
import express from "express";
import fileUpload from "express-fileupload";
import nodemailer from "nodemailer";
import swaggerUi from "swagger-ui-express";
import { authenticateJWT } from "./middlewares/authentication";
import { adminInvitationRouter } from "./routes/adminInvitations";
import { adminRouter } from "./routes/admins";
import { athleteRouter } from "./routes/athletes";
import { categoryRouter } from "./routes/categories";
import { certificateRouter } from "./routes/certificates";
import { disciplineRouter } from "./routes/disciplines";
import { editionRouter } from "./routes/editions";
import { inscriptionRouter } from "./routes/inscriptions";
import { loginRouter } from "./routes/login";
import { raceRouter } from "./routes/races";
import { teamRouter } from "./routes/teams";
import { vaRouter } from "./routes/VA";
import { swaggerSpec } from "./utils/swaggerConfig";

const PATH = "/api/v" + (process.env.API_VERSION || "1");

export const app = express();

export const transporter = nodemailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
  secure: true,
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024,
    },
    abortOnLimit: true,
  })
);

app.use(PATH, loginRouter);
app.use(PATH, adminRouter);
app.use(PATH, adminInvitationRouter);
app.use(PATH, categoryRouter);
app.use(PATH, disciplineRouter);
app.use(PATH, athleteRouter);
app.use(PATH, teamRouter);
app.use(PATH, raceRouter);
app.use(PATH, editionRouter);
app.use(PATH, certificateRouter);
app.use(PATH, inscriptionRouter);
app.use(PATH, vaRouter);
app.use(
  `${PATH}/static`,
  authenticateJWT,
  express.static(`${__dirname}/../certificates`)
);
app.use(PATH, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
