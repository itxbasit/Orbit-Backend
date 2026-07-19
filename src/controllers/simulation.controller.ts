import { Request, Response, NextFunction } from 'express';
import { SimulationService } from '../services/simulation.service';
import { SeatService } from '../services/seat.service';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Seat } from '../models/Seat.model';
import { Reservation } from '../models/Reservation.model';

export class SimulationController {
  private static io: Server;

  static initialize(io: Server): void {
    this.io = io;
  }

  static async runSimulation(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if there are any seats available
      const seatCount = await SeatService.getSeatCount();
      
      if (seatCount.available === 0) {
        res.status(400).json({
          success: false,
          error: 'No seats available for simulation. Please reset seats first.'
        });
        return;
      }

      // Run simulation
      const result = await SimulationService.runSimulation();

      // Broadcast final seat state
      if (this.io) {
        const updatedSeats = await SeatService.getAllSeats();
        this.io.emit('simulation:complete', {
          result,
          seats: updatedSeats,
          timestamp: new Date()
        });

        // Also broadcast seat update to all clients
        this.io.emit('seats:update', {
          seats: updatedSeats,
          timestamp: new Date(),
          source: 'simulation'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This should be an admin-only operation
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized. Admin key required.'
        });
        return;
      }

      // Reset all seats
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        await Seat.updateMany(
          {},
          {
            isReserved: false,
            reservedBy: null,
            reservationId: null,
            reservedAt: null,
            $inc: { version: 1 }
          },
          { session }
        );

        // Delete all reservations
        await Reservation.deleteMany({}, { session });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      // Broadcast reset
      if (this.io) {
        const updatedSeats = await SeatService.getAllSeats();
        this.io.emit('seats:reset', {
          seats: updatedSeats,
          timestamp: new Date()
        });
        this.io.emit('seats:update', {
          seats: updatedSeats,
          timestamp: new Date(),
          source: 'reset'
        });
      }

      res.json({
        success: true,
        message: 'All seats have been reset'
      });
    } catch (error) {
      next(error);
    }
  }
}