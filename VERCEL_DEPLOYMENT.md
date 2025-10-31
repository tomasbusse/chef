# Vercel Deployment Guide for Chef

Your Chef app is now ready to deploy to Vercel! Follow these steps to get your app live.

## 🎉 GitHub Repository Status
✅ **Your code is already on GitHub:** https://github.com/tomasbusse/chef.git

## 📋 Prerequisites
- GitHub account (✅ You have this)
- Vercel account (free tier works great)

---

## Step 1: Sign Up/Login to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" or "Login"
3. Choose "Continue with GitHub" for easy integration

---

## Step 2: Import Your GitHub Repository

1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find **"chef"** repository and click **"Import"**
4. Vercel will automatically detect your project configuration

---

## Step 3: Configure Project Settings

Vercel will auto-detect most settings, but verify these:

### Framework Preset
- Should auto-detect: **Remix**
- Build Command: `npm run build` (already configured)
- Output Directory: `build` (default for Remix)
- Install Command: `pnpm install` (Vercel will detect pnpm from your lockfile)

### Root Directory
- Leave as: `.` (root of repository)

---

## Step 4: Add Environment Variables

**CRITICAL:** Click on **"Environment Variables"** and add all of these:

### Required Convex Variables:
```
VITE_CONVEX_URL=https://savory-dinosaur-460.convex.cloud
CONVEX_URL=https://savory-dinosaur-460.convex.cloud
CONVEX_DEPLOYMENT=dev:savory-dinosaur-460
```

### Required OAuth Variables:
```
CONVEX_OAUTH_CLIENT_ID=a9bdfbb2e46e4dac
CONVEX_OAUTH_CLIENT_SECRET=5bb1680cb7b94977b31515df34997090
```

### WorkOS Variables:
```
WORKOS_CLIENT_ID=client_01K0YV0SNPRYJ5AV4AS0VG7T1J
```

### AI API Keys:
```
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### Optional AI Keys (add if you have them):
```
OPENAI_API_KEY=your_key_here
XAI_API_KEY=your_key_here
```

### Optional MiniMax (future use):
```
MINIMAX_API_KEY=your_token_here
```

### Big Brain Host:
```
BIG_BRAIN_HOST=https://api.convex.dev
```

**Note:** For each variable:
1. Paste the **Name** (left column)
2. Paste the **Value** (right column)
3. Select environments: **Production**, **Preview**, and **Development** (check all three)

---

## Step 5: Deploy!

1. After adding all environment variables, click **"Deploy"**
2. Vercel will:
   - Install dependencies with pnpm
   - Build your Remix app
   - Deploy to a production URL
3. Wait 2-5 minutes for the first deployment

---

## Step 6: View Your Live App

Once deployment is complete:
1. You'll see **"Congratulations! Your project has been deployed"**
2. Click **"Visit"** to see your live app
3. Your URL will be something like: `https://chef-username.vercel.app`

---

## 🔄 Automatic Deployments

Great news! Vercel is now connected to your GitHub repository:

- **Production Deployments:** Every push to `main` branch = automatic deployment
- **Preview Deployments:** Every pull request = preview URL for testing
- **Instant Rollbacks:** If something breaks, rollback to previous deployment with one click

---

## 📊 Post-Deployment Checklist

After your first deployment:

- [ ] Visit your live URL and test the app
- [ ] Check the Vercel dashboard for any build warnings
- [ ] Test AI chat functionality (requires API keys)
- [ ] Verify Convex backend connection
- [ ] Test GitHub import feature
- [ ] Test design upload feature

---

## 🐛 Troubleshooting

### Build Fails
1. Check the **Build Logs** in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Dependency conflicts

### App Loads But Features Don't Work
1. Check **Functions Logs** in Vercel
2. Verify environment variables are set correctly
3. Make sure Convex deployment is running

### Convex Connection Issues
1. Verify `VITE_CONVEX_URL` matches your Convex dashboard
2. Run `npx convex dev` locally to ensure Convex is working
3. Check Convex dashboard for backend errors

---

## 🔧 Updating Your Deployment

To deploy changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically detect the push and redeploy!

---

## 📝 Custom Domain (Optional)

To add a custom domain:
1. Go to your project in Vercel
2. Click **"Settings"** → **"Domains"**
3. Add your domain and follow DNS configuration steps

---

## 🎯 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Your GitHub Repo:** https://github.com/tomasbusse/chef
- **Convex Dashboard:** https://dashboard.convex.dev/d/savory-dinosaur-460
- **Vercel Docs:** https://vercel.com/docs

---

## 🚀 You're All Set!

Your Chef app is ready for the world. Happy deploying! 🎉

If you encounter any issues, check the Vercel deployment logs or reach out to the community.
