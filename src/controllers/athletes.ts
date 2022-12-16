import { Request, Response } from "express";
import { prisma, saltRounds } from "../server";
import bcrypt from "bcrypt";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
// import { adminInvitationRouter } from "../routes/adminInvitations";

const selectedFields = {
  id: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
    },
  },
  firstName: true,
  lastName: true,
  address: true,
  zipCode: true,
  city: true,
  country: true,
  phoneNumber: true,
  dateOfBirth: true,
  sex: true
};

export const getAthletes = async (req: Request, res: Response) => {
  console.log(getAthletes);
  try {
    const athletes = await prisma.athlete.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit,
      where: Object.assign({}, req.filter, req.search),
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(athletes, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getAthleteById = async (req: Request, res: Response) => {
  console.log(getAthleteById);
  const athleteId = parseInt(req.params.id);
  try {
    if (req.user.role.includes("ADMIN")) {
      const athlete = await prisma.athlete.findUnique({
        where: {
          id: athleteId,
        },
        select: selectedFields,
      });
      res.json(athlete);
    } else {
      const athlete = await prisma.athlete.findUnique({
        where: {
          id: athleteId,
          userId: req.user.id,
        },
        select: selectedFields,
      });
      res.json(athlete);
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createAthlete = async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    address,
    zipCode,
    city,
    country,
    phoneNumber,
    email,
    username,
    password,
    dateOfBirth,
    sex
  } = req.body;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      console.error(err);
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
    try {
      const athlete = await prisma.athlete.create({
        data: {
          user: {
            connectOrCreate: {
              create: {
                username: username,
                email: email,
                password: hash,
              },
              where: {
                email: email,
              },
            },
          },
          firstName: firstName,
          lastName: lastName,
          address: address,
          zipCode: zipCode,
          city: city,
          country: country,
          phoneNumber: phoneNumber,
          sex: sex, 
          dateOfBirth: new Date(Date.parse(dateOfBirth)),
        },
        select: selectedFields,
      });
      res.json(athlete);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2014') {
          res.status(409)
          res.json({
            err: "Email or username already exists."
          });
        }
      } else {
        res.status(500);
        res.json({
          err: "Internal error.",
        });
      }
    }
  });
};

export const updateAthlete = async (req: Request, res: Response) => {
  console.log(updateAthlete);
  const athleteId = parseInt(req.params.id);
  const { firstName, lastName, address, zipCode, city, country, phoneNumber } = req.body;
  try {
    const athleteData = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
    })
    if (req.user.role.includes("ADMIN")) {
      const athlete = await prisma.athlete.update({
        where: {
          id: athleteId,
        },
        data: {
          firstName: firstName !== null ? firstName : athleteData?.firstName, 
          lastName: lastName !== null ? lastName : athleteData?.lastName, 
          address: address !== null ? address: athleteData?.address, 
          zipCode: zipCode !== null ? zipCode : athleteData?.zipCode, 
          city: city !== null ? city : athleteData?.city, 
          country: country !== null ? country : athleteData?.country,
          phoneNumber: phoneNumber !== null ? phoneNumber : athleteData?.phoneNumber
        },
        select: selectedFields,
      });
      res.json(athlete);
    } else {
      const athlete = await prisma.athlete.update({
        where: {
          id: athleteId,
          userId: req.user.id,
        },
        data: {
          firstName: firstName !== null ? firstName : athleteData?.firstName,
          lastName: lastName !== null ? lastName : athleteData?.lastName,
          address: address !== null ? address : athleteData?.address,
          zipCode: zipCode !== null ? zipCode : athleteData?.zipCode,
          city: city !== null ? city : athleteData?.city,
          country: country !== null ? country : athleteData?.country,
          phoneNumber: phoneNumber !== null ? phoneNumber : athleteData?.phoneNumber,
        },
        select: selectedFields,
      });
      res.json(athlete);
    }
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const deleteAthlete = async (req: Request, res: Response) => {
  console.log(deleteAthlete);
  const athleteId = parseInt(req.params.id);
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      }
    });
    const userId = athlete?.userId;
    await prisma.athlete.delete({
      where: {
        id: athleteId,
      },
    });
    const admin = await prisma.admin.findFirst({
      where: {
        userId: userId
      }
    }); 
    if (!admin) {
      await prisma.user.delete({
        where: {
          id: userId,
        }
      });
    }
    res.json({
      success: "Athlete deleted successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
