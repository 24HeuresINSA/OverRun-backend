import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
  id: true,
  name: true,
  description: true,
  races: {
    select: {
      race: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const getDisciplines = async (req: Request, res: Response) => {
  try {
    const disciplines = await prisma.discipline.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(disciplines, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getDisciplineById = async (req: Request, res: Response) => {
  const disciplineId = parseInt(req.params.id);
  try {
    const discipline = await prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      },
      select: selectedFields,
    });
    res.json(discipline);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createDiscipline = async (req: Request, res: Response) => {
  const { name, description, editionId } = req.body;
  try {
    const discipline = await prisma.discipline.create({
      data: {
        name: name,
        description: description,
        editionId: editionId,
      },
      select: selectedFields,
    });
    res.json(discipline);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateDiscipline = async (req: Request, res: Response) => {
  const disciplineId = parseInt(req.params.id);
  const { name, description } = req.body;
  try {
    const discipline = await prisma.discipline.update({
      where: {
        id: disciplineId,
      },
      data: {
        name,
        description,
      },
      select: selectedFields,
    });
    res.json(discipline);
  } catch (e) {
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const deleteDiscipline = async (req: Request, res: Response) => {
  const disciplineId = parseInt(req.params.id);
  try {
    await prisma.discipline.delete({
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
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
