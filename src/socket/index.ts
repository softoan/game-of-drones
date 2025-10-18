import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export function initSocket(server: HttpServer) {
    io = new IOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", socket => {
        console.log("Socket conectado:", socket.id);

        socket.on("joinGame", (matchId: string) => {
            socket.join(matchId);
            console.log(`Socket ${socket.id} se unió a la sala ${matchId}`);
        });

        socket.on("leaveGame", (matchId: string) => {
            console.log('Salio del juego: ', matchId);

            socket.leave(matchId);
        });

        socket.on("disconnect", () => {
            console.log("Toma desconectada:", socket.id);
        });
    });

    return io;
}

export function getIo() {
    if (!io) throw new Error("Socket.io no inicializado");
    return io;
}
