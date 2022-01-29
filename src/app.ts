import express from "express";
import { adminRouter } from "./routes/admins";
import { loginRouter } from "./routes/login";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./utils/swaggerConfig";
import nodemailer from "nodemailer";
import fileUpload from "express-fileupload";
import { adminInvitationRouter } from "./routes/adminInvitations";
import { categoryRouter } from "./routes/categories";
import { disciplineRouter } from "./routes/disciplines";
import { athleteRouter } from "./routes/athletes";

export const app = express();

export const transporter = nodemailer.createTransport({
    port: 465, 
    host: "smtp.gmail.com", 
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
    }, 
    secure: true
});

const PATH = "/api/v1";

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload({
    createParentPath: true, 
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024,
    }, 
    abortOnLimit: true
}));

app.use(PATH, loginRouter)
app.use(PATH, adminRouter);
app.use(PATH, adminInvitationRouter);
app.use(PATH, categoryRouter);
app.use(PATH, disciplineRouter);
app.use(PATH, athleteRouter);
app.use(PATH, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

