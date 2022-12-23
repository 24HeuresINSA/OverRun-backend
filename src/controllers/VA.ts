import axios from "axios";
import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
  va: true,
  athlete: {
    select: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
      fistName: true,
      lastName: true,
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const getVAs = async (req: Request, res: Response) => {
  try {
    const VAs = await prisma.vA.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit,
      where: Object.assign({}, req.search, req.filter),
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(VAs, req));
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const checkVA = async (req: Request, res: Response) => {
  const { vaNumber, vaFirstName, vaLastName } = req.body;

  try {
    const tokenResponse = await axios.post(
      ` ${process.env.EDB_SSO_ENDPOINT}/auth/realms/${process.env.EDB_REALM}/protocol/openid-connect/token`,
      `grant_type=client_credentials&client_id=${process.env.EDB_VA_CLIENT_ID}&client_secret=${process.env.EDB_VA_TOKEN}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (tokenResponse.status < 300) {
      const accessToken = tokenResponse.data.access_token;

      const vaResponse = await axios.post(
        `${process.env.EDB_VA_ENDPOINT}/va_check`,
        {
          last_name: vaLastName,
          first_name: vaFirstName,
          card: vaNumber,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (vaResponse.status === 404 || vaResponse.status === 400) {
        res.status(404);
        return res.json({
          err: "VA not found.",
        });
      }

      if (
        vaResponse.status === 200 &&
        vaResponse.data.has_valid_membership === true
      ) {
        const athlete = await prisma.athlete.findUnique({
          where: {
            userId: req.user.id,
          },
        });

        if (!athlete) {
          return res.status(404).json({
            err: "Athlete not found.",
          });
        }

        const inscription = await prisma.inscription.findFirst({
          where: {
            athleteId: athlete.id,
          },
        });

        if (!inscription) {
          return res.status(404).json({
            err: "Inscription not found.",
          });
        }

        const vaCreation = await prisma.vA.create({
          data: {
            va: vaNumber,
            inscriptionId: inscription.id,
          },
        });
        return res.json(vaCreation);
      }
      return res.status(400).json({
        err: "VA not valid.",
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
