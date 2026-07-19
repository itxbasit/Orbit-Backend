import mongoose, { Schema, Document } from 'mongoose';

export interface ISeat extends Document {
  seatNumber: string;
  row: string;
  number: number;
  isReserved: boolean;
  reservedBy?: string;
  reservationId?: string;
  reservedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema = new Schema<ISeat>(
  {
    seatNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    row: {
      type: String,
      required: true,
      index: true
    },
    number: {
      type: Number,
      required: true
    },
    isReserved: {
      type: Boolean,
      default: false,
      index: true
    },
    reservedBy: {
      type: String,
      index: true
    },
    reservationId: {
      type: String,
      index: true
    },
    reservedAt: {
      type: Date
    },
    version: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for faster queries
SeatSchema.index({ row: 1, number: 1 });
SeatSchema.index({ isReserved: 1, seatNumber: 1 });

// Pre-save middleware to update version
SeatSchema.pre('save', function(next) {
  if (this.isModified('isReserved')) {
    this.version += 1;
  }
  next();
});

export const Seat = mongoose.model<ISeat>('Seat', SeatSchema);