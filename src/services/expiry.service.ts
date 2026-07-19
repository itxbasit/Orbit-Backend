import { ReservationService } from './reservation.service';
import { logger } from '../utils/logger';

export class ExpiryService {
  private static isRunning = false;

  /**
   * Check and expire confirmed reservations that have passed their expiry time
   */
  static async expireConfirmedReservations(): Promise<void> {
    if (this.isRunning) {
      logger.debug('⏰ Expiry service already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      await ReservationService.expireConfirmedReservations();
      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.debug(`✅ Expiry check completed in ${duration}ms`);
      }
    } catch (error) {
      logger.error('❌ Expiry service failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get reservation with expiry info
   */
  static async getReservationWithExpiry(reservationId: string): Promise<any> {
    const reservation = await ReservationService.getReservation(reservationId);
    
    if (!reservation) {
      return null;
    }

    const now = new Date();
    const isExpired = reservation.expiresAt < now;
    const timeRemaining = isExpired ? 0 : Math.max(0, reservation.expiresAt.getTime() - now.getTime());

    return {
      ...reservation.toObject(),
      isExpired,
      timeRemaining, // in milliseconds
      timeRemainingMinutes: Math.floor(timeRemaining / 60000),
      timeRemainingSeconds: Math.floor((timeRemaining % 60000) / 1000),
    };
  }
}