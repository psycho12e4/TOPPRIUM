# TOPPRIUM Implementation Checklist

## Phase 0: Pre-Setup (5 minutes)

- [ ] Have a GitHub account
- [ ] Have a Vercel account (free)
- [ ] Have a Supabase account (free)
- [ ] Have Node.js 16+ installed (`node -v`)
- [ ] Have npm 8+ installed (`npm -v`)

## Phase 1: Local Development Setup (15 minutes)

- [ ] Clone/download this repo
- [ ] Navigate to TOPPRIUM folder
- [ ] Run `npm install`
- [ ] Create `.env` file (copy from `.env.example`)
- [ ] (Don't set Supabase credentials yet - do that after creating project)
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000`
- [ ] See TOPPRIUM homepage load

## Phase 2: Supabase Project Setup (20 minutes)

### 2.1 Create Supabase Project

- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Click "New Project"
- [ ] Choose organization (create if needed)
- [ ] Enter project name: "topprium"
- [ ] Create strong database password (save it)
- [ ] Choose region closest to you
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for project to be created

### 2.2 Get Credentials

- [ ] Go to Project Settings → API
- [ ] Copy "Project URL" → paste to VITE_SUPABASE_URL in `.env`
- [ ] Copy "anon public" key → paste to VITE_SUPABASE_ANON_KEY in `.env`
- [ ] Save `.env` file
- [ ] Restart dev server (`npm run dev`)

### 2.3 Deploy Database Schema

- [ ] Go to SQL Editor in Supabase
- [ ] Click "+ New Query"
- [ ] Paste entire contents of `supabase/schema.sql`
- [ ] Click "Run" (takes 5-10 seconds)
- [ ] Verify no errors (should see "Success" messages)
- [ ] Refresh browser tab
- [ ] Go to "Tables" and verify these exist:
  - [ ] profiles
  - [ ] subjects
  - [ ] chapters
  - [ ] resources
  - [ ] tests
  - [ ] questions
  - [ ] test_scores

### 2.4 Create Storage Bucket

- [ ] Go to Storage → Buckets
- [ ] Click "+ New Bucket"
- [ ] Name: `resources`
- [ ] Make it Public (toggle on)
- [ ] Click "Create Bucket"

## Phase 3: Create Admin User (10 minutes)

### 3.1 Sign Up

- [ ] In dev app, go to `/signup`
- [ ] Enter your email
- [ ] Enter strong password
- [ ] Click "Sign Up"
- [ ] You should see "Check your email" message
- [ ] Check your email inbox
- [ ] Click the confirmation link
- [ ] You're signed up as a student

### 3.2 Make Yourself Admin

- [ ] Go to Supabase SQL Editor
- [ ] Click "+ New Query"
- [ ] Run this:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your_email@example.com'
);
```
- [ ] Replace `your_email@example.com` with your actual email
- [ ] Click "Run"
- [ ] Should see "1 row updated"

### 3.3 Test Admin Access

- [ ] Go to `/admin` in dev app
- [ ] Should see admin dashboard with stats
- [ ] If redirected to home, role wasn't set correctly
- [ ] Go back and check the SQL update

## Phase 4: Test All Features (20 minutes)

### 4.1 Admin Content Creation

- [ ] Go to `/admin/subjects`
- [ ] Click "+ Add Subject"
- [ ] Enter "Biology"
- [ ] Click OK
- [ ] Should see new subject in list

- [ ] Click "Chapters" button
- [ ] Click "+ Add Chapter"
- [ ] Enter "Chapter 1: Cell Structure"
- [ ] Click OK
- [ ] Should appear in expanded list

- [ ] Go to `/admin/resources`
- [ ] Select "Biology"
- [ ] Select "Chapter 1: Cell Structure"
- [ ] Create a test PDF or use existing file
- [ ] Upload it
- [ ] Should see success message

- [ ] Go to `/admin/tests`
- [ ] Select "Biology"
- [ ] Select "Chapter 1: Cell Structure"
- [ ] Enter test name: "Chapter 1 Quiz"
- [ ] Click "Create Test"
- [ ] Click "Load Questions"
- [ ] Click "+ Add Question"
- [ ] Enter a simple question (e.g., "What is a cell?")
- [ ] Enter options A, B, C, D
- [ ] Enter correct answer (a/b/c/d)
- [ ] Click OK
- [ ] Should see question appear

### 4.2 Test Student Experience

- [ ] Logout from admin account
- [ ] Go to `/` (home)
- [ ] Should see "Biology" subject
- [ ] Click on it
- [ ] Should see "Chapter 1: Cell Structure"
- [ ] Click on it
- [ ] Should see your uploaded resource
- [ ] Should see your test
- [ ] Click on test name
- [ ] Should see your question with options
- [ ] Select an answer
- [ ] Click "Submit Test"
- [ ] Should see score

- [ ] Go to `/admin` again
- [ ] Should see "Total Students" increased by 1

## Phase 5: Build for Production (5 minutes)

- [ ] Stop dev server (Ctrl+C)
- [ ] Run `npm run build`
- [ ] Wait for build to complete
- [ ] Verify `dist/` folder exists
- [ ] Verify `dist/index.html` exists

## Phase 6: Deploy to Vercel (10 minutes)

### 6.1 Push to GitHub

- [ ] Go to [github.com](https://github.com)
- [ ] Create new repository: "topprium"
- [ ] DON'T initialize with README
- [ ] Copy the commands they show
- [ ] In your terminal:
```bash
git init
git add .
git commit -m "Initial commit: TOPPRIUM MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/topprium.git
git push -u origin main
```

### 6.2 Deploy on Vercel

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "Add New Project"
- [ ] Select "Import Git Repository"
- [ ] Search for "topprium" and select it
- [ ] Framework: Vercel auto-detects (should be "Vite")
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes
- [ ] Should see "Congratulations" page

### 6.3 Add Environment Variables

- [ ] After deployment succeeds, click "Settings"
- [ ] Go to "Environment Variables"
- [ ] Add `VITE_SUPABASE_URL` with your Supabase URL
- [ ] Add `VITE_SUPABASE_ANON_KEY` with your Supabase key
- [ ] Click "Save"
- [ ] Go to "Deployments" → "Redeploy"
- [ ] Click the latest deployment
- [ ] Click "Redeploy"
- [ ] Wait 2-3 minutes for new deploy

### 6.4 Test Production Site

- [ ] Go to the Vercel deployment URL
- [ ] Should see TOPPRIUM homepage
- [ ] Sign up as a new student
- [ ] Verify can see your Biology subject
- [ ] Verify can take the test
- [ ] Verify can upload new resources

## Phase 7: Security Hardening (Optional - 10 minutes)

- [ ] Go to Supabase → Authentication → Providers
- [ ] Verify Email Auth is enabled
- [ ] (Optional) Enable other auth methods
- [ ] Go to Authentication → URL Configuration
- [ ] Add your Vercel URL under "Allowed URLs"
  - Format: `https://yourapp.vercel.app`
- [ ] Go to Authentication → Email Templates
- [ ] (Optional) Customize email templates

## Phase 8: Backup & Monitoring (5 minutes)

- [ ] Open a text editor
- [ ] Paste your Supabase project details:
  - Project URL
  - Anon Key
  - Database password (safe location)
- [ ] Save as `BACKUP.txt` (don't commit to git)
- [ ] Set phone reminder to check Supabase dashboard weekly

## Phase 9: Add Content (Ongoing)

Use [ADMIN_QUICKSTART.md](ADMIN_QUICKSTART.md) to add:
- [ ] Real subjects
- [ ] Real chapters
- [ ] Real resources (PDFs, videos, etc.)
- [ ] Real tests with proper questions

## Phase 10: Launch (Ongoing)

- [ ] Share Vercel URL with students
- [ ] Ask them to sign up
- [ ] Collect feedback
- [ ] Add more content based on feedback

---

## Verification Checklist - "Is Everything Working?"

### Homepage
- [ ] Loads in <2 seconds
- [ ] Shows subjects
- [ ] Responsive on mobile

### Authentication
- [ ] Can sign up
- [ ] Can login
- [ ] Can logout
- [ ] Redirects work correctly

### Admin Dashboard
- [ ] Shows correct student count
- [ ] Shows correct subject count
- [ ] Buttons link to correct pages

### Subjects Management
- [ ] Can create subject
- [ ] Can expand chapters
- [ ] Can add chapter
- [ ] Can delete subject/chapter

### Resources Upload
- [ ] Can select subject & chapter
- [ ] Can upload file
- [ ] File appears on student page
- [ ] Can delete resource

### Tests
- [ ] Can create test
- [ ] Can add questions
- [ ] Can delete question
- [ ] Can delete test

### Student Taking Test
- [ ] Can view questions
- [ ] Can select answers
- [ ] Can submit test
- [ ] Sees score
- [ ] Score saved to database

### Performance
- [ ] Page loads in <1 second
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Works on phone

---

## Common Issues & Fixes

### "404 Page Not Found"
**Cause:** Environment variables not set  
**Fix:** 
1. Check `.env` file has both URLs and keys
2. Restart dev server
3. Clear browser cache

### "Permission denied" error
**Cause:** RLS policy blocking query  
**Fix:**
1. Check you're logged in
2. Check your role in profiles table
3. Review console error message

### File won't upload
**Cause:** Storage bucket not configured  
**Fix:**
1. Create 'resources' bucket in Supabase
2. Make it public
3. Reload admin page

### Can't access /admin
**Cause:** Role not set to admin  
**Fix:**
1. Run SQL update (see Phase 3.2)
2. Verify email matches exactly
3. Reload page

### Site blank on Vercel
**Cause:** Environment variables missing  
**Fix:**
1. Go to Vercel project settings
2. Add VITE_SUPABASE_URL
3. Add VITE_SUPABASE_ANON_KEY
4. Redeploy

---

## Time Estimates

| Phase | Time | Status |
|-------|------|--------|
| Phase 0 | 5 min | Pre-setup |
| Phase 1 | 15 min | Dev setup |
| Phase 2 | 20 min | Supabase |
| Phase 3 | 10 min | Admin user |
| Phase 4 | 20 min | Test features |
| Phase 5 | 5 min | Build |
| Phase 6 | 10 min | Deploy |
| Phase 7 | 10 min | Security |
| Phase 8 | 5 min | Backup |
| Phase 9 | Ongoing | Content |
| Phase 10 | Ongoing | Launch |
| **TOTAL** | **~2 hours** | **MVP Live** |

---

## Success Criteria

✅ MVP Complete When:

1. [ ] Site deploys to live URL
2. [ ] Students can sign up
3. [ ] Admin can login and create content
4. [ ] Students can view subjects/chapters/resources
5. [ ] Students can take tests and see scores
6. [ ] Admin can see student count
7. [ ] All pages load in <2 seconds
8. [ ] No console errors
9. [ ] Mobile responsive
10. [ ] One real admin user configured

**Estimated time to success: 2-3 hours**

---

## Next Milestones (Optional)

### Week 1: Soft Launch
- [ ] Add 3-5 subjects
- [ ] Add 2-3 chapters per subject
- [ ] Upload sample resources
- [ ] Create 1-2 tests per chapter
- [ ] Invite 10-20 beta testers

### Week 2: Gather Feedback
- [ ] Collect bug reports
- [ ] Get content feedback
- [ ] Optimize based on usage
- [ ] Add more content

### Week 3: Full Launch
- [ ] Open to all students
- [ ] Market/advertise
- [ ] Monitor performance
- [ ] Maintain and improve

---

## Need Help?

1. **Setup issues** → Read [SETUP.md](SETUP.md)
2. **Admin help** → Read [ADMIN_QUICKSTART.md](ADMIN_QUICKSTART.md)
3. **Deployment** → Read [DEPLOYMENT.md](DEPLOYMENT.md)
4. **Architecture** → Read [ARCHITECTURE.md](ARCHITECTURE.md)
5. **Errors** → Check browser console (F12)

---

**You've got this! Follow the checklist and you'll have a working platform in 2-3 hours.**

Good luck! 🚀
