# Military Camp System - Online Deployment Guide

## 🚀 Deploy to Railway (Recommended)

Railway waa platform-ka ugu fiican MERN stack applications-ka.

### Step 1: Account Setup
1. Tag https://railway.app
2. Login ama sameyso account cusub
3. Connect your GitHub account

### Step 2: Deploy Backend
1. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `MilitaryCamp` repository

2. **Configure Backend Service:**
   - Railway will auto-detect it as Node.js
   - Go to Variables tab and add:
     ```
     MONGO_URI=mongodb+srv://mohamedabdi61215_db_user:hRwdtMMlHA3wElCq@cluster0.t1c8qyk.mongodb.net/
     JWT_SECRET=military_camp_secure_jwt_secret_2024_xK9mP3qR
     NODE_ENV=production
     PORT=5000
     ```
   - **IMPORTANT:** CLIENT_URL waxaa lagu dari doonaa step 3 kadib

3. **Set Root Directory:**
   - Go to Settings tab
   - Set Root Directory to: `backend`

### Step 3: Deploy Frontend
1. **Add Another Service:**
   - Click "+" in your project
   - Select "Add Service"
   - Choose "GitHub" and select your same repository

2. **Configure Frontend Service:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `npm run preview`

3. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-service.railway.app
   ```

### Step 4: Connect Services
1. Copy backend URL (ka dib markuu deploy noqdo)
2. Update frontend environment variable: `VITE_API_URL=https://your-backend-url.railway.app`
3. Update backend CLIENT_URL: `CLIENT_URL=https://your-frontend-url.railway.app`

### Step 5: Seed Database
1. Run seed command in Railway:
   ```bash
   npm run seed
   ```
   Or run locally: `cd backend && npm run seed`

## 🔧 Environment Variables Summary

### Backend (.env)
```
PORT=5000
MONGO_URI=mongodb+srv://mohamedabdi61215_db_user:hRwdtMMlHA3wElCq@cluster0.t1c8qyk.mongodb.net/
JWT_SECRET=military_camp_secure_jwt_secret_2024_xK9mP3qR
CLIENT_URL=https://your-frontend-domain.railway.app
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-domain.railway.app
```

## 📱 Default Login Credentials
- **Admin:** admin / admin123
- **Security Officer:** sec_officer / officer123
- **Guard:** guard1 / guard123

## 🔍 Troubleshooting
- Hubi in MongoDB Atlas IP whitelist uu oggol yahay 0.0.0.0/0 (all IPs)
- Hubi in environment variables ay sax yihiin
- Check Railway logs haddii error dhaco

## 🌐 Alternative Platforms
- **Vercel:** Frontend only (backend waxaa loo isticmaali karaa serverless functions)
- **Render:** Full-stack support
- **Heroku:** Classic choice laakiin qaali ah

## 📞 Support
Haddii aad caawimaad u baahato, Railway documentation ka eeg ama soo waydii!