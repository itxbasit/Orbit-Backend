import { Seat, ISeat } from '../models/Seat.model';
import { CONSTANTS } from '../utils/constants';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export class SeatService {
  private static readonly CACHE_KEY = 'seats:all';
  // private static readonly CACHE_TTL = 60;

  static async initializeSeats(): Promise<void> {
    try {
      const existingSeats = await Seat.countDocuments();
      if (existingSeats > 0) {
        logger.info('Seats already initialized');
        return;
      }

      const seats: Partial<ISeat>[] = [];
      const { ROWS, SEATS_PER_ROW } = CONSTANTS.SEATS;

      for (const row of ROWS) {
        for (let i = 1; i <= SEATS_PER_ROW; i++) {
          seats.push({
            seatNumber: `${row}${i}`,
            row,
            number: i,
            isReserved: false,
            version: 0
          });
        }
      }

      await Seat.insertMany(seats);
      logger.info(`Initialized ${seats.length} seats`);
      
      // Cache the initialized seats
      await this.cacheAllSeats();
    } catch (error) {
      logger.error('Failed to initialize seats:', error);
      throw error;
    }
  }

  static async getAllSeats(): Promise<ISeat[]> {
    try {
      // Try to get from cache first
      const cachedSeats = await redisClient.get(this.CACHE_KEY);
      if (cachedSeats) {
        return JSON.parse(cachedSeats);
      }

      // If not in cache, get from database
      const seats = await Seat.find().sort({ row: 1, number: 1 });
      await this.cacheAllSeats(seats);
      return seats;
    } catch (error) {
      logger.error('Failed to get all seats:', error);
      throw error;
    }
  }

  static async getAvailableSeats(): Promise<ISeat[]> {
    try {
      const cacheKey = 'seats:available';
      const cachedSeats = await redisClient.get(cacheKey);
      if (cachedSeats) {
        return JSON.parse(cachedSeats);
      }

      const seats = await Seat.find({ isReserved: false }).sort({ row: 1, number: 1 });
      await redisClient.setEx(cacheKey, CONSTANTS.CACHE.AVAILABILITY_CACHE_TTL, JSON.stringify(seats));
      return seats;
    } catch (error) {
      logger.error('Failed to get available seats:', error);
      throw error;
    }
  }

  static async getSeatsByNumbers(seatNumbers: string[]): Promise<ISeat[]> {
    return Seat.find({ seatNumber: { $in: seatNumbers } });
  }

  static async reserveSeats(
    seatNumbers: string[], 
    userId: string, 
    reservationId: string
  ): Promise<ISeat[]> {
    // Use findOneAndUpdate with optimistic locking
    const updatedSeats: ISeat[] = [];
    
    for (const seatNumber of seatNumbers) {
      const seat = await Seat.findOneAndUpdate(
        { 
          seatNumber, 
          isReserved: false 
        },
        {
          isReserved: true,
          reservedBy: userId,
          reservationId: reservationId,
          reservedAt: new Date(),
          $inc: { version: 1 }
        },
        { 
          new: true,
          runValidators: true
        }
      );

      if (!seat) {
        // Rollback previous updates
        if (updatedSeats.length > 0) {
          await this.releaseSeats(updatedSeats.map(s => s.seatNumber));
        }
        throw new Error(`Seat ${seatNumber} is no longer available`);
      }

      updatedSeats.push(seat);
    }

    // Invalidate cache
    await this.invalidateCache();
    
    return updatedSeats;
  }

  static async releaseSeats(seatNumbers: string[]): Promise<void> {
    await Seat.updateMany(
      { 
        seatNumber: { $in: seatNumbers },
        isReserved: true 
      },
      {
        isReserved: false,
        reservedBy: null,
        reservationId: null,
        reservedAt: null,
        $inc: { version: 1 }
      },
      { 
        runValidators: true 
      }
    );

    await this.invalidateCache();
  }

  static async getSeatCount(): Promise<{ total: number; available: number; reserved: number }> {
    const [total, available] = await Promise.all([
      Seat.countDocuments(),
      Seat.countDocuments({ isReserved: false })
    ]);

    return {
      total,
      available,
      reserved: total - available
    };
  }

  private static async cacheAllSeats(seats?: ISeat[]): Promise<void> {
    const seatsToCache = seats || await Seat.find().sort({ row: 1, number: 1 });
    await redisClient.setEx(
      this.CACHE_KEY, 
      CONSTANTS.CACHE.SEAT_CACHE_TTL, 
      JSON.stringify(seatsToCache)
    );
  }

  private static async invalidateCache(): Promise<void> {
    await Promise.all([
      redisClient.del(this.CACHE_KEY),
      redisClient.del('seats:available')
    ]);
  }
}