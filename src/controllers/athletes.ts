import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { prisma, saltRounds } from "../server";
import { sendEmail } from "../utils/emails";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
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
  sex: true,
  inscriptions: {
    select: {
      edition: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

const selectedFieldsForMe = {
  ...selectedFields,
  inscriptions: {
    select: {
      edition: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      id: true,
      validated: true,
      va: {
        select: {
          id: true,
        },
      },
      certificate: {
        select: {
          id: true,
          status: true,
          filename: true,
        },
      },
      race: {
        select: {
          id: true,
          name: true,
        },
      },
      payment: {
        select: {
          id: true,
          status: true,
          helloassoCheckoutIntentUrl: true,
          helloassoPaymentReceiptUrl: true,
          raceAmount: true,
          donationAmount: true,
        },
      },
    },
  },
};

function searchingFields(searchString: string): Prisma.AthleteWhereInput {
  if (!searchString || searchString === "") return {};
  return {
    OR: [
      {
        firstName: {
          contains: searchString,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: searchString,
          mode: "insensitive",
        },
      },
      {
        user: {
          username: {
            contains: searchString,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: searchString,
            mode: "insensitive",
          },
        },
      },
    ],
  };
}

export const getAthletes = async (req: Request, res: Response) => {
  try {
    const searchString = req.query.search as string;
    const athletes = await prisma.athlete.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit,
      // where: Object.assign({}, req.filter, req.search),
      where: searchingFields(searchString),
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

export const getAthleteMe = async (req: Request, res: Response) => {
  const id = req.user.athleteId;
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        id,
      },
      select: selectedFieldsForMe,
    });
    res.json(athlete);
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
    sex,
  } = req.body;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      console.error(err);
      res.status(500);
      return res.json({
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

      sendEmail(
        email,
        "Confirmation d'inscription à OverRun",
        "WelecomMessage",
        {
          firstName: firstName,
          url: process.env.FRONTEND_URL,
        }
      );
      res.json(athlete);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2014") {
          res.status(409);
          res.json({
            err: "Email or username already exists.",
          });
        }
      } else {
        console.log(e);
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
  const { firstName, lastName, address, zipCode, city, country, phoneNumber } =
    req.body;
  try {
    const athleteData = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
    });
    if (req.user.role.includes("ADMIN")) {
      const athlete = await prisma.athlete.update({
        where: {
          id: athleteId,
        },
        data: {
          firstName: firstName !== null ? firstName : athleteData?.firstName,
          lastName: lastName !== null ? lastName : athleteData?.lastName,
          address: address !== null ? address : athleteData?.address,
          zipCode: zipCode !== null ? zipCode : athleteData?.zipCode,
          city: city !== null ? city : athleteData?.city,
          country: country !== null ? country : athleteData?.country,
          phoneNumber:
            phoneNumber !== null ? phoneNumber : athleteData?.phoneNumber,
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
          phoneNumber:
            phoneNumber !== null ? phoneNumber : athleteData?.phoneNumber,
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
  const athleteId = parseInt(req.params.id);
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
    });
    const userId = athlete?.userId;
    await prisma.athlete.delete({
      where: {
        id: athleteId,
      },
    });
    const admin = await prisma.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      await prisma.user.delete({
        where: {
          id: userId,
        },
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
