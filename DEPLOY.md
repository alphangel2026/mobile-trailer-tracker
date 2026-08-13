# Deploy to Render.com (Free) - Step by Step

## What You'll Get
A permanent URL like `https://mobile-trailer-tracker.onrender.com` that anyone on the team can open in their browser - no installs needed.

---

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to **https://github.com** 
2. Click **Sign Up**
3. Use your personal email (not amazon email)
4. Pick a username and password
5. Verify your email

---

## Step 2: Create a New Repository on GitHub

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name:** `mobile-trailer-tracker`
   - **Description:** `Mobile Charging Trailer Tracker for AMOC`
   - **Visibility:** Choose **Public** (free) or **Private** (also free)
3. Click **Create repository**
4. Leave this page open - you'll need the URL it shows you

---

## Step 3: Push Your Code to GitHub

Open a terminal (Ctrl+` in VS Code) and run these commands one at a time:

```powershell
cd "c:\Users\steballa\Documents\Documents\Kiro\mobile-trailer-tracker"

git init

git add .

git commit -m "Initial commit - Mobile Trailer Tracker"

git remote add origin https://github.com/YOUR-USERNAME/mobile-trailer-tracker.git

git push -u origin main
```

> Replace `YOUR-USERNAME` with your actual GitHub username from Step 1.
> If it asks for credentials, use your GitHub username and a Personal Access Token (GitHub > Settings > Developer Settings > Personal Access Tokens > Generate New Token).

---

## Step 4: Create a Render.com Account

1. Go to **https://render.com**
2. Click **Get Started for Free**
3. Sign up with your GitHub account (easiest - click "GitHub" button)
4. This automatically connects Render to your GitHub repos

---

## Step 5: Deploy on Render

1. Once logged into Render, click **New +** → **Web Service**
2. Connect your `mobile-trailer-tracker` repository
3. Configure:
   - **Name:** `mobile-trailer-tracker` (or whatever you want in the URL)
   - **Region:** Oregon (US West) or whichever is closest
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** **Free**
4. Click **Create Web Service**

---

## Step 6: Wait for Deploy (2-3 minutes)

Render will:
1. Pull your code from GitHub
2. Run `npm install`
3. Start your server

You'll see a green **"Live"** badge when it's ready.

---

## Step 7: Get Your URL!

Your app will be live at:

**https://mobile-trailer-tracker.onrender.com**

(or whatever name you chose in Step 5)

Share this URL with the AMOC team - they just open it in any browser!

---

## Important Notes

### Sleep Behavior (Free Tier)
- The free tier **spins down after 15 minutes** of no traffic
- When someone visits after it's asleep, it takes **~30-50 seconds** to wake up
- After that first load, it's instant until it sleeps again
- **This is fine for a team tool** that gets used throughout the day

### Updating the App
Whenever you push changes to GitHub, Render automatically redeploys:

```powershell
cd "c:\Users\steballa\Documents\Documents\Kiro\mobile-trailer-tracker"
git add .
git commit -m "Updated trailer data"
git push
```

### Data Persistence Note
On the free tier, the `data.json` file resets when Render redeploys or restarts. For the free tier, the sample data will reload. If you need persistent data that survives restarts, you'd need to upgrade to a paid tier ($7/mo) which includes persistent disk storage.

**Workaround for free tier:** The data persists as long as the service is running (days/weeks). It only resets on new deployments.

---

## Quick Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Create GitHub account | 2 min |
| 2 | Create repository | 1 min |
| 3 | Push code | 2 min |
| 4 | Create Render account | 2 min |
| 5 | Connect & deploy | 3 min |
| **Total** | | **~10 min** |

---

## Need Help?

If you get stuck on any step, the most common issues are:
- **Git push fails:** Make sure you created the repo on GitHub first, and the URL matches
- **Render build fails:** Check that `package.json` is in the root folder
- **App won't load:** Make sure the Start Command is `node server.js`
