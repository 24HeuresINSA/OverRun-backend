import { Admin, Athlete, Prisma, RefreshToken, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import {
  accessTokenSecret,
  accessTokenTimeout,
  prisma,
  refreshTokenSecret,
  refreshTokenTimeout,
} from "../server";

export const login = async (req: Request, res: Response) => {
  try {
    let adminId = null;
    let athleteId = null;
    const { username, email, password } = req.body;
    let user: User | null = null;
    try {
      if (username) {
        user = await prisma.user.findUnique({
          where: {
            username: username,
          },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
          },
        });
      } else {
        user = await prisma.user.findUnique({
          where: {
            email: email,
          },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
          },
        });
      }

      if (user !== null) {
        const admin: Admin | null = await prisma.admin.findUnique({
          where: {
            userId: user.id,
          },
        });

        let role: string | null = null;

        if (admin) {
          role = "ADMIN";
          adminId = admin.id;
          const athlete: Athlete | null = await prisma.athlete.findUnique({
            where: {
              userId: user.id,
            },
          });
          if (athlete) {
            athleteId = athlete.id;
          }
        } else {
          const athlete: Athlete | null = await prisma.athlete.findUnique({
            where: {
              userId: user.id,
            },
          });
          if (athlete) {
            role = "ATHLETE";
            athleteId = athlete.id;
          } else {
            res.status(401);
            res.json({
              err: "User has no role",
            });
          }
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (validPassword) {
          const currentDate = new Date();
          const accessToken = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: role,
              expire_at: new Date(
                currentDate.getTime() + accessTokenTimeout * 1000
              ),
              athleteId: athleteId,
              adminId: adminId,
            },
            accessTokenSecret,
            {
              expiresIn: accessTokenTimeout + "s",
            }
          );
          const refreshToken = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: role,
              expire_at: new Date(
                currentDate.getTime() + refreshTokenTimeout * 1000
              ),
            },
            refreshTokenSecret,
            {
              expiresIn: refreshTokenTimeout + "s",
            }
          );
          await prisma.refreshToken.create({
            data: {
              refreshToken: refreshToken,
              expiredAt: currentDate.getTime() + refreshTokenTimeout * 1000,
            },
          });
          res.json({
            accessToken,
            accessTokenExpiredAt:
              currentDate.getTime() + accessTokenTimeout * 1000,
            refreshToken,
            refreshTokenExpiredAt:
              currentDate.getTime() + refreshTokenTimeout * 1000,
          });
        } else {
          res.status(400);
          res.json({
            err: "Invalid Password",
          });
        }
      } else {
        res.status(401);
        res.json({
          err: "User does not exist",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
  } catch (err) {
    res.status(400);
    res.json({
      err: "err",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    validationResult(req).throw();

    const { refreshToken } = req.body;

    try {
      const dbRefresToken: RefreshToken | null =
        await prisma.refreshToken.findUnique({
          where: {
            refreshToken: refreshToken,
          },
        });
      if (dbRefresToken === null) {
        res.status(401);
        res.json({
          err: "Invalid refresh token.",
        });
      } else {
        jwt.verify(
          refreshToken,
          refreshTokenSecret,
          async (err: any, user: any) => {
            if (err) {
              res.status(403);
              res.json({
                err: err,
              });
              return;
            }
            const currentDate = new Date();
            const newAccessToken = jwt.sign(
              {
                id: user.id,
                username: user.username,
                role: user.role,
                expire_at: new Date(
                  currentDate.getTime() + accessTokenTimeout * 1000
                ),
              },
              accessTokenSecret,
              {
                expiresIn: accessTokenTimeout + "s",
              }
            );
            const newRefreshToken = jwt.sign(
              {
                id: user.id,
                username: user.username,
                role: user.role,
                expire_at: new Date(
                  currentDate.getTime() + refreshTokenTimeout * 1000
                ),
              },
              refreshTokenSecret,
              {
                expiresIn: refreshTokenTimeout + "s",
              }
            );

            await prisma.refreshToken.create({
              data: {
                refreshToken: newRefreshToken,
                expiredAt: currentDate.getTime() + refreshTokenTimeout * 1000,
              },
            });
            await prisma.refreshToken
              .delete({
                where: {
                  refreshToken: refreshToken,
                },
              })
              .catch((err) => {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                  // avoid error if record is already deleted
                  if (err.code !== "P2025") return err;
                }
              });
            res.json({
              accessToken: newAccessToken,
              accessTokenExpiredAt:
                currentDate.getTime() + accessTokenTimeout * 1000,
              refreshToken: newRefreshToken,
              refreshTokenExpiredAt:
                currentDate.getTime() + refreshTokenTimeout * 1000,
            });
          }
        );
      }
    } catch (err) {
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
  } catch (err) {
    res.status(400);
    res.json({
      err: "err",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    validationResult(req).throw();

    const { refreshToken } = req.body;

    try {
      const dbRefreshToken: RefreshToken | null =
        await prisma.refreshToken.findUnique({
          where: {
            refreshToken: refreshToken,
          },
        });
      if (dbRefreshToken) {
        await prisma.refreshToken.delete({
          where: {
            refreshToken: refreshToken,
          },
          select: {
            refreshToken: true,
          },
        });
        res.json({
          info: "Logout successful",
        });
      } else {
        res.json({
          err: "Invalid refresh token.",
        });
      }
    } catch (err) {
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
  } catch (err) {
    res.status(400);
    res.json({
      err: "err",
    });
  }
};
