import { Router } from 'express';
import { SeatController } from '../controllers/seat.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Seat viewing is public (authentication optional)
router.get('/seats', AuthMiddleware.authenticate, SeatController.getAllSeats);
router.get('/seats/available', AuthMiddleware.authenticate, SeatController.getAvailableSeats);
router.get('/seats/stats', AuthMiddleware.authenticate, SeatController.getSeatStats);

export default router;