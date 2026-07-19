import { Request, Response, NextFunction } from 'express';
import { SeatService } from '../services/seat.service';

export class SeatController {
  static async getAllSeats(_: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const seats = await SeatService.getAllSeats();
      const stats = await SeatService.getSeatCount();
      
      res.json({
        success: true,
        data: {
          seats,
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableSeats(_: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const seats = await SeatService.getAvailableSeats();
      const stats = await SeatService.getSeatCount();
      
      res.json({
        success: true,
        data: {
          seats,
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSeatStats(_: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await SeatService.getSeatCount();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}