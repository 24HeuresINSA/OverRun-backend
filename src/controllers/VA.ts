// import { prisma } from "../server";
// import { Request, Response } from "express";
// import axios from "axios";

// const selectedFields = {
//     va: true,
//     athlete: {
//         select: {
//             user: {
//                 select: {
//                     id: true,
//                     email: true,
//                     username: true,
//                 },
//             },
//             fistName: true,
//             lastName: true,
//         },
//     },
//     edition: {
//         select: {
//             id: true,
//             name: true,
//         },
//     },
// };

// export const checkVA = async(
//     req: Request, 
//     res: Response
// ) => {
//     const { VA, vaFirstName, vaLastName,  editionId } = req.body;

//     try {
//       const tokenResponse = await axios.post(
//         String(process.env.EDB_VA_ENDPOINT),
//         {
//           client_id: String(process.env.EDB_VA_CLIENT_ID),
//           client_secret: String(process.env.EDB_VA_TOKEN),
//           grant_type: "client_credentials",
//         }
//       );
//       // if (tokenResponse.status > 300) {
        
//       // }
//     } catch (err) {
//       res.status(500);
//       res.json({
//         err: "Internal error.",
//       });
//     }

   


// }