import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Swagger
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Game of Drones API",
    version: "1.0.0",
    description: "API para Game of Drones (Piedra, Papel, Tijeras)"
  }
};
const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts"]
};
const swaggerSpec = swaggerJsdoc(options);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(routes);

app.use(errorHandler);

export default app;
