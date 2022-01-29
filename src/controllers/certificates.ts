import { Request, Response } from "express";
import { prisma } from "../server";
import { UploadedFile } from "express-fileupload"
import path from "path";

const selectedFields = {
        id: true,
        filename: true, 
        athlete: {
            select: {
                id: true, 
                email: true,
                pseudo: true, 
                firstName: true, 
                lastName: true
            },
        },
        uploadedAt: true, 
        status: true,
        statusUpdatedAt: true,
        statusUpdatedBy: {
            select: {
                id: true, 
                pseudo: true,
            },
        },
}

export const getCertificates = async(
    req: Request,
    res: Response
) => {
    try{
        const certificates = await prisma.certificate.findMany({
            select: selectedFields,
        });
        res.json(certificates);
    } catch(e){
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

    if (!req.files) {
        res.status(400)
        res.json({
            'err': "No files were uploaded."
        });
    }

    const certificate = req.files.certificate as UploadedFile;
    const extensionName = path.extname(certificate.name);
    const allowedExtension = ['.png', '.jpg', '.jpeg'];

    if(!allowedExtension.includes(extensionName)){
        res.status(422); 
        res.json({
            'err': "Invalid file format."
        })
    }

    const athleteId = parseInt(req.params.id)

    try {
        const athlete = await prisma.athlete.findUnique({
            where: {
                id: athleteId
            }, 
            select: {
                id: true,
                firstName: true, 
                lastName: true,
            },
        });
        const filename = athlete.id + "_" + athlete.firstName.toUpperCase + "_" + athlete.lastName.toUpperCase + extensionName;
        const path = __dirname + "../../public/certificates/" + filename;

        certificate.mv(path, async (err) => {
           if(err) {
            res.status(500);
            res.json({
                'err': 'Internal error.'
            });
           }
           const certificate = await prisma.certificate.upsert({
               where: {
                athleteId: athleteId,
               },
               create: {
                   filename: filename,
                   athlete: {
                       connect: {
                           id: athlete.id,
                       }
                   },
               }, 
               update: {
                    filename: filename,
               },
               select: {
                   id: true,
                   filename: true,
                   athlete: {
                       select: {
                           id: true,
                           email: true,
                           pseudo: true,
                           firstName: true, 
                           lastName: true,
                       },
                   },
               },
           });
           res.json(certificate);
        })
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const getCertificateImage = async (
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
                filename: true,
            },
        }); 
        const filePath = __dirname + "../../public/certificates/" + certificate.filename;
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
    const certificateId = parseInt(req.params.id);
    try {
        const certificate = await prisma.certificate.findUnique({
            where: {
                id: certificateId
            },
            select: selectedFields,
        });
        res.json(certificate);
    }catch(e){
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
    const status = parseInt(req.body.status);
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
    }catch(e){
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
                        pseudo: true,
                    },
                },
            },
        }); 
        res.json(certificate);
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}