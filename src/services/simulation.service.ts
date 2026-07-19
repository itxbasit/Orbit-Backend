import { ReservationService } from './reservation.service';
import { SeatService } from './seat.service';
import { logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

export interface SimulationResult {
  totalAttempts: number;
  successfulReservations: number;
  failedReservations: number;
  errors: string[];
  seatsReserved: string[];
  duration: number;
}

export class SimulationService {
  private static readonly CONCURRENT_USERS = CONSTANTS.SIMULATION.CONCURRENT_USERS;
  private static readonly DELAY_MS = CONSTANTS.SIMULATION.DELAY_MS;

  static async runSimulation(): Promise<SimulationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const successfulReservations: string[] = [];
    const failedReservations: string[] = [];

    try {
      // Get available seats
      const availableSeats = await SeatService.getAvailableSeats();
      
      if (availableSeats.length === 0) {
        throw new Error('No seats available for simulation');
      }

      // Create different user scenarios
      const scenarios = this.generateScenarios(availableSeats);
      
      logger.info(`Starting simulation with ${this.CONCURRENT_USERS} concurrent users`);
      logger.info(`Available seats: ${availableSeats.length}`);

      // Run concurrent reservations
      const promises = scenarios.map((scenario, index) => 
        this.simulateReservation(scenario, index)
      );

      const results = await Promise.allSettled(promises);

      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successfulReservations.push(result.value.reservationId);
          } else {
            failedReservations.push(`User ${index}: ${result.value.error}`);
          }
        } else {
          errors.push(`User ${index}: ${result.reason}`);
        }
      });

      const duration = Date.now() - startTime;
      
      logger.info(`Simulation completed in ${duration}ms`);
      logger.info(`Successful: ${successfulReservations.length}, Failed: ${failedReservations.length + errors.length}`);

      return {
        totalAttempts: this.CONCURRENT_USERS,
        successfulReservations: successfulReservations.length,
        failedReservations: failedReservations.length + errors.length,
        errors: errors.length > 0 ? errors : failedReservations,
        seatsReserved: successfulReservations,
        duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Simulation failed:', errorMessage);
      throw error;
    }
  }

  private static generateScenarios(availableSeats: any[]): any[] {
    const scenarios = [];
    const seatsCopy = [...availableSeats];

    for (let i = 0; i < this.CONCURRENT_USERS; i++) {
      // Generate random number of seats to reserve (1-5)
      const numSeats = Math.floor(Math.random() * 5) + 1;
      
      // Some users will try to reserve the same seats
      let selectedSeats: any[];
      
      if (i < 20) {
        // First 20 users try to reserve the first 5 seats (high contention)
        const firstSeats = seatsCopy.slice(0, 5);
        selectedSeats = this.shuffleArray(firstSeats).slice(0, Math.min(numSeats, firstSeats.length));
      } else if (i < 40) {
        // Next 20 users try random seats but with overlap
        const randomStart = Math.floor(Math.random() * (seatsCopy.length - 5));
        const randomSeats = seatsCopy.slice(randomStart, randomStart + 10);
        selectedSeats = this.shuffleArray(randomSeats).slice(0, Math.min(numSeats, randomSeats.length));
      } else {
        // Remaining users try unique seats
        const remainingSeats = seatsCopy.slice(i - 40, i - 40 + numSeats);
        selectedSeats = remainingSeats.filter(s => s !== undefined);
      }

      if (selectedSeats.length > 0) {
        const isThirdParty = Math.random() < 0.3; // 30% from third-party
        scenarios.push({
          userId: `sim-user-${i}`,
          userName: `Sim User ${i}`,
          userEmail: `sim${i}@example.com`,
          seats: selectedSeats.map(s => s.seatNumber),
          source: isThirdParty ? 'third-party' : 'frontend',
          shouldSucceed: i < 10 // First 10 users should succeed in theory
        });
      }
    }

    return scenarios;
  }

  private static async simulateReservation(scenario: any, index: number): Promise<any> {
    try {
      // Add random delay to simulate realistic user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * this.DELAY_MS));

      const result = await ReservationService.createReservation(scenario);
      
      logger.debug(`User ${index} reserved seats: ${scenario.seats.join(', ')}`);
      
      return {
        success: true,
        reservationId: result.reservationId,
        seats: scenario.seats,
        userId: scenario.userId
      };
    } catch (error) {
      // Type guard to safely access error properties
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.debug(`User ${index} failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        seats: scenario.seats,
        userId: scenario.userId
      };
    }
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}