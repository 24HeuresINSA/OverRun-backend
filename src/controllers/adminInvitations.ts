import { Request, Response } from "express";
import { DEBUG, emailTimeout, prisma, saltRounds } from "../server";
import { sendEmail } from "../utils/emails";
import { secureRandomToken } from "../utils/secureRandomToken";
import bcrypt from "bcrypt";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
  id: true,
  email: true,
};

export const getInvitations = async (req: Request, res: Response) => {
  console.log(getInvitations);
  try {
    const invitations = await prisma.adminInvite.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: req.search,
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(invitations, req));
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createInvitation = async (req: Request, res: Response) => {
  console.log(createInvitation);
  const { email } = req.body;
  const token = DEBUG ? "token_debug" : String(secureRandomToken(50));
  const currentDate = new Date();
  bcrypt.hash(token, saltRounds, async (err, hash) => {
    if (err) {
      console.error(err);
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
    try {
      const adminAlreadyExists = await prisma.admin.findFirst({
        where: {
          user: {
            email: email,
          },
        },
      });
      const invitationAlreadyExists = await prisma.adminInvite.findFirst({
        where: {
          email: email,
        },
      });
      if (!adminAlreadyExists) {
        if (!invitationAlreadyExists) {
          const userAlreadyExists = await prisma.user.findUnique({
            where: {
              email: email,
            },
          });
          let invitation = {};
          if (userAlreadyExists) {
            invitation = await prisma.adminInvite.create({
              data: {
                email: email,
                token: hash,
                expirateAt: currentDate.getTime() + emailTimeout * 1000,
                userId: userAlreadyExists.id,
              },
              select: selectedFields,
            });
          } else {
            invitation = await prisma.adminInvite.create({
              data: {
                email: email,
                token: hash,
                expirateAt: currentDate.getTime() + emailTimeout * 1000,
              },
              select: selectedFields,
            });
          }
          sendEmail(email, "Invitation à rejoindre Overun", "AdminInvite", {
            token: token,
          });
          res.json(invitation);
        } else {
          res.status(400);
          res.json({
            err: "Invitation already exists.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Admin already exists.",
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
  });
};

export const acceptInvitation = async (req: Request, res: Response) => {
  console.log(acceptInvitation);
  const { token, username, password } = req.body;
  const invitationId = parseInt(req.params.id);
  try {
    const invitation = await prisma.adminInvite.findUnique({
      where: {
        id: invitationId,
      },
    });
    const validToken = await bcrypt.compare(token, String(invitation?.token));
    const currentDate = new Date();
    if (validToken) {
      if (parseInt(String(invitation?.expirateAt)) > currentDate.getTime()) {
        let admin = {};
        if (invitation?.userId) {
          admin = await prisma.admin.create({
            data: {
              user: {
                connect: {
                  id: invitation.userId,
                },
              },
              active: true,
            },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                },
              },
              active: true,
            },
          });
          res.json(admin);
        } else {
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            admin = await prisma.admin.create({
              data: {
                user: {
                  create: {
                    email: String(invitation?.email),
                    username: username,
                    password: hash,
                  },
                },
                active: true,
              },
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                  },
                },
                active: true,
              },
            });

            res.json(admin);
          });
        }
        await prisma.adminInvite.delete({
          where: {
            id: invitation?.id,
          },
        });
      } else {
        res.status(400);
        res.json({
          err: "Token has expired.",
        });
      }
    } else {
      res.status(403);
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

export const deleteInvitation = async (req: Request, res: Response) => {
  const invitationId = parseInt(req.params.id);
  try {
    await prisma.adminInvite.delete({
      where: {
        id: invitationId,
      },
    });
    res.json({
      success: "Invitation deleted successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
