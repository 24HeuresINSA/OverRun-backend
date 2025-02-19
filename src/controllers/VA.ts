import axios from "axios";
import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { InscriptionStatus } from "./inscriptions";

const allowedAdhesions = [
  "VA 1A 2024-25",
  "VAvantages 2024-25",
  "VAdhésion + VAvantages 2024-25",
];

const selectedFields = {
  va: true,
  id: true,
  inscription: {
    select: {
      athlete: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          firstName: true,
          lastName: true,
        },
      },
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

export const findPreviousVA = async (req: Request, res: Response) => {
  try {
    const previousInscription = await prisma.vA.findFirst({
      where: {
        inscription: {
          is: {
            athlete: {
              is: {
                userId: req.user.id,
              },
            },
            edition: {
              active: true,
            },
          },
        },
      },
      select: selectedFields,
    });
    if (previousInscription === null) {
      res.status(404);
      res.json({ err: "no prior inscription" });
      return;
    }
    res.status(200);
    res.json({ ...previousInscription });
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

      const vaResponse = await axios.get(
        `${process.env.EDB_VA_ENDPOINT}/va_check`,
        {
          params: {
            // last_name: vaLastName,
            // first_name: vaFirstName,
            card_number: vaNumber,
          },
          headers: {
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

      if (vaResponse.data.members.length === 0) {
        return res.status(404).json({
          err: "VA not found.",
        });
      }

      const memberships = vaResponse.data.members[0].memberships?.map(
        ({ name }: { name: string }) => name
      );

      //La liste des adhésions de l'utilisateur contient au moins
      //une adhésion qui offre des réductions.
      if (memberships.some((m: string) => allowedAdhesions.includes(m))) {
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
            edition: {
              active: true,
            },
            OR: [
              { status: InscriptionStatus.PENDING },
              { status: InscriptionStatus.VALIDATED },
            ],
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

export const updateVA = async (req: Request, res: Response) => {
  const { vaNumber, vaFirstName, vaLastName } = req.body;
  const vaId = parseInt(req.params.vaId);

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

      const vaResponse = await axios.get(
        `${process.env.EDB_VA_ENDPOINT}/va_check`,
        {
          params: {
            // last_name: vaLastName,
            // first_name: vaFirstName,
            card_number: vaNumber,
          },
          headers: {
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

      if (vaResponse.data.members.length === 0) {
        return res.status(404).json({
          err: "VA not found.",
        });
      }

      const memberships = vaResponse.data.members[0].memberships?.map(
        ({ name }: { name: string }) => name
      );

      //La liste des adhésions de l'utilisateur contient au moins
      //une adhésion qui offre des réductions.
      if (memberships.some((m: string) => allowedAdhesions.includes(m))) {
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
            edition: {
              active: true,
            },
            OR: [
              { status: InscriptionStatus.PENDING },
              { status: InscriptionStatus.VALIDATED },
            ],
          },
        });

        if (!inscription) {
          return res.status(404).json({
            err: "Inscription not found.",
          });
        }

        const vaUpdate = await prisma.vA.update({
          where: {
            id: vaId,
          },
          data: {
            inscriptionId: inscription.id,
            va: vaNumber,
          },
        });
        return res.json(vaUpdate);
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
