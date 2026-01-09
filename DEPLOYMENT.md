# Priori - Deployment Guide

## Pre-Deployment Checklist

### ✅ Already Done
- [x] Vercel configuration (`vercel.json`) for SPA routing
- [x] Environment variables documented (`.env.example`)
- [x] Build verified locally (`npm run build`)
- [x] Tests passing (23/23)
- [x] Linting passing
- [x] Supabase database configured with RLS policies

## Deploy to Vercel

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it as a Vite project

### 3. Configure Environment Variables
In Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL=https://xqdfiyqeevvkcdurwhio.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZGZpeXFlZXZ2a2NkdXJ3aGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDMwNzYsImV4cCI6MjA4MzUxOTA3Nn0.5GiqvzuGz4Qz5njTqqKS_MbPnpiIXHwcF9EIlgf8-gg
```

### 4. Deploy
- Vercel will automatically build and deploy
- Build command: `npm run build` (auto-detected)
- Output directory: `dist` (auto-detected)
- Framework: Vite (auto-detected)

## Post-Deployment Verification

After deployment, test these scenarios:

### ✅ Critical Paths to Test
1. **Landing Page**
   - Visit your Vercel URL (e.g., `https://priori.vercel.app`)
   - Should see the landing page with "Create New Session" button

2. **Session Creation**
   - Click "Create New Session"
   - Should redirect to `/s/{slug}` (e.g., `/s/abc123`)
   - URL should work when refreshed (thanks to `vercel.json`)

3. **Item Management**
   - Add a new item
   - Edit the item
   - Delete the item
   - All should persist to Supabase

4. **URL Sharing**
   - Copy the session URL
   - Open in incognito/private window
   - Should load the same session with items

5. **Refresh Test** (Most Important!)
   - On a session page (e.g., `/s/abc123`)
   - Refresh the browser
   - Should load the page, not show 404

## How vercel.json Works

The `vercel.json` configuration tells Vercel to:
- Serve `index.html` for ALL routes
- This allows React Router to handle routing client-side
- Without this, `/s/{slug}` would return 404 on direct access/refresh

## Troubleshooting

### Environment Variables Not Working
- Make sure they're prefixed with `VITE_`
- Redeploy after adding env vars

### 404 on Refresh
- Verify `vercel.json` is committed to repo
- Check Vercel build logs for errors

### Supabase Connection Errors
- Check browser console for errors
- Verify RLS policies are enabled in Supabase
- Confirm anon key has correct permissions

## Build Configuration

Vercel auto-detects these settings:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

You don't need to change these unless you have custom requirements.

## Domain Configuration (Optional)

To use a custom domain:
1. Go to Vercel project settings → Domains
2. Add your domain
3. Update DNS records as instructed by Vercel
4. Vercel handles SSL certificates automatically

## Notes

- **No Backend Required**: Priori uses Supabase for all data
- **Static Site**: The deployed app is just HTML, CSS, and JavaScript
- **Environment Variables**: Must be set in Vercel dashboard (not in `.env` file)
- **Builds are Fast**: ~30-60 seconds typically
