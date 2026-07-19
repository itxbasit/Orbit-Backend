import { ExpiryService } from '../services/expiry.service';
import { logger } from '../utils/logger';

let isRunning = false;
let counter = 0;

/**
 * Run the expiry job
 */
export async function runExpiryJob(): Promise<void> {
  if (isRunning) {
    logger.debug('⏰ Expiry job already running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    counter++;
    logger.debug(`🔍 Running expiry check #${counter}...`);
    await ExpiryService.expireConfirmedReservations();
    const duration = Date.now() - startTime;
    
    if (duration > 50) {
      logger.debug(`✅ Expiry check #${counter} completed in ${duration}ms`);
    }
  } catch (error) {
    logger.error('❌ Expiry job failed:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduled expiry job
 * Runs every 30 seconds
 */
export function startExpiryScheduler(): void {
  logger.info('⏰ Starting reservation expiry scheduler...');
  
  // Run immediately on startup (after 2 seconds)
  setTimeout(async () => {
    logger.info('🔄 Running initial expiry check...');
    await runExpiryJob();
  }, 2000);

  // Then run every 30 seconds
  const interval = setInterval(async () => {
    await runExpiryJob();
  }, 30 * 1000); // 30 seconds

  logger.info('✅ Expiry scheduler running (checks every 30 seconds)');
  
  // Clean up on process exit
  process.on('SIGTERM', () => {
    clearInterval(interval);
    logger.info('⏰ Expiry scheduler stopped');
  });
}