import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";


const selectedFields = {
    id: true,
    name: true,
    registrationPrice: true,
    vaRegistrationPrice: true,
    maxParticipants: true,
    maxTeams: true,
    inscriptions: {
        select: {
            id: true,
        },
    },
    teams: {
        select: {
            id: true,
        },
    },
    disciplines: {
        select: {
            id: true,
            discipline: {
                select: {
                    id: true,
                    name: true,
                }
            },
            duration: true,
        }
    },
    category: {
        select: {
            id: true,
            name: true,
        },
    },
};

export const getRaces = async (
    req: Request, 
    res: Response
) => {
    console.log(getRaces);
    try {
        const races = await prisma.race.findMany({
            skip: req.paginate.skipIndex,
            take: req.paginate.limit + 1,
            where: Object.assign({}, req.search, req.filter),
            select: selectedFields,
        });
        res.json(jsonPaginateResponse(races, req));
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const getRaceById = async (
    req: Request,
    res: Response
) => {
    console.log(getRaceById);
    const raceId = parseInt(req.params.id);
    try{
        const race = await prisma.race.findUnique({
            where: {
                id: raceId,
            },
            select: selectedFields
        });
        res.json(race);
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};


export const createRace = async (
    req: Request,
    res: Response,
) => {
    console.log(createRace);
    const { name, registrationPrice, vaRegistrationPrice, maxParticipants, maxTeams, disciplineIds, categoryId, editionId } = req.body;
    try {
        const category = await prisma.category.findUnique({
            where: {
                id: categoryId,
            },
        });
        if (category !== null && category.editionId == editionId) {
            const race = await prisma.race.create({
              data: {
                name: name,
                registrationPrice: registrationPrice,
                vaRegistrationPrice: vaRegistrationPrice,
                maxParticipants: maxParticipants,
                maxTeams: maxTeams,
                categoryId: categoryId,
                editionId: editionId,
              },
            });
            if (disciplineIds.length > 0) {
              for (const discipline of disciplineIds) {
                const DBdiscipline = await prisma.discipline.findUnique({
                  where: {
                    id: discipline.id,
                  },
                });
                if (
                  DBdiscipline !== null &&
                  DBdiscipline.editionId == editionId
                ) {
                  await prisma.raceDiscipline.create({
                    data: {
                      raceId: race.id,
                      disciplineId: discipline.id,
                      duration: discipline.duration,
                    },
                  });
                }
              }
            }
             const finalRace = await prisma.race.findUnique({
               where: {
                 id: race.id,
               },
               select: selectedFields,
             });
             res.json(finalRace);
        } else {
            res.status(400); 
            res.json({
                "err": "Category selected is not available for this edition"
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

export const updateRace = async (
    req: Request,
    res: Response
) => {
    console.log(updateRace);
    const raceId = parseInt(req.params.id);
    const { name, registrationPrice, vaRegistrationPrice, maxParticipants, maxTeams, disciplineIds, categoryId } = req.body;
    try {
        const race = await prisma.race.findUnique({
            where: {
                id: raceId,
            }
        });
        const data = {
          name: name !== null ? name : race?.name,
          registrationPrice:
            registrationPrice !== null
              ? registrationPrice
              : race?.registrationPrice,
          vaRegistrationPrice:
            vaRegistrationPrice !== null
              ? vaRegistrationPrice
              : race?.vaRegistrationPrice,
          maxParticipants:
            maxParticipants !== null ? maxParticipants : race?.maxParticipants,
          maxTeams: maxTeams !== null ? maxTeams : race?.maxTeams,
          categoryId: categoryId !== null ? categoryId : race?.categoryId,
        };
        if (categoryId !== null) {
            const category = await prisma.category.findUnique({
                where: {
                    id: categoryId,
                },
            });
            if (category !== null && category.editionId === race?.editionId) {
                data.categoryId = race.categoryId;
            }
        }
       
        if (disciplineIds.length > 0) {
             await prisma.raceDiscipline.deleteMany({
               where: {
                 raceId: raceId,
               },
             });
          for (const discipline of disciplineIds) {
            const DBdiscipline = await prisma.discipline.findUnique({
              where: {
                id: discipline.id,
              },
            });
            if (DBdiscipline !== null && DBdiscipline.editionId == race?.editionId) {
              await prisma.raceDiscipline.create({
                data: {
                  raceId: race.id,
                  disciplineId: discipline.id,
                  duration: discipline.duration,
                },
              });
            }
          }
        }
        const updatedRace = await prisma.race.update({
            where: {
                id: raceId,
            },
            data: data,
            select: selectedFields
        });
        res.json(updatedRace);
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            err: "Internal error.",
        });
    }

};

export const deleteRace = async (
    req: Request,
    res: Response
) => {
    console.log(deleteRace);
    const raceId = parseInt(req.params.id);
    try {
        await prisma.race.delete({
            where: {
                id: raceId,
            },
        });
        res.json({
            success: "Race deleted successfully"
        })
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            err: "Internal error.",
        });
    }
};
