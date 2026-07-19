import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { SeatService } from '../services/seat.service';
import { Server } from 'socket.io';
import { getSocketServer } from '../config/socket';

export class ReservationController {
  private static io: Server | null = null;

  static initialize(io: Server): void {
    this.io = io;
  }

  private static getSocketInstance(): Server | null {
    if (this.io) {
      return this.io;
    }

    return getSocketServer();
  }

  static async createReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { seats } = req.body;
      
      // User must be authenticated (handled by middleware)
      const userId = req.user?.userId;
      const userName = req.user?.name;
      const userEmail = req.user?.email;

      if (!userId || !userName || !userEmail) {
        res.status(401).json({
          success: false,
          error: 'User information not found. Please login.'
        });
        return;
      }

      if (!seats || !Array.isArray(seats) || seats.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Please select at least one seat'
        });
        return;
      }

      if (seats.length > 10) {
        res.status(400).json({
          success: false,
          error: 'Cannot reserve more than 10 seats at once'
        });
        return;
      }

      let reservation;
      try {
        reservation = await ReservationService.createReservation({
          userId,
          userName,
          userEmail,
          seats,
          source: 'frontend'
        });
      } catch (error: any) {
        if (error?.message?.includes('already reserved')) {
          res.status(409).json({
            success: false,
            error: 'One or more selected seats are already reserved. Please choose different seats.'
          });
          return;
        }

        throw error;
      }

      const socketInstance = this.getSocketInstance();

      // Broadcast seat updates to all connected clients
      if (socketInstance) {
        const updatedSeats = await SeatService.getAllSeats();
        socketInstance.emit('seats:update', {
          seats: updatedSeats,
          reserved: reservation.seats,
          timestamp: new Date(),
          userId: req.user?.userId
        });
      }

      const userReservations = await ReservationService.getUserReservations(userId);

      if (socketInstance) {
        socketInstance.emit('reservations:update', {
          userId,
          reservations: userReservations
        });
      }

      res.status(201).json({
        success: true,
        data: {
          reservationId: reservation.reservationId,
          seats: reservation.seats,
          status: reservation.status,
          expiresAt: reservation.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reservationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      await ReservationService.cancelReservation(reservationId, userId);

      const userReservations = await ReservationService.getUserReservations(userId);

      const socketInstance = this.getSocketInstance();

      // Broadcast seat updates
      if (socketInstance) {
        const updatedSeats = await SeatService.getAllSeats();
        socketInstance.emit('seats:update', {
          seats: updatedSeats,
          timestamp: new Date(),
          userId
        });
        socketInstance.emit('reservations:update', {
          userId,
          reservations: userReservations
        });
      }

      res.json({
        success: true,
        message: 'Reservation cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reservationId } = req.params;
      const userId = req.user?.userId;

      const reservation = await ReservationService.getReservation(reservationId);

      if (!reservation) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
        return;
      }

      // Check if user owns this reservation
      if (reservation.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this reservation'
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

  static async getUserReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const reservations = await ReservationService.getUserReservations(userId);

      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      next(error);
    }
  }
}