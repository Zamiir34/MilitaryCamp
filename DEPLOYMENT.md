# Military Camp System - Online Deployment Guide

## 🚀 Deploy to Railway (Recommended)

Railway waa platform-ka ugu fiican MERN stack applications-ka.

### Step 1: Account Setup
1. Tag https://railway.app
2. Login ama sameyso account cusub
3. Connect your GitHub account

### Step 2: Deploy Backend FIRST
1. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `MilitaryCamp` repository

2. **Configure Backend Service:**
   - Railway will auto-detect it as Node.js
   - Go to "Settings" tab → Set "Root Directory" to: `backend`
   - Go to "Variables" tab and add:
     ```
     MONGO_URI=mongodb+srv://mohamedabdi61215_db_user:hRwdtMMlHA3wElCq@cluster0.t1c8qyk.mongodb.net/
     JWT_SECRET=military_camp_secure_jwt_secret_2024_xK9mP3qR
     NODE_ENV=production
     PORT=5000
     CLIENT_URL=https://your-frontend-domain.railway.app
     ```
   - **IMPORTANT:** CLIENT_URL waxaa lagu dari doonaa step 4 kadib

3. **Deploy Backend:**
   - Click "Deploy" - Railway will build and deploy automatically
   - Copy the backend URL (ka dib markuu deploy noqdo) - e.g., `https://backend-service.railway.app`

### Step 3: Deploy Frontend
1. **Add Another Service:**
   - Click "+" in your Railway project dashboard
   - Select "GitHub" and choose your same `MilitaryCamp` repository again

2. **Configure Frontend Service:**
   - Go to "Settings" tab → Set "Root Directory" to: `frontend`
   - Go to "Variables" tab and add:
     ```
     VITE_API_URL=https://your-backend-service.railway.app
     ```

3. **Deploy Frontend:**
   - Click "Deploy" - Railway will build and deploy automatically
   - Copy the frontend URL (ka dib markuu deploy noqdo) - e.g., `https://frontend-service.railway.app`

### Step 4: Update CORS Settings
1. Go back to Backend service Variables
2. Update CLIENT_URL:
   ```
   CLIENT_URL=https://your-frontend-service.railway.app
   ```

### Step 5: Seed Database
1. Go to Backend service terminal (Command button)
2. Run: `npm run seed`

### Step 6: Test Your Application
- Frontend URL: Your deployed frontend URL
- Backend API: Your backend URL + `/api/dashboard`

## 🔧 Environment Variables Summary

### Backend Variables (Railway):
```
MONGO_URI=mongodb+srv://mohamedabdi61215_db_user:hRwdtMMlHA3wElCq@cluster0.t1c8qyk.mongodb.net/
JWT_SECRET=military_camp_secure_jwt_secret_2024_xK9mP3qR
CLIENT_URL=https://your-frontend-domain.railway.app
NODE_ENV=production
PORT=5000
```

### Frontend Variables (Railway):
```
VITE_API_URL=https://your-backend-domain.railway.app
```

## 📱 Default Login Credentials
- **Admin:** admin / admin123
- **Security Officer:** sec_officer / officer123
- **Guard:** guard1 / guard123

## 🔍 Troubleshooting
- **Build Errors:** Hubi in root directory sax yahay (`backend` ama `frontend`)
- **CORS Errors:** Hubi in CLIENT_URL iyo VITE_API_URL ay sax yihiin
- **Database Connection:** Hubi in MongoDB Atlas whitelist uu oggol yahay all IPs (0.0.0.0/0)
- **API Calls Failing:** Hubi in VITE_API_URL uu dhamaado `/api` (automatically added by axios)

## 🌐 Alternative Platforms
- **Vercel:** Frontend only (backend waxaa loo isticmaali karaa serverless functions)
- **Render:** Full-stack support laakin qaali ah
- **Heroku:** Classic choice laakin qaali ah

## 📞 Support
Haddii aad caawimaad u baahato:
1. Check Railway logs in dashboard
2. Verify environment variables
3. Test API endpoints manually
4. MongoDB Atlas network access settings