import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ErrorMiddleware {
  static handle(error: any, req: Request, res: Response, _: NextFunction): Response {
    logger.error('Error:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry detected'
      });
    }

    // MongoDB validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.errors
      });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  static notFound(req: Request, res: Response): Response {
    return res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`
    });
  }
}