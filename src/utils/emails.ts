import fs from "fs";
import nodemailer from "nodemailer";

const emailAdress = process.env.EMAIL_ADDRESS;
const emailPassword = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: emailAdress,
    pass: emailPassword,
  },
  secure: true,
});

export const sendEmail = (
  to: string,
  subject: string,
  template: string | null = null,
  variables: object | null = null,
  text = "",
  html = "",
  amp = ""
) => {
  if (template) {
    text = fs.readFileSync(
      `${__dirname}/email_templates/text/${template}.txt`,
      "utf-8"
    );
    html = fs.readFileSync(
      `${__dirname}/email_templates/html/${template}.html`,
      "utf-8"
    );
    amp = fs.readFileSync(
      `${__dirname}/email_templates/amp/${template}..html`,
      "utf-8"
    );
  }

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace("{{ " + key + " }}", String(value));
      html = html.replace("{{ " + key + " }}", String(value));
      amp = amp.replace("{{ " + key + " }}", String(value));
    }
  }

  const emailData = {
    from: emailAdress,
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  transporter.sendMail(emailData, (err, info) => {
    if (err) {
      console.log(info);
      return console.log(err);
    }
  });
};
