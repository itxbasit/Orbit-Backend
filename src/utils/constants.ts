export const CONSTANTS = {
  SEATS: {
    ROWS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
    SEATS_PER_ROW: 5,
    TOTAL_SEATS: 50
  },
  RESERVATION: {
    EXPIRY_MINUTES: 5,
    MAX_SEATS_PER_RESERVATION: 10
  },
  SIMULATION: {
    CONCURRENT_USERS: 100,
    DELAY_MS: 100
  },
  CACHE: {
    SEAT_CACHE_TTL: 60, // seconds
    AVAILABILITY_CACHE_TTL: 30
  },
  RATE_LIMIT: {
    WINDOW_MS: 60000,
    MAX_REQUESTS: 100
  }
} as const;