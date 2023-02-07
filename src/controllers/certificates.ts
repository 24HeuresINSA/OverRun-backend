import { Request, Response } from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import { prisma } from "../server";
import { sendEmail } from "../utils/emails";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { InscriptionStatus } from "./inscriptions";

const selectedFields = {
  id: true,
  filename: true,
  inscription: {
    select: {
      id: true,
      athlete: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
  },
  uploadedAt: true,
  status: true,
  statusUpdatedAt: true,
  statusUpdatedBy: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  },
};

const path = "./certificates/";

export const getCertificates = async (req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit + 1,
      where: { ...req.search, ...req.filter },
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(certificates, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const uploadCertificate = async (req: Request, res: Response) => {
  const { editionId } = req.body;
  try {
    if (req.files) {
      const inscription = await prisma.inscription.findFirst({
        where: {
          athlete: {
            is: {
              userId: req.user.id,
            },
          },
          editionId: parseInt(editionId),
          OR: [
            { status: InscriptionStatus.PENDING },
            { status: InscriptionStatus.VALIDATED },
          ],
        },
      });
      // const inscriptions = await prisma.inscription.findMany();
      if (inscription !== null) {
        const certificate_file = req.files
          ?.certificate as fileUpload.UploadedFile;
        let extention = ";";
        switch (certificate_file.mimetype) {
          case "application/pdf":
            extention = ".pdf";
            break;
          default:
            extention = ".png";
        }
        const filename = Date.now().toString() + extention;
        certificate_file.mv(path + filename);

        const certificate = await prisma.certificate.findUnique({
          where: {
            inscriptionId: inscription.id,
          },
        });
        if (certificate !== null) {
          try {
            fs.unlinkSync(path + certificate.filename);
          } catch (err) {
            console.error(err);
          }
          res.json(
            await prisma.certificate.update({
              where: {
                id: certificate.id,
              },
              data: {
                filename: filename,
                status: 4,
                statusUpdatedAt: null,
                statusUpdatedById: null,
              },
              select: selectedFields,
            })
          );
        } else {
          res.json(
            await prisma.certificate.create({
              data: {
                filename: filename,
                inscriptionId: inscription.id,
                status: 4,
              },
              select: selectedFields,
            })
          );
        }
      } else {
        res.status(400);
        res.json({
          err: "Athlete must be registered to submit a certificate.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "No files uploaded",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error",
    });
  }
};

export const getCertificateImage = async (req: Request, res: Response) => {
  const certificateId = parseInt(req.params.id);
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId,
      },
      select: {
        id: true,
        filename: true,
      },
    });
    const filePath = __dirname + path + certificate?.filename;
    res.sendFile(filePath);
  } catch (e) {
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getCertificateData = async (req: Request, res: Response) => {
  const certificateId = parseInt(req.params.id);
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId,
      },
      select: selectedFields,
    });
    res.json(certificate);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateCertificateStatus = async (req: Request, res: Response) => {
  const certificateId = parseInt(req.params.id);
  const { status, statusUpdatedById, reason } = req.body;

  try {
    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
      },
      data: {
        status,
        statusUpdatedById: +statusUpdatedById,
        statusUpdatedAt: new Date(),
      },
      select: selectedFields,
    });

    if (status === 5) {
      // refused
      sendEmail(
        certificate.inscription.athlete.user.email,
        "Refus de votre certificat",
        "RefuseCertificate",
        {
          firstName: certificate.inscription.athlete.firstName,
          url: process.env.FRONTEND_URL,
          reason: reason,
        }
      );
    }
    res.json(certificate);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getCertificateStatus = async (req: Request, res: Response) => {
  const certificateId = parseInt(req.params.id);
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId,
      },
      select: {
        id: true,
        status: true,
        statusUpdatedAt: true,
        statusUpdatedBy: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });
    res.json(certificate);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const findPreviousCertificate = async (req: Request, res: Response) => {
  try {
    const previousCertificate = await prisma.certificate.findFirst({
      where: {
        status: { not: 5 },
        inscription: {
          is: {
            edition: {
              active: true,
            },
            athlete: {
              is: {
                userId: req.user.id,
              },
            },
          },
        },
      },
      select: selectedFields,
    });

    if (previousCertificate === null) {
      res.status(404);
      res.json({ err: "no prior inscription" });
      return;
    }

    res.status(200);
    res.json(previousCertificate);
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateCertificateInscription = async (
  req: Request,
  res: Response
) => {
  try {
    const certificateId = parseInt(req.params.id);

    const inscription = await prisma.inscription.findFirst({
      where: {
        athlete: {
          is: {
            userId: req.user.id,
          },
        },
        edition: {
          active: true,
        },
        OR: [
          { status: InscriptionStatus.PENDING },
          { status: InscriptionStatus.VALIDATED },
        ],
      },
    });

    if (!inscription) {
      return res.status(404).json({
        err: "Inscription not found.",
      });
    }

    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
      },
      data: {
        status: 4,
        statusUpdatedById: null,
        statusUpdatedAt: new Date(),
        inscriptionId: inscription.id,
      },
      select: selectedFields,
    });
    res.status(200);
    res.json(certificate);
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
