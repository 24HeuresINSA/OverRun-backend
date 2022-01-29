import { Request, Response } from "express";
import { prisma } from "../server";


const selectedFields = {
    id: true, 
    registrationPrice: true,
    maxParticipants: true,
    disciplines: {
        select: {
            id: true, 
            name: true,
            descirption: true,
        }
    }, 
    categories: {
        select: {
            categories: {
                select: {
                    id: true, 
                    name: true, 
                    description: true,
                    maxTeamMembers: true, 
                    minTeamMembers: true,
                }
            }
        }
    }
}

export const getRaces = async (
    req: Request, 
    res: Response
) => {
    try {
        const races = await prisma.race.findMany({
            select: selectedFields,
        });
        res.json(races);
    } catch (e) {
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
    const raceId = parseInt(req.params.id);
    try{
        const race = await prisma.race.findUnique({
            where: {
                id: raceId,
            },
        });
        res.json(race);
    } catch(e){
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
    const { registrationPrice, vaRegistrationPrice, maxParticipants, maxTeams, disciplines, categoryId } = req.body;
    try {
        const race = await prisma.race.create({
            data: {
                registrationPrice: registrationPrice,
                vaRegistrationPrice: vaRegistrationPrice,
                maxParticipants: maxParticipants,
                maxTeams: maxTeams,
                categoryId: categoryId
            },
        });
        for (const discipline of disciplines) {
            await prisma.raceDiscipline.create({
                data: {
                    raceId: race.id,
                    disciplineId: discipline.id,
                    duration: discipline.duration,
                },
            });
        }
        const finalRace = await prisma.race.findUnique({
            where: {
                id: race.id,
            },
            select: selectedFields,
        });
        res.json(finalRace);
    } catch (err) {
        res.status(500);
        res.json({
            err: "Internal error.",
        });
    }
};

export const deleteRace = async(
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
        res.status(500);
        res.json({
          err: "Internal error.",
        });
    }
}


