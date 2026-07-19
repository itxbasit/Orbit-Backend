Here's the complete `README.md` file content. You can copy it directly:

---

# 🎬 Cinema Seat Reservation System

A real-time cinema seat reservation system with high concurrency support, distributed locking, and real-time updates via WebSockets.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Third-Party Booking API](#third-party-booking-api)
- [Concurrency & Scalability](#concurrency--scalability)
- [Real-Time Updates](#real-time-updates)
- [Trade-offs & Decisions](#trade-offs--decisions)
- [Assumptions](#assumptions)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 📖 Overview

This is a production-ready, real-time cinema seat reservation system designed to handle high concurrency across multiple server instances. The system guarantees that a seat can never be double-booked, even when 100+ users attempt to reserve the same seats simultaneously.

### Key Highlights

| Feature | Status |
|---------|--------|
| **100% Correctness** | ✅ No double-booking guaranteed |
| **Real-Time Updates** | ⚡ WebSocket broadcasting to all connected clients |
| **Third-Party API** | 🔌 External partners can book seats with API key authentication |
| **Auto-Expiry** | ⏰ Seats automatically released after 5 minutes |

---

## ✨ Features

### Backend

**Seat Management**
- View all seats with availability status
- Real-time seat availability updates
- Seat statistics (total, available, reserved)

**Reservation System**
- Reserve one or multiple seats
- Automatic 5-minute expiration
- Cancel reservations
- View user's reservations

**Authentication**
- JWT-based authentication
- HTTP-only cookies for secure token storage
- Refresh token rotation
- Role-based access (user/admin)

**Third-Party API**
- Dedicated API for external booking partners
- API key authentication
- Same business logic as frontend
- Real-time updates broadcast to all clients

**Concurrency Simulation**
- Simulate 100 concurrent users
- Mixed frontend and third-party requests
- Performance metrics and error reporting

**Real-Time Updates**
- Socket.IO for WebSocket communication
- Broadcast seat updates to all connected clients
- Live seat availability changes

### Frontend

- Interactive seat map with visual status
- Real-time updates via Socket.IO
- Authentication (Login/Register)
- Dashboard with reservation management
- Countdown timer for reservation expiry
- One-click concurrency simulation

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| TypeScript | Type-safe JavaScript |
| MongoDB | Primary database |
| Mongoose | MongoDB ODM |
| Socket.IO | Real-time WebSocket communication |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Winston | Logging |

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework (App Router) |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Styling |
| Shadcn UI | Component library |
| React Query | Data fetching & caching |
| Socket.IO Client | Real-time communication |
| Axios | HTTP client |
| React Hook Form | Form handling |

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm)
- MongoDB (local or Atlas)
- Git

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd Orbits-Test
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env

# Update .env with your values
```

**`.env` Configuration:**
```env
# Server
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Database
MONGODB_URI=mongodb+srv://basitarif:BasitArif098@smit.kgermid.mongodb.net/OrbitSoftware

# Authentication
JWT_SECRET=8f7a9b3c2e1d5f6a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a
JWT_REFRESH_SECRET=3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2

# Third-Party API
THIRD_PARTY_API_KEY=pk_live_8f4a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e

# Admin
ADMIN_KEY=adm_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8

**Start Backend:**
```bash
# Development
pnpm run dev

# Production
pnpm run build
pnpm start
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create environment file
cp .env.local.example .env.local
```

**`.env.local` Configuration:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Start Frontend:**
```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Step 4: Database Setup

**Option A: Local MongoDB**
```bash
# Start MongoDB
mongod

# Create database
mongosh
use cinema_reservation
```

**Option B: MongoDB Atlas**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Add to `.env` file

### Step 6: Verify Installation

```bash
# Check backend
curl http://localhost:3000/health

# Check frontend
open http://localhost:3001

# Test register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 📚 API Documentation

### Public Routes (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seats` | Get all seats |
| GET | `/api/seats/available` | Get available seats |
| GET | `/api/seats/stats` | Get seat statistics |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout user |
| GET | `/health` | Health check |

### Protected Routes (Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/reservations` | Create reservation |
| GET | `/api/reservations` | Get user's reservations |
| GET | `/api/reservations/:id` | Get specific reservation |
| DELETE | `/api/reservations/:id` | Cancel reservation |

### Third-Party API (API Key Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/third-party/reservations` | Create reservation |
| GET | `/api/third-party/reservations/:id` | Get reservation |

**Headers:**
```
x-api-key: your-third-party-api-key
```

### Simulation (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/run` | Run concurrency simulation |
| POST | `/api/simulation/reset` | Reset all seats |

---

## 🔌 Third-Party Booking API

### How It Works

The third-party API shares **100% of the same business logic** as the frontend API. This ensures consistency across all reservation sources.

### Implementation

```typescript
// Both use the same ReservationService
await ReservationService.createReservation({
  userId,
  userName,
  userEmail,
  seats,
  source: 'third-party' // or 'frontend'
});
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/third-party/reservations \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-third-party-api-key" \
  -d '{
    "userId": "partner-123",
    "userName": "Partner Company",
    "userEmail": "partner@example.com",
    "seats": ["A1", "A2"]
  }'
```

### Features

- ✅ **Same Business Logic** - Identical validation, locking, and transaction logic
- ✅ **Real-Time Updates** - All clients receive `seats:update` events
- ✅ **API Key Authentication** - Secure partner access
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Audit Trail** - Source tracked in database

---

### How It Prevents Double-Booking

1. **Distributed Lock**
2. **Database Transaction** - MongoDB transactions ensure atomic operations
3. **Optimistic Locking** - Version field prevents concurrent updates
4. **Idempotency** - Duplicate requests are handled gracefully

---

## 📡 Real-Time Updates

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `seats:update` | Server → Client | Seat availability updated |
| `seats:reset` | Server → Client | All seats reset |
| `simulation:complete` | Server → Client | Simulation finished |
| `join-room` | Client → Server | Join specific room |

### Frontend Implementation

```typescript
// Connect to Socket.IO
const socket = io('http://localhost:3000');

// Listen for seat updates
socket.on('seats:update', (data) => {
  console.log('Seats updated:', data);
  updateSeatMap(data.seats);
});

// Join room
socket.emit('join-room', 'movie-showing-1');
```

---

## 🤔 Trade-offs & Decisions

### 1. Database Locking

| Approach | Pros | Cons |
|----------|------|------|
| **MongoDB** | Built-in, no extra service | Higher latency |
| **Optimistic Locking** | No locks needed | Retry logic required |

### 2. HTTP-Only Cookies vs localStorage

| Approach | Pros | Cons |
|----------|------|------|
| **HTTP-Only Cookies (Chosen)** | XSS protection, automatic sending | CSRF risk |
| **localStorage** | Easy to implement | XSS vulnerable |

**Decision:** Used HTTP-only cookies for better security.

### 3. Socket.IO vs SSE vs Polling

| Approach | Pros | Cons |
|----------|------|------|
| **Socket.IO (Chosen)** | Bi-directional, real-time | More complex |
| **SSE** | Simpler | One-way only |
| **Polling** | Easy | High latency |

**Decision:** Used Socket.IO for true real-time updates.

### 4. MongoDB vs PostgreSQL

| Approach | Pros | Cons |
|----------|------|------|
| **MongoDB (Chosen)** | Flexible schema | No joins |
| **PostgreSQL** | ACID compliant | Rigid schema |

**Decision:** Used MongoDB for flexible seat schema and fast development.

---

## 📋 Assumptions

### Business Logic Assumptions

1. **Seats are fixed** - 50 seats, 5 per row (A-K, 1-5)
2. **Single movie showing** - Only one showing at a time
3. **Reservation expiry** - 5 minutes before seats are auto-released
4. **Max seats per reservation** - 10 seats maximum
5. **Anonymous users** - Can view seats but need login to reserve

### Technical Assumptions

1. **Network connectivity** - Reliable connection for real-time updates
2. **Browser support** - Modern browsers with WebSocket support
3. **Load balancer** - Supports WebSocket connections
4. **MongoDB replica set** - Required for transactions

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
pnpm test

# Frontend tests
cd frontend
pnpm test
```

### Test Scenarios

**1. Concurrency Test (100 users)**
```bash
curl -X POST http://localhost:3000/api/simulation/run
```

**2. Third-Party API Test**
```bash
curl -X POST http://localhost:3000/api/third-party/reservations \
  -H "x-api-key: your-third-party-api-key" \
  -d '{"userId":"test","userName":"Test","userEmail":"test@test.com","seats":["A1"]}'
```

**3. Authentication Test**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"test@test.com","password":"test123"}' \
  -c cookies.txt

# Get profile
curl -X GET http://localhost:3000/api/auth/profile \
  -b cookies.txt
```

---

## 🚢 Deployment

### PM2 Deployment (Recommended)

```bash
# Install PM2
npm install -g pm2

# Deploy backend
cd backend
pnpm run build
pm2 start dist/app.js --name cinema-backend -- --port=3000

# Deploy frontend
cd frontend
pnpm run build
pm2 start node_modules/.bin/next --name cinema-frontend -- start -p 3001

# Save PM2 config
pm2 save
pm2 startup
```

### Systemd Deployment (Linux)

Create service files and start services:

```bash
sudo systemctl enable cinema-backend
sudo systemctl enable cinema-frontend
sudo systemctl start cinema-backend
sudo systemctl start cinema-frontend
```

### Nginx Reverse Proxy

```nginx
upstream backend { server localhost:3000; }
upstream frontend { server localhost:3001; }

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location /api/ {
        proxy_pass http://backend/api/;
    }

    location /socket.io/ {
        proxy_pass http://backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB Connection Failed | Start MongoDB: `mongod` or check connection string |
| CORS Error | Update `CORS_ORIGIN` in `.env` |
| Socket.IO Connection Failed | Check if backend is running and WebSocket path |
| Invalid API Key | Check `THIRD_PARTY_API_KEY` in `.env` |

---

## 📊 Monitoring

```bash
# Health check
curl http://localhost:3000/health

# PM2 monitoring
pm2 monit

# View logs
pm2 logs
```

---

## 📝 License

This project is proprietary and confidential.

---

## 👥 Contributors

- **Basit Arif** - Lead Developer

---

**🎉 Happy Booking!**