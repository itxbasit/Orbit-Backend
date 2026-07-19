import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refreshToken); // New refresh endpoint
router.post('/auth/logout', AuthController.logout); // New logout endpoint
router.get('/auth/profile', AuthMiddleware.authenticate, AuthMiddleware.requireAuth, AuthController.getProfile);

export default router;