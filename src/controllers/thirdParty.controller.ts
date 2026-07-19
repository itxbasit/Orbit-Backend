import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { SeatService } from '../services/seat.service';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export class ThirdPartyController {
  // Make io optional
  private static io: Server | undefined;

  static initialize(io: Server): void {
    this.io = io;
    logger.info('✅ ThirdPartyController initialized with Socket.IO');
  }

  static async createReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        userId, 
        userName, 
        userEmail, 
        seats 
      } = req.body;

      // Validate API key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.THIRD_PARTY_API_KEY) {
        res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
        return;
      }

      if (!userId || !userName || !userEmail || !seats) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, userName, userEmail, seats'
        });
        return;
      }

      if (!Array.isArray(seats) || seats.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Seats must be a non-empty array'
        });
        return;
      }

      const reservation = await ReservationService.createReservation({
        userId,
        userName,
        userEmail,
        seats,
        source: 'third-party'
      });

      // Broadcast seat updates - with safety check
      const io = ThirdPartyController.io;
      if (io) {
        try {
          const updatedSeats = await SeatService.getAllSeats();
          io.emit('seats:update', {
            seats: updatedSeats,
            reserved: reservation.seats,
            timestamp: new Date(),
            source: 'third-party'
          });
          logger.info(`📡 Broadcasted seat update for third-party reservation: ${reservation.seats.join(', ')}`);
        } catch (socketError) {
          logger.error('Failed to broadcast seat update:', socketError);
        }
      } else {
        logger.info('ℹ️ Socket.IO not available, skipping broadcast');
      }

      res.status(201).json({
        success: true,
        data: {
          reservationId: reservation.reservationId,
          seats: reservation.seats,
          status: reservation.status,
          expiresAt: reservation.expiresAt,
          source: 'third-party'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reservationId } = req.params;
      
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.THIRD_PARTY_API_KEY) {
        res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
        return;
      }

      const reservation = await ReservationService.getReservation(reservationId);

      if (!reservation) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }
}