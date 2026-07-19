import { Router } from 'express';
import { SimulationController } from '../controllers/simulation.controller';

const router = Router();

router.post('/simulation/run', SimulationController.runSimulation);
router.post('/simulation/reset', SimulationController.resetSeats);

export default router;