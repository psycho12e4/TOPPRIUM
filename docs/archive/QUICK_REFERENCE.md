# TOPPRIUM Quick Reference

## Essential Commands

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server (localhost:3000)
npm run build       # Build for production
npm run preview     # Preview production build

# Git
git add .
git commit -m "Your message"
git push origin main

# Supabase
psql postgresql://...  # Connect to database (if needed)
```

## Essential URLs

| Purpose | URL |
|---------|-----|
| **Development** | `http://localhost:3000` |
| **Production** | `https://yourapp.vercel.app` |
| **Supabase** | `https://supabase.com/dashboard` |
| **Vercel** | `https://vercel.com/dashboard` |
| **GitHub** | `https://github.com/yourname/topprium` |

## Student Routes

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Browse subjects |
| Subject | `/subject/:id` | View chapters |
| Chapter | `/chapter/:id` | View resources & tests |
| Test | `/test/:id` | Take quiz |
| Login | `/login` | Sign in |
| Signup | `/signup` | Register |

## Admin Routes

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | Overview & stats |
| Subjects | `/admin/subjects` | Create/manage subjects & chapters |
| Resources | `/admin/resources` | Upload files |
| Tests | `/admin/tests` | Create/manage tests |

## File Structure

```
src/
├── pages/                 # Page components
│   ├── auth.js           # Login/Signup
│   ├── home.js           # Student home
│   ├── subject.js        # Subject detail
│   ├── chapter.js        # Chapter detail
│   ├── test.js           # Test interface
│   ├── admin-*.js        # Admin pages (4 files)
│
├── components/
│   └── nav.js            # Navigation
│
├── lib/
│   ├── supabase.js       # Database API
│   ├── router.js         # Routing logic
│   └── utils.js          # Helper functions
│
├── index.html            # HTML root
├── main.js               # App initialization
└── styles.css            # Tailwind + custom
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User roles (student/admin) |
| `subjects` | Course topics |
| `chapters` | Sub-sections of subjects |
| `resources` | Uploaded files |
| `tests` | Quizzes/exams |
| `questions` | Quiz questions |
| `test_scores` | Student results |

## Common Database Queries

```sql
-- View all subjects
SELECT * FROM subjects;

-- View chapters in a subject
SELECT * FROM chapters WHERE subject_id = 'uuid-here';

-- View resources in a chapter
SELECT * FROM resources WHERE chapter_id = 'uuid-here';

-- View student scores
SELECT u.email, t.title, ts.score, ts.total_questions
FROM test_scores ts
JOIN auth.users u ON ts.user_id = u.id
JOIN tests t ON ts.test_id = t.id;

-- Make someone admin
UPDATE profiles SET role = 'admin' WHERE id = 'user-id';

-- Delete a subject (cascades to chapters, resources, tests)
DELETE FROM subjects WHERE id = 'subject-id';

-- Count total students
SELECT COUNT(*) FROM profiles WHERE role = 'student';
```

## Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get them:**
1. Supabase Dashboard → Project Settings → API
2. Copy Project URL and anon public key
3. Paste into `.env` file
4. Restart dev server

## Key Files to Edit

| File | When | Why |
|------|------|-----|
| `src/components/nav.js` | Change branding | Update "TOPPRIUM" name |
| `src/styles.css` | Change colors | Edit color theme |
| `tailwind.config.js` | Add custom colors | Theme customization |
| `supabase/schema.sql` | Add tables/columns | Database schema changes |
| `package.json` | Add dependencies | New npm packages |

## Authentication Flow

```
User visits /signup
   ↓
Enters email & password
   ↓
Supabase creates user
   ↓
Trigger creates profile with role='student'
   ↓
Email sent for verification
   ↓
User confirms email
   ↓
Can now login
```

## Admin Workflow

```
1. Login with admin account
2. Go to /admin/subjects
3. Create subject
4. Expand → Add chapter
5. Go to /admin/resources
6. Upload file to chapter
7. Go to /admin/tests
8. Create test
9. Add questions
10. Done! Students see it immediately
```

## Deployment Checklist

- [ ] `.env` file has Supabase credentials
- [ ] `npm run build` succeeds
- [ ] Pushed to GitHub
- [ ] Connected to Vercel
- [ ] Environment variables set in Vercel
- [ ] Site loads on production URL
- [ ] Login works on production
- [ ] Admin can access /admin
- [ ] File uploads work
- [ ] Tests save scores

## Cost Summary

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Supabase** | $0 | 500MB storage, unlimited rows |
| **Vercel** | $0 | Unlimited API calls |
| **Domain** | $0 (*.vercel.app) | Use *.vercel.app or buy .com |
| **Total** | **$0** | Supports 10K+ students |

**Upgrade when:**
- Storage >500MB → Supabase Pro ($25)
- Need priority support → Vercel Pro ($20)
- Want custom domain → .com ($10-15/yr)

## Performance

```
Load Time: <1 second
Bundle Size: 50KB (gzipped 15KB)
Database Queries: 50-200ms
Page Navigation: <100ms
File Upload: <5s (network limited)
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page | Check browser console (F12) for errors |
| Can't login | Verify email in auth.users table |
| Can't access /admin | Check role='admin' in profiles table |
| File won't upload | Verify 'resources' bucket exists & is public |
| RLS error (403) | Check SQL update for setting admin role |
| No env variables | Create `.env` file from `.env.example` |
| Build fails | Run `npm cache clean --force` then `npm install` |

## Browser DevTools Tips

```javascript
// Open console (F12)

// Check if logged in
localStorage.getItem('userId')

// View all localStorage
localStorage

// Clear storage
localStorage.clear()

// Check Supabase client
import { supabase } from './lib/supabase.js'
await supabase.auth.getUser()
```

## Vercel Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull

# View logs
vercel logs
```

## Supabase CLI

```bash
# Install CLI
npm i -g supabase

# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Pull database schema
supabase db pull

# Push changes
supabase db push
```

## GitHub Commands

```bash
# First time
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <url>
git push -u origin main

# Subsequent pushes
git add .
git commit -m "Your message"
git push
```

## Security Quick Checks

- [ ] No passwords in `.env` (except db password, keep safe)
- [ ] No API keys in source code
- [ ] RLS enabled on all database tables
- [ ] Storage bucket is public (not private)
- [ ] HTTPS enforced (Vercel does this)
- [ ] Only one admin user (you)

## Monitoring Checklist

- [ ] Weekly: Check Supabase storage usage
- [ ] Weekly: Check for JavaScript errors (F12)
- [ ] Monthly: Review test scores
- [ ] Monthly: Backup database
- [ ] Monthly: Check security logs
- [ ] Quarterly: Update npm dependencies

## Memory Joggers

**I need to...**

- [ ] Deploy to Vercel → Read [DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] Set up initial database → Run `supabase/schema.sql`
- [ ] Make admin account → SQL: `UPDATE profiles SET role = 'admin'...`
- [ ] Upload files → Go to `/admin/resources`
- [ ] Create test → Go to `/admin/tests`
- [ ] Add content → Use `/admin` dashboard
- [ ] Fix broken site → Check browser console (F12)
- [ ] Understand architecture → Read [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Implement step-by-step → Follow [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)

## Support Resources

1. **For Setup:** [SETUP.md](SETUP.md)
2. **For Admin:** [ADMIN_QUICKSTART.md](ADMIN_QUICKSTART.md)
3. **For Deployment:** [DEPLOYMENT.md](DEPLOYMENT.md)
4. **For Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
5. **For Checklist:** [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)
6. **For Overview:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

## Pro Tips

✅ **Do:**
- Keep `.env` file secure (never commit)
- Backup Supabase data monthly
- Test locally before deploying
- Monitor Supabase usage
- Keep dependencies updated

❌ **Don't:**
- Share Supabase keys publicly
- Upload huge files (>100MB)
- Delete production database
- Push without testing
- Ignore error messages

---

**Everything you need on one page!**

Save this locally for quick reference.
