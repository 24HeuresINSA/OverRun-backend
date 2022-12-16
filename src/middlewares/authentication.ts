import { Response, Request, NextFunction } from "express";

import { prisma } from "../server";

import jwt from "jsonwebtoken";
import { accessTokenSecret } from "../server";

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const accessToken = authHeader.split(" ")[1];
    jwt.verify(accessToken, accessTokenSecret, async (err, user) => {
      if (err) {
        res.status(403);
        res.json({
          err: "Unauthorized.",
        });
      }
      if (user) {
        try {
          const isRegistratedUser = await prisma.user.findUnique({
            where: {
              id: user.id,
            },
          });
          if (isRegistratedUser) {
            req.user = {
              id: Number(user.id),
              role: [],
            };
            const isAdmin = await prisma.admin.findUnique({
              where: {
                userId: isRegistratedUser.id,
              },
            });
            if (isAdmin) {
              req.user.role.push("ADMIN");
              if (isAdmin.active) {
                req.user.role.push("ACTIVE_ADMIN");
              }
            }
            req.user.role.push("AUTHENTICATED_USER");
            next();
          }
        } catch (err) {
          console.error(err);
          res.status(500);
          res.json({
            err: "Internal error.",
          });
        }
      } else {
        res.status(500);
        res.json({
          err: "Internal error.",
        });
      }
    });
  } else {
    res.status(401);
    res.json({
      err: "No access token provided.",
    });
  }
};
