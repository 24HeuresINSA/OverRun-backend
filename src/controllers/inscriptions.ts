import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { PaymentStatus } from "./payments";

export enum InscriptionStatus {
  PENDING = "PENDING",
  VALIDATED = "VALIDATED",
  CANCELLED = "CANCELLED",
}

const selectedFields = {
  id: true,
  athlete: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  teamAdmin: {
    select: {
      id: true,
    },
  },
  va: {
    select: {
      id: true,
    },
  },

  race: {
    select: {
      id: true,
      name: true,
      disciplines: {
        select: {
          id: true,
          discipline: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      category: true,
    },
  },
  certificate: {
    select: {
      id: true,
      status: true,
      statusUpdatedAt: true,
      statusUpdatedBy: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      raceAmount: true,
      donationAmount: true,
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
  status: true,
};

function searchingFields(searchString: string): Prisma.InscriptionWhereInput {
  if (!searchString || searchString === "") return {};
  return {
    OR: [
      {
        athlete: {
          user: {
            username: {
              contains: searchString,
              mode: "insensitive",
            },
          },
        },
      },
      {
        athlete: {
          user: {
            email: {
              contains: searchString,
              mode: "insensitive",
            },
          },
        },
      },
      {
        athlete: {
          firstName: { contains: searchString, mode: "insensitive" },
        },
      },
      {
        athlete: {
          lastName: { contains: searchString, mode: "insensitive" },
        },
      },
      {
        team: {
          name: {
            contains: searchString,
            mode: "insensitive",
          },
        },
      },
    ],
  };
}

export const getLast24hInscriptions = async (req: Request, res: Response) => {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const lastInscriptions = await prisma.inscription.count({
    where: {
      createdAt: {
        gte: yesterday,
      },
    },
  });
  res.json(lastInscriptions);
};

export const getCountByDate = async (req: Request, res: Response) => {
  try {
    const editionId = parseInt(req.query.edition as string);
    const countResponse = await prisma.inscription.findMany({
      where: {
        editionId: editionId,
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    const countPerDate = countResponse.reduce((acc, current) => {
      const date = current.createdAt.toLocaleDateString("en-US");
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {} as { [key: string]: number });

    const labels = Object.keys(countPerDate);
    const simple = Object.values(countPerDate);

    for (let index = 0; index < labels.length - 1; index++) {
      const date1 = new Date(labels[index]);
      const date2 = new Date(labels[index + 1]);
      const tomorrow = new Date(date1.setHours(date1.getHours() + 24));
      if (date2.getTime() !== tomorrow.getTime()) {
        labels.splice(index + 1, 0, tomorrow.toLocaleDateString("en-US"));
        simple.splice(index + 1, 0, 0);
      }
    }

    const cumulative = simple.reduce((acc, current) => {
      if (acc.length > 0) {
        acc.push(current + acc[acc.length - 1]);
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as number[]);

    res.json({
      labels,
      data: { simple, cumulative },
    });
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getInscriptions = async (req: Request, res: Response) => {
  const validation = validationResult(req);
  if (!validation.isEmpty()) {
    return res.status(400).json({ err: validation.array() });
  }
  const searchString = req.query.search as string;

  const certificateStatusCondition = parseInt(
    req.query.certificateStatus as string
  );
  const whereCertificateStatus = certificateStatusCondition
    ? { certificate: { status: { equals: certificateStatusCondition } } }
    : {};

  const paymentStatusCondition = req.query.paymentStatus as PaymentStatus;
  const wherePaymentStatus = paymentStatusCondition
    ? { payment: { status: { equals: paymentStatusCondition } } }
    : {};

  const statusCondition = req.query.status as InscriptionStatus;
  const whereStatus = statusCondition
    ? { status: { equals: statusCondition } }
    : {};

  try {
    const inscriptions = await prisma.inscription.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: {
        ...searchingFields(searchString),
        ...req.filter,
        ...whereCertificateStatus,
        ...wherePaymentStatus,
        ...whereStatus,
      },
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(inscriptions, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getInscriptionById = async (req: Request, res: Response) => {
  const inscriptionId = parseInt(req.params.id);
  try {
    const inscription = await prisma.inscription.findUnique({
      where: {
        id: inscriptionId,
      },
      select: selectedFields,
    });
    res.json(inscription);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createInscription = async (req: Request, res: Response) => {
  const { editionId, raceId } = req.body;
  try {
    const edition = await prisma.edition.findUnique({
      where: {
        id: editionId,
      },
    });
    if (edition !== null && edition?.active === true) {
      const race = await prisma.race.findUnique({
        where: {
          id: raceId,
        },
        select: {
          id: true,
          editionId: true,
          maxParticipants: true,
          inscriptions: { select: { status: true } },
        },
      });

      if (race === null) {
        res.status(400);
        res.json({
          err: "Wrong race selection",
        });
        return;
      }

      const inscriptionsNumber = race.inscriptions.filter(
        (obj) => obj.status !== InscriptionStatus.CANCELLED
      ).length;
      if (inscriptionsNumber >= race.maxParticipants) {
        res.status(403);
        res.json({
          err: "Race is full",
        });
        return;
      }

      if (race !== null && race.editionId === edition.id) {
        const athlete = await prisma.athlete.findUnique({
          where: {
            userId: req.user.id,
          },
        });
        const inscriptionAlreadyExists = await prisma.inscription.findFirst({
          where: {
            athleteId: athlete?.id,
            editionId: editionId,
            OR: [
              { status: InscriptionStatus.PENDING },
              { status: InscriptionStatus.VALIDATED },
            ],
          },
        });

        if (athlete !== null && inscriptionAlreadyExists === null) {
          const inscription = await prisma.inscription.create({
            data: {
              athleteId: athlete.id,
              raceId: race.id,
              editionId: edition.id,
            },
          });
          res.status(201).json(inscription);
        } else {
          res.status(400);
          res.json({
            err: "Athlete is null or already registered for this edition",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Wrong race selection.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "Edition is not active.",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const validateInscription = async (req: Request, res: Response) => {
  const inscriptionId = parseInt(req.params.id);
  const { validated } = req.body;
  const status = validated
    ? InscriptionStatus.VALIDATED
    : InscriptionStatus.PENDING;
  try {
    const inscription = await prisma.inscription.update({
      where: {
        id: inscriptionId,
      },
      data: {
        status,
      },
      select: selectedFields,
    });
    res.json(inscription);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const cancelInscription = async (req: Request, res: Response) => {
  const inscriptionId = parseInt(req.params.id);
  try {
    const inscription = await prisma.inscription.update({
      where: {
        id: inscriptionId,
      },
      data: {
        status: InscriptionStatus.CANCELLED,
      },
      select: selectedFields,
    });
    res.json(inscription);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
