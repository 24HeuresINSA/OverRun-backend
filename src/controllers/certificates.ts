import { Request, Response } from "express";
import { prisma } from "../server";
import fs from "fs";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import fileUpload from "express-fileupload";

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
                    email: true
                },
            },
      },
  },
};

const path = "./certificates/";

export const getCertificates = async(
    req: Request,
    res: Response
) => {
    console.log(getCertificates)
    try {
        const certificates = await prisma.certificate.findMany({
            skip: req.paginate.skipIndex,
            take: req.paginate.limit + 1,
            where: req.search, 
            select: selectedFields
        });
        res.json(jsonPaginateResponse(certificates, req));
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const uploadCertificate = async(
    req: Request, 
    res: Response
) => {
    console.log(uploadCertificate);
    const { editionId } = req.body;
    console.log("User id: " + req.user.id);
    try {
        if (req.files) {
            console.log("Ok file");
            const inscription = await prisma.inscription.findFirst({
                where: {
                    athlete: {
                        is: {
                            userId : req.user.id
                        }
                    },
                    editionId: parseInt(editionId)
                },
            });
            // const inscriptions = await prisma.inscription.findMany();
            console.log(inscription)
            if (inscription !== null) {
                console.log(req.files)
                const certificate_file = req.files
                    ?.certificate as fileUpload.UploadedFile;
                console.log(certificate_file)
                let extention = ";"
                switch (certificate_file.mimetype) {
                    case 'application/pdf':
                        extention = ".pdf";
                        break;
                    default:
                        extention = ".png";
                }
                const filename = Date.now().toString() + extention;
                console.log(filename)
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
                    res.json(await prisma.certificate.update({
                        where: {
                            id: certificate.id,
                        },
                        data: {
                            filename: filename,
                            status: 4,
                            statusUpdatedAt: null,
                            statusUpdatedById: null
                        },
                        select: selectedFields,
                    })
                    )
                } else {
                    res.json(
                        await prisma.certificate.create({
                            data: {
                                filename: filename,
                                inscriptionId: inscription.id,
                                status: 4
                            },
                            select: selectedFields
                        })
                    )
                }
                
            } else {
                res.status(400);
                res.json({
                    err: "Athlete must be registered to submit a certificate."
                });
            }
        } else {
            res.status(400);
            res.json({
                err: "No files uploaded"
            })
        }
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            err: "Internal error",
        })
    }
}

export const getCertificateImage = async (
    req: Request,
    res: Response
) => {
    console.log(getCertificateImage);
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
            'err': 'Internal error.'
        });
    }
};

export const getCertificateData = async (
    req: Request, 
    res: Response
) => {
    console.log(getCertificateData);
    const certificateId = parseInt(req.params.id);
    try {
        const certificate = await prisma.certificate.findUnique({
            where: {
                id: certificateId
            },
            select: selectedFields,
        });
        res.json(certificate);
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const updateCertificateStatus = async (
    req: Request, 
    res: Response
) => {
    const certificateId = parseInt(req.params.id);
    const { status } = req.body;
    try{
        const certificate = await prisma.certificate.update({
            where: {
                id: certificateId,
            }, 
            data: {
                status: status,
            }
        });
        res.json(certificate);
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const getCertificateStatus = async (
    req: Request,
    res: Response
) => {
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
            'err': 'Internal error.'
        });
    }
};
