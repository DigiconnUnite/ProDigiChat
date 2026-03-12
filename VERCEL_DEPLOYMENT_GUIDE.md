# Vercel Deployment Guide for WhatsApp Marketing Tool

This guide will help you deploy your WhatsApp Marketing Platform to Vercel for live testing.

---

## Prerequisites

1. **Vercel Account**: Create one at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **MongoDB Database**: Use MongoDB Atlas (free tier) - you already have one configured
4. **Redis**: Use Redis Cloud or Vercel KV (serverless Redis)

---

## Step 1: Prepare Your Environment Variables

Create a `.env.production` file with these variables (update values for production):

```env
# Database (MongoDB Atlas - update your connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# NextAuth (update secret and URL)
NEXTAUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=https://your-app-name.vercel.app

# Email (SMTP)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# WhatsApp / Meta OAuth (update for production)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_OAUTH_REDIRECT_URI=https://your-app-name.vercel.app/api/whatsapp/oauth/callback

# Redis (use Vercel KV or Upstash)
REDIS_URL=your-redis-connection-string

# WhatsApp Webhook Security
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

---

## Step 2: Deploy via Vercel Dashboard (Recommended)

### Option A: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build` (or leave empty)
   - **Output Directory**: `.next` (or leave empty)
5. Add Environment Variables (see Step 1)
6. Click **"Deploy"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

Follow the prompts to add environment variables.

---

## Step 3: Configure Vercel Settings

### Project Settings

In Vercel Dashboard → Your Project → Settings:

1. **General**:
   - Build Command: `next build`
   - Install Command: `npm install`

2. **Environment Variables**:
   Add all variables from Step 1

3. **Functions**:
   - Increase function timeout if needed (default is 10s)

4. **Cron Jobs** (already configured in vercel.json):
   - Token refresh: Runs every hour

---

## Step 4: Update WhatsApp Webhook for Production

After deployment, update your WhatsApp/Meta webhook:

1. Go to Meta Developer Portal → Your App → Webhooks
2. Update callback URL to:
   ```
   https://your-app-name.vercel.app/api/whatsapp/webhooks
   ```
3. Update verify token to match `WHATSAPP_WEBHOOK_SECRET`

---

## Step 5: Test Your Live Deployment

Visit: `https://your-app-name.vercel.app`

### Test Checklist:
- [ ] Homepage loads
- [ ] Sign up / Login works
- [ ] Dashboard loads
- [ ] WhatsApp connection flow works
- [ ] Contacts can be added
- [ ] Campaigns can be created

---

## Important Notes for Vercel Deployment

### Database
- Your app uses MongoDB - ensure `MONGODB_URI` points to MongoDB Atlas
- Prisma will connect to MongoDB Atlas (not local)

### Cron Jobs
- Vercel handles cron jobs automatically (configured in `vercel.json`)
- Token refresh runs every hour

### Serverless Functions
- API routes become serverless functions
- Some operations may timeout if they take >10 seconds (upgrade for longer)

### WhatsApp OAuth
- Update `META_OAUTH_REDIRECT_URI` to your Vercel URL
- Add your Vercel domain to Meta app's allowed redirect URIs

---

## Troubleshooting

### Build Fails
- Check that all required env variables are set
- Run `npm run build` locally to see errors

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Vercel IPs
- Check that `MONGODB_URI` is correct

### API Errors
- Check Vercel Function Logs in Dashboard
- Ensure environment variables are correctly set

---

## Quick Deploy Commands (Alternative)

```bash
# Clone and deploy quickly
git clone your-repo
cd your-repo
npm i -g vercel
vercel
```

---

## Your Current Configuration

- **Framework**: Next.js 16 (standalone output)
- **Database**: MongoDB
- **Auth**: NextAuth.js
- **WhatsApp**: Meta Cloud API with OAuth
- **Cron**: Token refresh (hourly)

Good luck with your deployment! 🚀
