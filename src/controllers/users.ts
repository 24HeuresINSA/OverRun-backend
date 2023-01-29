import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { emailTimeout, prisma, saltRounds } from "../server";
import { sendEmail } from "../utils/emails";

// export const getUsers = async (req: Request, res: Response) => {

// }

export const createPasswordInvite = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (user) {
      const previousInvite = await prisma.passwordInvite.findUnique({
        where: {
          userId: user.id,
        },
      });
      if (previousInvite) {
        await prisma.passwordInvite.delete({
          where: {
            userId: user.id,
          },
        });
      }
      const rand = function () {
        return Math.random().toString(36).substr(2);
      };
      const generateToken = function () {
        return rand() + rand(); // to make it longer
      };
      const token = generateToken();
      const currentDate = new Date();
      const expirateAt = currentDate.getTime() + emailTimeout * 1000;
      bcrypt.hash(token, saltRounds, async (err, hash) => {
        if (err) {
          res.status(500);
          res.json({
            err: "Internal error.",
          });
        }
        await prisma.passwordInvite.create({
          data: {
            userId: user.id,
            token: hash,
            expirateAt,
          },
        });
      });
      sendEmail(email, "Réinitialisation de mot de passe", "ResetPassword", {
        token,
        pseudo: user.username,
        expirateAt: new Date(
          expireteAt
        ).toLocaleDateString("FR-fr", { hour: "2-digit", minute: "2-digit" }),
        url: process.env.FRONTEND_URL + "/reset" + "?token=",
        id: user.id,
      });
      res.json({
        success: "Reset password email sent at " + email + ".",
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

export const updatePasswordUser = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { password } = req.body;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      res.status(500);
      res.json({
        err: "Internal error.",
      });
      return;
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      res.status(400);
      res.json({
        err: "User does not exist.",
      });
      return;
    }
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hash,
      },
    });
    res.json({
      success: "Password successfully updated.",
    });
  });
};

export const updatePasswordInvite = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { token, password } = req.body;
  try {
    const invite = await prisma.passwordInvite.findUnique({
      where: {
        userId: userId,
      },
    });

    const now = new Date();
    if (!invite?.expirateAt) {
      res.status(400);
      res.json({
        err: "Invalid token.",
      });
      return;
    }
    if (invite?.expirateAt && invite?.expirateAt < now.getTime()) {
      res.status(401);
      res.json({
        err: "Expired token.",
      });
      return;
    }
    const valideToken = await bcrypt.compare(token, String(invite?.token));
    if (valideToken) {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          res.status(500);
          res.json({
            err: "Internal error.",
          });
        } else {
          await prisma.user.update({
            where: {
              id: invite?.userId,
            },
            data: {
              password: hash,
            },
          });
          await prisma.passwordInvite.delete({
            where: {
              id: invite.id,
            },
          });
          res.json({
            success: "Password successfully updated.",
          });
        }
      });
    } else {
      res.status(400);
      res.json({
        err: "Invalid token.",
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
