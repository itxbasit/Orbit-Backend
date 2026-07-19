import { Reservation, IReservation } from '../models/Reservation.model';
import { SeatService } from './seat.service';
import { RedisLock } from '../utils/redisLock';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { CONSTANTS } from '../utils/constants';

export interface ReservationRequest {
  userId: string;
  userName: string;
  userEmail: string;
  seats: string[];
  source: 'frontend' | 'third-party';
}

export class ReservationService {
  static async createReservation(request: ReservationRequest): Promise<IReservation> {
    const { userId, userName, userEmail, seats, source } = request;

    // Validate seats count
    if (seats.length > CONSTANTS.RESERVATION.MAX_SEATS_PER_RESERVATION) {
      throw new Error(`Cannot reserve more than ${CONSTANTS.RESERVATION.MAX_SEATS_PER_RESERVATION} seats`);
    }

    // Remove duplicates
    const uniqueSeats = [...new Set(seats)];
    if (uniqueSeats.length !== seats.length) {
      throw new Error('Duplicate seats detected in reservation');
    }

    // Use distributed lock for seat reservation
    const lockResource = `seats:${uniqueSeats.sort().join(',')}`;
    
    return RedisLock.withLock(lockResource, async () => {
      // Check seat availability
      const availableSeats = await SeatService.getSeatsByNumbers(uniqueSeats);
      
      if (availableSeats.length !== uniqueSeats.length) {
        throw new Error('Some seats are not available');
      }

      const reservedSeats = availableSeats.filter(seat => seat.isReserved);
      if (reservedSeats.length > 0) {
        throw new Error(`Seats ${reservedSeats.map(s => s.seatNumber).join(', ')} are already reserved`);
      }

      // Calculate expiry time (5 minutes from now)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Create reservation - confirmed immediately
      const reservationId = uuidv4();
      const reservation = new Reservation({
        reservationId,
        userId,
        userName,
        userEmail,
        seats: uniqueSeats,
        status: 'confirmed', // Always confirmed immediately
        source,
        expiresAt, // Expires after 5 minutes
        confirmedAt: new Date(), // Confirmed immediately
      });

      try {
        // Reserve the seats
        await SeatService.reserveSeats(uniqueSeats, userId, reservationId);
        await reservation.save();
        
        logger.info(`✅ Reservation ${reservationId} CONFIRMED by ${userId} for seats ${uniqueSeats.join(', ')}`);
        logger.info(`⏰ Auto-expires at: ${expiresAt.toISOString()} (in 5 minutes)`);
        
        return reservation;
      } catch (error) {
        // Rollback on error
        await SeatService.releaseSeats(uniqueSeats);
        logger.error('Reservation creation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Cancel a confirmed reservation
   */
  static async cancelReservation(reservationId: string, userId: string): Promise<void> {
    const reservation = await Reservation.findOne({ 
      reservationId, 
      userId,
      status: 'confirmed' // Only confirmed reservations can be cancelled
    });

    if (!reservation) {
      throw new Error('Reservation not found or already cancelled/expired');
    }

    const lockResource = `seats:${reservation.seats.sort().join(',')}`;
    
    await RedisLock.withLock(lockResource, async () => {
      try {
        // Release seats
        await SeatService.releaseSeats(reservation.seats);

        reservation.status = 'cancelled';
        reservation.cancelledAt = new Date();
        await reservation.save();

        logger.info(`❌ Reservation ${reservationId} cancelled by ${userId}`);
      } catch (error) {
        logger.error('Reservation cancellation failed:', error);
        throw error;
      }
    });
  }

  static async getReservation(reservationId: string): Promise<IReservation | null> {
    return Reservation.findOne({ reservationId });
  }

  static async getUserReservations(userId: string): Promise<IReservation[]> {
    return Reservation.find({ 
      userId,
      status: 'confirmed' // Only return confirmed reservations
    }).sort({ createdAt: -1 });
  }

  /**
   * Expire confirmed reservations that have passed their expiry time
   * This runs as a cron job every 30 seconds
   */
  static async expireConfirmedReservations(): Promise<void> {
    const now = new Date();
    
    logger.debug(`🔍 Checking for expired confirmed reservations at ${now.toISOString()}`);
    
    const expiredReservations = await Reservation.find({
      status: 'confirmed',
      expiresAt: { $lt: now } // Expired
    });

    if (expiredReservations.length === 0) {
      logger.debug('✅ No expired confirmed reservations found');
      return;
    }

    logger.info(`🕐 Found ${expiredReservations.length} expired confirmed reservations to process`);

    let expiredCount = 0;
    let errorCount = 0;

    for (const reservation of expiredReservations) {
      try {
        const lockResource = `seats:${reservation.seats.sort().join(',')}`;
        
        await RedisLock.withLock(lockResource, async () => {
          // Release seats
          await SeatService.releaseSeats(reservation.seats);

          // Update reservation status to expired
          reservation.status = 'expired';
          await reservation.save();

          logger.info(`⏰ EXPIRED: Reservation ${reservation.reservationId} for seats ${reservation.seats.join(', ')} released after 5 minutes`);
        });
        
        expiredCount++;
      } catch (error) {
        errorCount++;
        logger.error(`❌ Failed to expire reservation ${reservation.reservationId}:`, error);
      }
    }

    logger.info(`✅ Expiry complete: ${expiredCount} expired, ${errorCount} errors`);
  }
}