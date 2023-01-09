import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "OverRun API",
    version: "1.0.0",
    description: "A REST API application made with Express.",
    license: {
      name: "Licensed Under MIT",
      url: "https://spdx.org/licenses/MIT.html",
    },
    contact: {
      name: "Club des 24 heures de l'INSA",
      url: "https://www.24heures.org/infos/contact",
    },
  },
  servers: [
    {
      url: "/api/v" + (process.env.API_VERSION || "1"),
      description: "Development server",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
