# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] Admin user created and role set to 'admin'
- [ ] Environment variables configured in `.env`
- [ ] Supabase storage bucket created and public
- [ ] Database schema deployed (schema.sql executed)
- [ ] At least one subject/chapter created
- [ ] Test locally: `npm run dev`
- [ ] Build succeeds: `npm run build`

## Step 1: Build

```bash
npm install
npm run build
```

Verify `dist/` folder is created with all assets.

## Step 2: Deploy to Vercel (Easiest)

### Option A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repo
5. Vercel auto-detects Vite
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click "Deploy"

Done! Your site is live at `yourname.vercel.app`

### Option B: CLI
```bash
npm i -g vercel
vercel
# Follow prompts
# Add environment variables when asked
```

## Step 3: Configure Supabase for Production

### 1. Enable Email Auth (Optional)
- Supabase Dashboard → Authentication → Providers
- Email is already enabled by default
- Customize email templates if needed

### 2. Update Allowed URLs
- Supabase → Authentication → URL Configuration
- Add your production URL:
  ```
  yoursite.com
  www.yoursite.com
  https://yoursite.com
  ```

### 3. Configure Storage CORS
- Go to Storage Settings
- Add your domain to CORS allowed origins

### 4. Set Up Backups (Optional)
- Supabase → Backups
- Enable daily backups (paid feature)
- Or manually export data regularly

## Step 4: Custom Domain (Optional)

### Vercel
1. Vercel Dashboard → Project Settings → Domains
2. Add your domain
3. Follow DNS instructions
4. Usually takes 24 hours

### Supabase Realtime (Not Needed for MVP)
- Skip for now, uses more resources

## Step 5: Monitor Production

### Check Logs
- Vercel: Deployments tab → Logs
- Supabase: SQL Editor → Query Performance

### Monitor Costs
- Supabase: Billing → Overview
- Track: Database rows, storage usage, bandwidth

### Set Up Alerts (Optional)
- Supabase: Settings → Usage Alerts
- Email when exceeding thresholds

## Maintenance

### Regular Tasks
- Weekly: Check if any errors in logs
- Monthly: Review usage metrics
- Monthly: Backup critical data manually

### Database Maintenance
```sql
-- Run monthly in Supabase SQL Editor
vacuum analyze;
```

### Update Dependencies
```bash
npm outdated
npm update
```

## Environment Setup for Different Stages

### Development (.env.local)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Production (Vercel Settings)
Same variables, set in Vercel dashboard

### Staging (Optional)
Create a separate Supabase project for testing

## Rollback Procedure

If something breaks in production:

1. Vercel has automatic rollback - select previous deployment
2. Database: restore from Supabase backup or manual SQL export
3. Files: restore from storage bucket history (if enabled)

## Performance Optimization

### Already Optimized In Code:
- ✓ Tailwind CSS (minified)
- ✓ Vite bundling (code splitting)
- ✓ No external dependencies
- ✓ RLS on database (security + speed)
- ✓ Minimal JavaScript

### Optional Further Optimization:
1. **CDN for Resources:**
   - Upload files to Cloudflare R2
   - Update file_url in database
   
2. **Image Compression:**
   - Use TinyPNG before uploading
   - Or use AVIF format

3. **Database Optimization:**
   - Indexes already created
   - Add more as needed based on usage

## Scaling (If Needed Later)

### When to upgrade:
- **10K+ students:** Upgrade Supabase plan
- **Large files:** Use Cloudflare R2 ($0.015/GB)
- **High traffic:** Add Vercel Pro for priority support

### Suggested Upgrades:
1. Supabase Pro ($25/month): 8GB storage, priority support
2. Vercel Pro ($20/month): Production monitoring, faster builds
3. Cloudflare R2 ($0.015/GB): Cheaper file storage

## Disaster Recovery

### Database Backup:
```bash
# Export from Supabase SQL Editor
# Run this monthly and save locally
SELECT * FROM subjects;
SELECT * FROM chapters;
SELECT * FROM resources;
SELECT * FROM tests;
SELECT * FROM questions;
```

### File Backup:
- Supabase Storage → Download all files monthly
- Or configure auto-backup with third-party tool

### Code Backup:
- Use Git (GitHub, GitLab, etc.)
- Push all changes before deployment

## Troubleshooting Production Issues

### Site shows 404
- Check Vercel deployment logs
- Verify build succeeded
- Check VITE_SUPABASE_URL format (needs https://)

### Resources won't load
- Verify storage bucket is public
- Check CORS in Supabase
- Test file URL directly in browser

### Admin can't login
- Check Supabase email verification
- Verify allowed URLs in Auth config
- Clear browser cookies

### Database seems down
- Check Supabase status page
- Review SQL Editor for connection errors
- Check if free tier quota exceeded

## Cost Estimate (Monthly)

| Service | Free Tier | Suggested Plan | Cost |
|---------|-----------|-----------------|------|
| Supabase | 500MB storage | 8GB (Pro) | $25 |
| Vercel | Unlimited API calls | Pro | $20 |
| Domain | - | .com | $10-15 |
| **Total** | **$0** | - | **$55-60** |

Free tier supports up to 10,000 students comfortably.

## Next Steps

1. Deploy to Vercel
2. Test all features in production
3. Share your URL with users
4. Monitor first week closely
5. Set up regular backups
6. Plan content roadmap
