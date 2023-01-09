import { prisma, saltRounds } from "../server";
import bcrypt from "bcrypt";

export const createAdmin = async () => {
  const username = "pintade";
  const password = "pintade";
  const email = "pintade@gmail.com";
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      console.log(err);
    }
    try {
      await prisma.admin.create({
        data: {
          user: {
            create: {
              email: email,
              username: username,
              password: hash,
            },
          },
          active: true,
        },
      });
      console.log(`Super user created: 
    pseudo: ${username}
    email: ${email}
    password: ${password}`);
    } catch (err) {
      console.log(err);
    }
  });
};

createAdmin();
