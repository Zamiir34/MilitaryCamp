# 🎖️ Military Camp Security System
### Web-Based Personnel & Vehicle Entry/Exit Monitoring System

A full-stack security management system for monitoring personnel, vehicle, and visitor entry/exit activities at a military installation.

---

## 📁 Project Structure

```
military-camp-system/
├── backend/                  # Node.js + Express API
│   ├── models/
│   │   ├── User.js           # System users (roles)
│   │   ├── Personnel.js      # Military/civilian personnel
│   │   ├── Vehicle.js        # Registered vehicles
│   │   ├── Visitor.js        # Visitor records
│   │   ├── EntryLog.js       # Entry/exit activity log
│   │   └── Alert.js          # Security alerts
│   ├── routes/
│   │   ├── auth.js           # Login / authentication
│   │   ├── users.js          # User management
│   │   ├── personnel.js      # Personnel CRUD
│   │   ├── vehicles.js       # Vehicle CRUD
│   │   ├── visitors.js       # Visitor CRUD
│   │   ├── entries.js        # Entry/exit recording
│   │   ├── dashboard.js      # Dashboard stats
│   │   ├── reports.js        # Daily reports + Excel export
│   │   ├── alerts.js         # Security alerts
│   │   └── qrcode.js         # QR code generation/scanning
│   ├── middleware/
│   │   └── auth.js           # JWT auth + role-based access
│   ├── server.js             # Express app entry point
│   ├── seed.js               # Database seed script
│   └── .env                  # Environment variables
│
└── frontend/                 # React.js SPA
    └── src/
        ├── pages/
        │   ├── Login.js       # Secure login screen
        │   ├── Dashboard.js   # Live stats & charts
        │   ├── Personnel.js   # Personnel management
        │   ├── Vehicles.js    # Vehicle management
        │   ├── Visitors.js    # Visitor management
        │   ├── EntryExit.js   # Entry/exit recording
        │   ├── Reports.js     # Daily reports & export
        │   ├── Alerts.js      # Security alerts
        │   ├── Users.js       # User management (Admin)
        │   └── QRScan.js      # QR code scanner/generator
        ├── components/
        │   └── layout/
        │       └── Layout.js  # Sidebar + top navbar
        ├── context/
        │   └── AuthContext.js # Auth state management
        └── utils/
            └── api.js         # Axios instance + interceptors
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18+
- **MongoDB** v6+ (local or MongoDB Atlas)
- **npm** v9+

---

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Configure environment

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/military_camp
JWT_SECRET=your_super_secret_key_change_this
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

For **MongoDB Atlas**, replace `MONGO_URI` with your connection string:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/military_camp
```

---

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates default users:

| Username       | Password     | Role              |
|----------------|--------------|-------------------|
| `admin`        | `admin123`   | Administrator     |
| `sec_officer`  | `officer123` | Security Officer  |
| `guard1`       | `guard123`   | Guard             |

⚠️ **Change passwords after first login!**

---

### 4. Run the application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev        # development (with nodemon)
# or
npm start          # production
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000/api

---

## 🔐 User Roles & Permissions

| Feature                    | Administrator | Security Officer | Guard |
|----------------------------|:-------------:|:----------------:|:-----:|
| View Dashboard             | ✅ | ✅ | ✅ |
| Record Entry/Exit          | ✅ | ✅ | ✅ |
| View Personnel/Vehicles    | ✅ | ✅ | ✅ |
| Register Personnel         | ✅ | ✅ | ❌ |
| Register Vehicles          | ✅ | ✅ | ❌ |
| Register Visitors          | ✅ | ✅ | ✅ |
| View Reports               | ✅ | ✅ | ✅ |
| Export Reports             | ✅ | ✅ | ❌ |
| Manage Alerts              | ✅ | ✅ | ❌ |
| Manage Users               | ✅ | ❌ | ❌ |
| QR Code Scanner/Generator  | ✅ | ✅ | ✅ |

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login        Login with username/password
GET    /api/auth/me           Get current user
POST   /api/auth/logout       Logout
```

### Personnel
```
GET    /api/personnel         List (search, filter, paginate)
POST   /api/personnel         Register new personnel
PUT    /api/personnel/:id     Update record
DELETE /api/personnel/:id     Delete (Admin only)
```

### Vehicles
```
GET    /api/vehicles          List vehicles
POST   /api/vehicles          Register vehicle
PUT    /api/vehicles/:id      Update vehicle
DELETE /api/vehicles/:id      Delete vehicle
```

### Visitors
```
GET    /api/visitors          List visitors
POST   /api/visitors          Register visitor
PUT    /api/visitors/:id      Update visitor
DELETE /api/visitors/:id      Delete visitor
```

### Entry/Exit Logs
```
GET    /api/entries           List logs (search, filter by type/date)
POST   /api/entries/entry     Record entry
POST   /api/entries/exit      Record exit
PUT    /api/entries/:id/exit  Update with exit time
```

### Dashboard
```
GET    /api/dashboard         Stats, charts, recent activity
```

### Reports
```
GET    /api/reports/daily     Daily report by date
GET    /api/reports/export/excel  Export Excel file
```

### Alerts
```
GET    /api/alerts            List alerts (filter by severity/status)
POST   /api/alerts            Create alert
PUT    /api/alerts/:id/resolve  Mark as resolved
```

### QR Codes
```
POST   /api/qrcode/generate   Generate QR data URL
POST   /api/qrcode/scan       Parse QR data
```

---

## ✨ System Features

| # | Feature | Status |
|---|---------|--------|
| 1 | User Authentication & Login | ✅ |
| 2 | Role-Based Access Control (Admin / Security Officer / Guard) | ✅ |
| 3 | Personnel Registration with QR Code | ✅ |
| 4 | Vehicle Registration with QR Code | ✅ |
| 5 | Entry & Exit Recording with Auto Timestamp | ✅ |
| 6 | Visitor Registration & Management | ✅ |
| 7 | Search & Filter across all modules | ✅ |
| 8 | Live Dashboard with Charts | ✅ |
| 9 | Daily Activity Reports | ✅ |
| 10 | Historical Data Storage (MongoDB) | ✅ |
| 11 | Unauthorized Access Alerts | ✅ |
| 12 | Alert Management with Severity Levels | ✅ |
| 13 | Automatic Date/Time Tracking | ✅ |
| 14 | Excel Export | ✅ |
| 15 | QR Code Generator & Scanner | ✅ |
| 16 | Secure JWT Authentication | ✅ |

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose ODM
- JSON Web Tokens (JWT)
- bcryptjs (password hashing)
- qrcode (QR generation)
- ExcelJS (Excel export)

**Frontend**
- React.js 18
- React Router v6
- Recharts (charts)
- qrcode.react (QR display)
- Axios (HTTP client)
- react-hot-toast (notifications)
- Lucide React (icons)

---

## 🔒 Security Notes

1. Change `JWT_SECRET` in `.env` to a long random string
2. Change all default passwords immediately after deployment
3. Use HTTPS in production
4. Restrict MongoDB access with authentication
5. Set `NODE_ENV=production` in production deployments
6. Consider adding rate limiting (`express-rate-limit`) for auth endpoints

---

## 📦 Production Build

```bash
# Build React frontend
cd frontend
npm run build

# Serve the build with Express (add to server.js):
# app.use(express.static(path.join(__dirname, '../frontend/build')));
# app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/build/index.html')));
```

---

*Developed for Military Camp Access Control Management*  
*Unauthorized access is prohibited and monitored.*
