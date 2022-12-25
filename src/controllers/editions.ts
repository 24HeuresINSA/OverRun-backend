import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  active: true,
};

export const getEditions = async (req: Request, res: Response) => {
  try {
    const editions = await prisma.edition.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(editions, req));
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getEditionById = async (req: Request, res: Response) => {
  const editionId = parseInt(req.params.id);
  try {
    const edition = await prisma.edition.findUnique({
      where: {
        id: editionId,
      },
    });
    res.json(edition);
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getCurrentEdition = async (req: Request, res: Response) => {
  try {
    const edition = await prisma.edition.findFirst({
      where: {
        active: true,
      },
      select: selectedFields,
    });
    res.json(edition);
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createEdition = async (req: Request, res: Response) => {
  const {
    name,
    startDate,
    endDate,
    registrationStartDate,
    registrationEndDate,
    active,
  } = req.body;
  try {
    const edition = await prisma.edition.create({
      data: {
        name: name,
        startDate: new Date(startDate * 1000),
        endDate: new Date(endDate * 1000),
        registrationStartDate: new Date(registrationStartDate * 1000),
        registrationEndDate: new Date(registrationEndDate * 1000),
        active: active,
      },
      select: selectedFields,
    });
    res.json(edition);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateEdition = async (req: Request, res: Response) => {
  const editionId = parseInt(req.params.id);
  const {
    name,
    startDate,
    endDate,
    registrationStartDate,
    registrationEndDate,
    active,
  } = req.body;
  try {
    const edition = await prisma.edition.findUnique({
      where: {
        id: editionId,
      },
    });
    const data = {
      name: name !== null ? name : edition?.name,
      startDate:
        startDate !== null ? new Date(1000 * startDate) : edition?.startDate,
      endDate: endDate !== null ? new Date(1000 * endDate) : edition?.endDate,
      registrationStartDate:
        registrationStartDate !== null
          ? new Date(1000 * registrationStartDate)
          : edition?.registrationStartDate,
      registrationEndDate:
        registrationEndDate !== null
          ? new Date(1000 * registrationEndDate)
          : edition?.registrationEndDate,
      active: active !== null ? active : edition?.active,
    };
    const updatedEdition = await prisma.edition.update({
      where: {
        id: editionId,
      },
      data: data,
      select: selectedFields,
    });
    res.json(updatedEdition);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const deleteEdition = async (req: Request, res: Response) => {
  const editionId = parseInt(req.params.id);
  try {
    await prisma.edition.delete({
      where: {
        id: editionId,
      },
    });
    res.json({
      success: "Edition deleted successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
