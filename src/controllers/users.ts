import { DEBUG, emailTimeout, prisma, saltRounds } from "../server";
import { Request, Response } from "express";
import { secureRandomToken } from "../utils/secureRandomToken";
import { sendEmail } from "../utils/emails";
import bcrypt from "bcrypt";

// export const getUsers = async (req: Request, res: Response) => {
 
// }

export const createPasswordInvite = async (req: Request, res: Response) => {
  console.log(createPasswordInvite);
  const { email } = req.body;
  try {
    const userExists = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (userExists) {
      await prisma.passwordInvite.delete({
        where: {
          userId: userExists.id,
        },
      });
      const token = DEBUG ? "token_debug" : String(secureRandomToken(50));
      console.log("Token: ", token);
      const currentDate = new Date();
      bcrypt.hash(token, saltRounds, async (err, hash) => {
        if (err) {
          res.status(500);
          res.json({
            err: "Internal error.",
          });
        }
        await prisma.passwordInvite.create({
          data: {
            userId: userExists.id,
            token: hash,
            expirateAt: currentDate.getTime() + emailTimeout * 1000,
          },
        });
      });
      sendEmail(email, "Invitation à rejoindre OverRun", "AdminInvite", {
        token: token,
      });
      res.json({
        success: "Reset password email send at " + email + ".",
      });
    } else {
      res.status(400);
      res.json({
        err: "Email address doesn't exist.",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  console.log(updatePassword);
  const inviteId = parseInt(req.params.id);
  const { token, password } = req.body;
  try {
    const invite = await prisma.passwordInvite.findUnique({
      where: {
        id: inviteId,
      },
    });
    
    const valideToken = await bcrypt.compare(token, String(invite?.token)); 
    if (valideToken) {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          res.status(500);
          res.json({
            err: "Internal error.",
          })
        } else {
          await prisma.user.update({
            where: {
              id: invite?.userId,
            },
            data: {
              password: hash,
            },
          });
          res.json({
            success: "Password successfully updated."
          });
        }
      })
    } else {
      res.json(400);
      res.json({
        err: "Invalid token."
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
