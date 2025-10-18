import mongoose from "mongoose";
import config from "./config/index";
import app from "./index";
import dotenv from "dotenv";
import http from "http";
import { initSocket } from "./socket";
dotenv.config();

async function server() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Conectado a MongoDB:", config.mongoUri);

    const server = http.createServer(app);
    initSocket(server);

    server.listen(config.port, () => {
      console.log(`Servidor ejecutándose en el puerto ${config.port}`);
      console.log(`Swagger UI: http://localhost:${config.port}/api/docs`);
    });
  } catch (err) {
    console.error("No se pudo iniciar el servidor", err);
    process.exit(1);
  }
}

server();
