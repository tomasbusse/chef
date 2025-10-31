# Chef Environment Setup Guide

## ✅ Completed Steps
- [x] `.env.local` file created with Google API key

## 📋 Remaining Setup Steps

### Step 1: Install Dependencies and Set Up Node Version

```bash
cd /Users/tomas/Desktop/chef

# Install the correct Node version (if you have nvm)
nvm install
nvm use

# Install pnpm globally if not already installed
npm install -g pnpm

# Install project dependencies
pnpm i
```

### Step 2: Initialize Convex Project

Run the following command to create a Convex project:

```bash
npx convex dev --once
```

**What this does:**
- Creates a new Convex project in your team
- Generates a deployment URL (something like `https://your-project.convex.cloud`)
- You'll need to follow the prompts to authenticate and create the project

**After running this:**
- Copy the Convex deployment URL that's generated
- Update `.env.local` and replace `VITE_CONVEX_URL=placeholder` with your actual URL

### Step 3: Set Up OAuth Application

1. Go to the Convex Dashboard: https://dashboard.convex.dev/team/settings/applications/oauth-apps
2. Create a new OAuth application
3. Set the Redirect URI to: `http://127.0.0.1:5173` (or whatever port you'll use)
4. Save the generated:
   - **Client ID** (CONVEX_OAUTH_CLIENT_ID)
   - **Client Secret** (CONVEX_OAUTH_CLIENT_SECRET)

### Step 4: Configure Convex Deployment Environment Variables

1. Open your Convex dashboard: `npx convex dashboard`
2. Go to **Settings → Environment Variables**
3. Add the following environment variables:

```env
BIG_BRAIN_HOST=https://api.convex.dev
CONVEX_OAUTH_CLIENT_ID=<value from OAuth setup in Step 3>
CONVEX_OAUTH_CLIENT_SECRET=<value from OAuth setup in Step 3>
WORKOS_CLIENT_ID=client_01K0YV0SNPRYJ5AV4AS0VG7T1J
```

**Note:** The `WORKOS_CLIENT_ID` value is already in your `.env.development` file.

### Step 5: Run the Application

Open two terminal windows:

**Terminal 1 - Start the frontend:**
```bash
cd /Users/tomas/Desktop/chef
pnpm run dev
```

**Terminal 2 - Start the Convex backend:**
```bash
cd /Users/tomas/Desktop/chef
npx convex dev
```

### Step 6: Access Chef

Open your browser and navigate to:
- **http://127.0.0.1:5173/** (or whatever port is shown in Terminal 1)

⚠️ **Important:** Use `127.0.0.1` instead of `localhost` for proper functionality.

---

## 🔑 Current .env.local Configuration

Your `.env.local` file currently has:
- ✅ Google API key configured
- ⏳ VITE_CONVEX_URL needs to be updated (currently "placeholder")

You can add more API keys later if needed:
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys
- X.AI: https://console.x.ai/

---

## 🐛 Troubleshooting

**If you don't have nvm (Node Version Manager):**
- On Mac/Linux: Install from https://github.com/nvm-sh/nvm
- On Windows: Use nvm-windows or manually install Node.js

**If the OAuth setup is confusing:**
- The OAuth setup is only needed if you're running locally
- The team you use will be the only team you can sign in with on local Chef

**If you encounter port conflicts:**
- The frontend will try to use port 5173 by default
- If taken, Vite will automatically use the next available port

---

## 📚 Additional Resources

- [Chef Documentation](https://docs.convex.dev/chef)
- [Chef Cookbook & Tips](https://stack.convex.dev/chef-cookbook-tips-working-with-ai-app-builders)
- [Convex Platform APIs](https://docs.convex.dev/platform-apis)
