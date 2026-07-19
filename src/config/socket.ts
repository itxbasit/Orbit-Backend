import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';

let socketServer: SocketServer | null = null;

export const initializeSocket = (server: HTTPServer) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003').split(',').map((origin) => origin.trim());

  const io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  socketServer = io;

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      logger.info(`Client ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketServer = () => socketServer;