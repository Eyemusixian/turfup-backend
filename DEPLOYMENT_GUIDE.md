# 🚀 TURFUP Backend Deployment Guide

## Step-by-Step Deployment to Render

---

## Prerequisites
- GitHub account
- Render account (sign up at https://render.com - it's free!)

---

## STEP 1: Prepare Your Code

### 1.1 Create .gitignore file

Create a file named `.gitignore` in your backend folder:

```
node_modules/
.env
*.log
.DS_Store
```

### 1.2 Install dependencies locally (optional, to test)

```bash
npm install
```

### 1.3 Test locally with PostgreSQL (optional)

If you want to test before deploying:
1. Install PostgreSQL locally
2. Create a database
3. Run `schema.sql` to create tables
4. Create `.env` file with your local DATABASE_URL
5. Run `npm start`

---

## STEP 2: Push to GitHub

### 2.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit - TURFUP backend"
```

### 2.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `turfup-backend`
3. Choose "Public" or "Private"
4. Don't initialize with README (we already have files)
5. Click "Create repository"

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/turfup-backend.git
git branch -M main
git push -u origin main
```

---

## STEP 3: Create PostgreSQL Database on Render

### 3.1 Sign up/Login to Render
- Go to https://dashboard.render.com
- Sign up with GitHub (easiest)

### 3.2 Create PostgreSQL Database

1. Click "New +" button (top right)
2. Select "PostgreSQL"
3. Fill in details:
   - **Name:** `turfup-db` (or any name you like)
   - **Database:** `turfup` (or any name)
   - **User:** `turfup_user` (or any username)
   - **Region:** Choose closest to you
   - **PostgreSQL Version:** 16 (latest)
   - **Plan:** Free (good for MVP)

4. Click "Create Database"

### 3.3 Wait for Database Creation
- Takes 1-2 minutes
- Status will change from "Creating" to "Available"

### 3.4 Get Database Connection String

1. Once available, click on your database name
2. Scroll to "Connections" section
3. Copy the **Internal Database URL** (starts with `postgresql://...`)
4. **SAVE THIS URL** - you'll need it in the next step!

Example format:
```
postgresql://turfup_user:password@dpg-xxxxx.oregon-postgres.render.com/turfup
```

---

## STEP 4: Run Database Schema

### 4.1 Connect to Database

Still on your database page in Render:
1. Scroll down to "PSQL Command"
2. Copy the command (it looks like: `PGPASSWORD=xxx psql -h ...`)
3. Open your **local terminal**
4. Paste and run the command

You should see: `turfup=>`

### 4.2 Run Schema SQL

Option A - Copy/Paste:
1. Open `schema.sql` file
2. Copy all the SQL code
3. Paste into the psql terminal
4. Press Enter

Option B - Run from file:
```bash
# First download schema.sql to your computer
# Then in terminal where you ran psql:
\i /path/to/schema.sql
```

### 4.3 Verify Tables

In psql terminal, run:
```sql
\dt
```

You should see:
```
         List of relations
 Schema |  Name   | Type  |    Owner    
--------+---------+-------+-------------
 public | matches | table | turfup_user
 public | players | table | turfup_user
```

Type `\q` to exit psql.

---

## STEP 5: Deploy Backend on Render

### 5.1 Create Web Service

1. Go back to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository:
   - Click "Connect account" if needed
   - Select `turfup-backend` repository
   - Click "Connect"

### 5.2 Configure Web Service

Fill in these settings:

- **Name:** `turfup-api` (or any name)
- **Region:** Same as your database
- **Branch:** `main`
- **Root Directory:** (leave blank)
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (good for MVP)

### 5.3 Add Environment Variables

Scroll down to "Environment Variables" section:

Click "Add Environment Variable" and add:

1. **Key:** `DATABASE_URL`
   - **Value:** Paste the Internal Database URL from Step 3.4
   
2. **Key:** `NODE_ENV`
   - **Value:** `production`

3. **Key:** `PORT`
   - **Value:** `3000`

4. **Key:** `HOST`
   - **Value:** `0.0.0.0`

5. **Key:** `FRONTEND_URL`
   - **Value:** `*` (we'll update this later)

### 5.4 Deploy!

1. Click "Create Web Service"
2. Render will:
   - Clone your repo
   - Install dependencies
   - Start your server
3. Wait 2-5 minutes for deployment
4. Status will change to "Live" with a green dot

---

## STEP 6: Get Your Backend URL

### 6.1 Find Your URL

On your web service page, you'll see:
```
https://turfup-api.onrender.com
```

This is your **Backend API URL**! 🎉

### 6.2 Test Your API

Open in browser:
```
https://turfup-api.onrender.com/matches
```

You should see:
```json
[]
```

Or if you added test data in schema.sql:
```json
[
  {
    "id": 1,
    "location": "Imphal Stadium",
    ...
  }
]
```

---

## STEP 7: Important Notes

### Free Tier Limitations

⚠️ **Render Free Tier:**
- Service "spins down" after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds to wake up
- Good for MVP and testing
- Can upgrade to paid plan ($7/month) for always-on service

### Database Backup

Your free PostgreSQL database:
- 1 GB storage (plenty for MVP)
- Expires after 90 days (you can create a new one)
- For production, upgrade to paid plan ($7/month)

### Logs and Monitoring

To view logs:
1. Go to your web service on Render
2. Click "Logs" tab
3. See real-time server logs

---

## STEP 8: Next Steps

✅ **Backend is deployed!**

Your backend URL: `https://turfup-api.onrender.com`

**Now you need to:**
1. Update frontend files with this URL
2. Deploy frontend to Netlify
3. Update CORS settings if needed

**Save these URLs:**
- Backend: `https://turfup-api.onrender.com`
- Database: (in Render dashboard)

---

## Troubleshooting

### "Service Unavailable" Error
- Check logs in Render dashboard
- Verify DATABASE_URL is set correctly
- Make sure schema.sql was run

### "Connection Refused"
- Database might still be creating
- Check database status (should be "Available")

### Changes Not Showing
- Render auto-deploys on git push
- Or click "Manual Deploy" → "Deploy latest commit"

---

## 🎉 Success!

Your backend is now live on the internet!

**Test it:**
```bash
curl https://your-backend-url.onrender.com/matches
```

**Ready for frontend deployment? Let me know!**
