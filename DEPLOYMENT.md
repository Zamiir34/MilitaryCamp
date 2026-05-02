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
## 🚀 Vercel Deployment (Frontend Only)
Vercel waxay ku habboon tahay kaliya frontend-kaaga React/Vite. Backend-kaaga Express waa inuu ku jiro adeeg kale sida Railway, Render, ama Heroku.

### Vercel step-by-step
1. Tag https://vercel.com
2. Login ama sameyso account
3. Click **New Project**
4. Choose GitHub repo-gaaga `MilitaryCamp`
5. Set **Root Directory** to: `frontend`
6. Verify build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Add Environment Variable:
   ```
   VITE_API_URL=https://your-backend-url
   ```
8. Deploy

### Backend hosting options
- **Railway**: adeegsato service backend oo Node.js ah
- **Render**: adeegsato full-stack host
- **Heroku**: adeegsato backend ka Node.js

### Ka dib markuu Vercel deploy dhamaado
- Frontend URL ka hel Vercel
- Hubi `VITE_API_URL` uu tilmaamayo backend URL sax ah
- Hubi backend `CLIENT_URL` in uu tilmaamayo URL-ka frontend-ka Vercel

## 🚀 Render Deployment (Backend)

Render waa adeeg fudud oo backend-kaaga Express/Node.js ah.

### Step 1: Tag Render
1. Tag https://render.com
2. Login ama sameyso account cusub
3. Click **New** → **Web Service**

### Step 2: Connect Repository
1. Click **Connect account** → **GitHub**
2. Dooro repository-gaaga `MilitaryCamp`
3. Click **Connect**

### Step 3: Service Settings
1. **Name**: `military-camp-backend` (ama magac aad rabto)
2. **Environment**: `Node`
3. **Region**: Dooro region kuu dhow (e.g., Frankfurt, London, etc.)
4. **Branch**: `main`
5. **Root Directory**: `backend` ← **MUHIIM: Geli halkan `backend`**
6. **Build Command**: `npm install`
7. **Start Command**: `npm start`

### Step 4: Environment Variables
Ku dar variables-kan:
```
MONGO_URI=mongodb+srv://mohamedabdi61215_db_user:hRwdtMMlHA3wElCq@cluster0.t1c8qyk.mongodb.net/military_camp
JWT_SECRET=military_camp_secure_jwt_secret_2024_xK9mP3qR
CLIENT_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=5000
```

### Step 5: Deploy
1. Click **Create Web Service**
2. Render way dhisi doontaa backend-kaaga
3. URL ayaad heli doontaa: `https://your-service-name.onrender.com`

### Step 6: Connect to Frontend
1. Copy backend URL ka Render
2. Tag Vercel frontend-kaaga
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
4. Redeploy frontend-ka Vercel

### Step 7: Seed Database (Optional)
1. Tag Render service-kaaga
2. Click **Shell** tab
3. Run: `npm run seed`

## 🔍 Troubleshooting Render

### Haddii "Could not read package.json" error
- Hubi in **Root Directory** uu yahay `backend`
- Dib u deploy samee

### Haddii MongoDB connection error
- Hubi in MongoDB Atlas IP whitelist uu oggol yahay `0.0.0.0/0`
- Hubi in `MONGO_URI` uu sax yahay

### Haddii CORS error
- Hubi in `CLIENT_URL` uu tilmaamayo frontend URL sax ah

## 📞 Support
Haddii aad caawimaad u baahato:
1. Check Railway logs in dashboard
2. Verify environment variables
3. Test API endpoints manually
4. MongoDB Atlas network access settings