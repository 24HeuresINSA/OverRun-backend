import { prisma } from "../server";
import { Request, Response } from "express";
import axios from "axios";

const selectedFields = {
    va: true,
    athlete: {
        select: {
            user: {
                select: {
                    id: true,
                    email: true,
                    username: true,
                },
            },
            fistName: true,
            lastName: true,
        },
    },
    edition: {
        select: {
            id: true,
            name: true,
        },
    },
};

export const getVAs = async (
    req: Request,
    res: Response
) => {
    console.log(getVAs);
    try {
        const VAs = await prisma.vA.findMany({
            where: req.search,
            skip: req.paginate.skipIndex,
            take: req.paginate.limit,
            select: selectedFields
        });
        res.json(VAs)
    } catch (err) {
        res.status(500);
        res.json({
            err: "Internal error.",
        });
    }
};

export const checkVA = async(
    req: Request, 
    res: Response
) => {
    const { VA, editionId } = req.body;

    try {
      axios
        .post(String(process.env.EDB_VA_ENDPOINT), {})
        .then(async (response) => {
          if (response.status == 200) {
            const va = await prisma.vA.create({
              data: {
                va: VA,
                athleteId: req.user.id,
                editionId: editionId,
              },
            });
            res.json(va);
          }
        });
    } catch (err) {
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }

   


}