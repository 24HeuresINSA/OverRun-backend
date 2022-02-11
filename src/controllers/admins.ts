import { Request, Response } from "express";
import { prisma } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";


const selectedFields = {
  id: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
    },
  },
  active: true,
};

export const getAdmins = async (req: Request, res: Response) => {
  try {
    console.log(getAdmins);
    const admins = await prisma.admin.findMany({
      select: selectedFields,
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: Object.assign({}, req.search, req.filter),
    });
    res.json(jsonPaginateResponse(admins, req));
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getAdminById = async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id);
  try {
    const admin = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
      select: selectedFields,
    });
    res.json(admin);
  } catch (e) {
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const activateAdmin = async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id);
  const activate = Boolean(req.body.activate);
  try {
    const adminData = await prisma.admin.findUnique({
      where: {
        id: adminId,
      }
    });
    const admin = await prisma.admin.update({
      where: {
        id: adminId
      },
      data: {
        active: (activate) ? activate : !adminData?.active
      },
      select: selectedFields
    });
    res.json(admin);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id);
  try {
    await prisma.admin.delete({
      where: {
        id: adminId,
      },
    });
    res.json({
      success: "Admin deleted successfully."
    });
  } catch (err) {
    console.error(err)
    res.status(500);
    res.json({
      err: "Internal error",
    });
  }
};
