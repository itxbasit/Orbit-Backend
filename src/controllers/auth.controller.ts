import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// Store refresh tokens (in production, use Redis or database)
const refreshTokenStore = new Map<string, { userId: string, expiresAt: number }>();

export class AuthController {
  private static generateTokens(userId: string, email: string, role: string) {
    const accessToken = jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, email, role },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    refreshTokenStore.set(refreshToken, {
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    return { accessToken, refreshToken };
  }

  private static setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSiteValue = isProduction ? 'strict' : 'lax';

    // Access Token Cookie (15 minutes)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue as 'strict' | 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    // Refresh Token Cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue as 'strict' | 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User already exists with this email'
        });
        return;
      }

      const userId = uuidv4();
      const user = new User({
        userId,
        name,
        email,
        password,
        role: 'user'
      });

      await user.save();

      const { accessToken, refreshToken } = AuthController.generateTokens(
        user.userId,
        user.email,
        user.role
      );

      AuthController.setTokenCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        data: {
          user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      const { accessToken, refreshToken } = AuthController.generateTokens(
        user.userId,
        user.email,
        user.role
      );

      AuthController.setTokenCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        data: {
          user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: 'No refresh token provided'
        });
        return;
      }

      const storedToken = refreshTokenStore.get(refreshToken);
      if (!storedToken) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
        return;
      }

      if (storedToken.expiresAt < Date.now()) {
        refreshTokenStore.delete(refreshToken);
        res.status(401).json({
          success: false,
          error: 'Refresh token expired'
        });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
      } catch (error) {
        refreshTokenStore.delete(refreshToken);
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
        return;
      }

      const user = await User.findOne({ userId: decoded.userId });
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } = AuthController.generateTokens(
        user.userId,
        user.email,
        user.role
      );

      refreshTokenStore.delete(refreshToken);
      AuthController.setTokenCookies(res, accessToken, newRefreshToken);

      res.json({
        success: true,
        data: {
          user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        refreshTokenStore.delete(refreshToken);
      }

      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId || userId === 'anonymous') {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await User.findOne({ userId });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}