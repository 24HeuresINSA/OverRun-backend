import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { emailTimeout, prisma, saltRounds } from "../server";
import { sendEmail } from "../utils/emails";
import { secureRandomToken } from "../utils/secureRandomToken";

// export const getUsers = async (req: Request, res: Response) => {

// }

export const createPasswordInvite = async (req: Request, res: Response) => {
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
      const token = String(secureRandomToken(50));
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
export const updatePasswordUser = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
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
          res.json({
            success: "Password successfully updated.",
          });
        }
      });
    } else {
      res.json(400);
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
