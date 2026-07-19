import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware, ReservationSchema } from '../middleware/validation.middleware';

const router = Router();

// All reservation operations require authentication
router.post(
  '/reservations',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAuth, // <-- Require authentication
  ValidationMiddleware.validate(ReservationSchema),
  ReservationController.createReservation.bind(ReservationController)
);

router.delete(
  '/reservations/:reservationId',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAuth, // <-- Require authentication
  ReservationController.cancelReservation.bind(ReservationController)
);

router.get(
  '/reservations/:reservationId',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAuth, // <-- Require authentication
  ReservationController.getReservation.bind(ReservationController)
);

router.get(
  '/reservations',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAuth, // <-- Require authentication
  ReservationController.getUserReservations.bind(ReservationController)
);

export default router;