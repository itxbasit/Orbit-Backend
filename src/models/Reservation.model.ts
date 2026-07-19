import mongoose, { Schema, Document } from 'mongoose';

export interface IReservation extends Document {
  reservationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  seats: string[];
  status: 'confirmed' | 'cancelled' | 'expired';
  source: 'frontend' | 'third-party';
  expiresAt: Date; // When the reservation expires
  confirmedAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: (seats: string[]) => seats.length > 0,
        message: 'At least one seat must be reserved'
      }
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'expired'],
      default: 'confirmed', // Always confirmed immediately
      index: true
    },
    source: {
      type: String,
      enum: ['frontend', 'third-party'],
      default: 'frontend'
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from creation
      index: true
    },
    
    confirmedAt: {
      type: Date,
      default: Date.now
    },
    cancelledAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for cleanup queries
ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ userId: 1, status: 1 });

export const Reservation = mongoose.model<IReservation>('Reservation', ReservationSchema);