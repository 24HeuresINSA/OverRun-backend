import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

export const selectedFields = {
  id: true,
  name: true,
  description: true,
  maxTeamMembers: true,
  minTeamMembers: true,
  races: {
    select: {
      id: true,
      name: true,
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: selectedFields,
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
    });
    res.json(jsonPaginateResponse(categories, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getCategoriesLight = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        maxTeamMembers: true,
        minTeamMembers: true,
      },
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
    });
    res.json(jsonPaginateResponse(categories, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  const categoryId = parseInt(req.params.id);
  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: selectedFields,
    });
    res.json(category);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createCategroy = async (req: Request, res: Response) => {
  const { name, description, maxTeamMembers, minTeamMembers, editionId } =
    req.body;
  try {
    const category = await prisma.category.create({
      data: {
        name: name,
        description: description,
        maxTeamMembers: maxTeamMembers,
        minTeamMembers: minTeamMembers,
        editionId: editionId,
      },
      select: selectedFields,
    });
    res.json(category);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const categoryId = parseInt(req.params.id);
  const { description, minTeamMembers, maxTeamMembers } = req.body;
  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });
    const data = {
      description: description !== null ? description : category?.description,
      minTeamMembers:
        minTeamMembers !== null ? minTeamMembers : category?.minTeamMembers,
      maxTeamMembers:
        maxTeamMembers !== null ? maxTeamMembers : category?.maxTeamMembers,
    };
    const updatedCategory = await prisma.category.update({
      where: {
        id: categoryId,
      },
      data: data,
      select: selectedFields,
    });
    res.json(updatedCategory);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const deleteCatgeory = async (req: Request, res: Response) => {
  const categoryId = parseInt(req.params.id);
  try {
    await prisma.category.delete({
      where: {
        id: categoryId,
      },
      select: {
        name: true,
      },
    });
    res.json({
      success: "Category deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
