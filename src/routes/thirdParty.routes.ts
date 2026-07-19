import { Router } from 'express';
import { ThirdPartyController } from '../controllers/thirdParty.controller';
import { ValidationMiddleware, ThirdPartyReservationSchema } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/third-party/reservations',
  ValidationMiddleware.validate(ThirdPartyReservationSchema),
  ThirdPartyController.createReservation
);

router.get(
  '/third-party/reservations/:reservationId',
  ThirdPartyController.getReservation
);

export default router;