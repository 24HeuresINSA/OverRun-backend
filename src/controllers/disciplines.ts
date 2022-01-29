import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
    id: true, 
    name: true, 
    description: true, 
    races: {
        select: {
            raceId: true,
        }
    }
};

export const getDisciplines = async (
    req: Request, 
    res: Response,
) => {
    try {
        const disciplines = await prisma.discipline.findMany({
            skip: req.paginate.skipIndex,
            take: req.paginate.limit,
            where: req.search,
            select: selectedFields,
        }); 
        res.json(jsonPaginateResponse(disciplines, req));
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const getDisciplineById = async (
    req: Request, 
    res: Response
) => {
    const disciplineId = parseInt(req.params.id);
    try {
        const discipline = await prisma.discipline.findUnique({
            where: {
                id: disciplineId,
            },
            select: selectedFields,
        });
        res.json(discipline);
    } catch(e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const createDiscipline = async (
    req: Request, 
    res: Response
) => {
    try {
        const discipline = await prisma.discipline.create({
            data: req.body,
            select: selectedFields,
        }); 
        res.json(discipline);
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}; 

export const updateDiscipline = async(
    req: Request, 
    res: Response
) => {
    const disciplineId = parseInt(req.params.id);
    if (req.body.id) {
        delete req.body.id;
    }
    try {
         const discipline = await prisma.discipline.update({
             where: {
                 id: disciplineId,
             }, 
             data: req.body, 
             select: selectedFields,
         }); 
         res.json(discipline);
    } catch(e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const deleteDiscipline = async (
    req: Request, 
    res: Response
) => {
    const disciplineId = parseInt(req.params.id);
    try {
        const discipline = await prisma.discipline.delete({
            where: {
                id: disciplineId,
            }, 
            select: {
                name: true,
            },
        }); 
        res.json({
          success: "Discipline deleted successfully.",
        });
    } catch(e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};