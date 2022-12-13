import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

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
    },
  },
  certificate: {
    select: {
      id: true,
      status: true,
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
  validated: true,
};

export const getInscriptions = async (req: Request, res: Response) => {
  console.log(getInscriptions);
  try {
    const inscriptions = await prisma.inscription.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
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
  console.log(getInscriptionById);
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
  console.log(createInscription);
  const { editionId, raceId } = req.body;
    try {
        const edition = await prisma.edition.findUnique({
            where: {
                id: editionId
            },
        });
        if (edition !== null && edition?.active === true) {
            const race = await prisma.race.findUnique({
                where: {
                    id: raceId,
                },
            });
            if (race !== null && race.editionId === edition.id) {
                const athlete = await prisma.athlete.findUnique({
                    where: {
                        userId: req.user.id,
                    },
                });
                const inscriptionAlreadyExists =
                  await prisma.inscription.findFirst({
                    where: {
                      athleteId: athlete?.id,
                      editionId: editionId,
                    },
                  });
                if (athlete !== null && inscriptionAlreadyExists === null) {
                    const inscription = await prisma.inscription.create({
                        data: {
                            athleteId: athlete.id,
                            raceId: race.id,
                            editionId: edition.id,
                        }
                    });
                  res.json(inscription);
                } else {
                  res.status(400);
                  res.json({
                    err: "Athlete is null or already registered for this edition",
                  });
                }
            } else {
                res.status(400); 
                res.json({
                    "err": "Wrong race selection."
                })
            }  
        } else {
            res.status(400);
            res.json({
                "err": "Edition is not active."
            })
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
  console.log(validateInscription);
  const inscriptionId = parseInt(req.params.id);
  const { validated } = req.body;
  try {
    const inscription = await prisma.inscription.update({
      where: {
        id: inscriptionId,
      },
      data: {
        validated: validated,
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
