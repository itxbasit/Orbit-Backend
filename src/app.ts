import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; 

import { connectDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import { logger } from './utils/logger';
import { ErrorMiddleware } from './middleware/error.middleware';
import { SeatService } from './services/seat.service';

// Import routes
import seatRoutes from './routes/seat.routes';
import thirdPartyRoutes from './routes/thirdParty.routes';
import simulationRoutes from './routes/simulation.routes';
import reservationRoutes from './routes/reservation.routes';
import authRoutes from './routes/auth.routes';

// Import controllers for socket initialization
import { ReservationController } from './controllers/reservation.controller';
import { ThirdPartyController } from './controllers/thirdParty.controller';
import { SimulationController } from './controllers/simulation.controller';
import { startExpiryScheduler } from './jobs/expiry.job';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003').split(',').map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-admin-key']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// ✅ Initialize socket in controllers BEFORE routes
// This is the critical part - make sure it's called
logger.info('🔄 Initializing controllers with Socket.IO...');
ReservationController.initialize(io);
ThirdPartyController.initialize(io);
SimulationController.initialize(io);
logger.info('✅ All controllers initialized');

// Routes
app.use('/api', seatRoutes);
app.use('/api', reservationRoutes);
app.use('/api', thirdPartyRoutes);
app.use('/api', simulationRoutes);
app.use('/api', authRoutes);

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(ErrorMiddleware.notFound);
app.use(ErrorMiddleware.handle);

// Initialize database and server
const startServer = async () => {
  try {
    await connectDatabase();
    await SeatService.initializeSeats();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Socket.IO server running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      
      // Start expiry scheduler if needed
      startExpiryScheduler();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

startServer();

export { app, server, io };