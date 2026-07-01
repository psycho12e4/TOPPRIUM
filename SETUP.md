# TOPPRIUM Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your **Project URL** and **Anon Key**
4. Go to SQL Editor and run `supabase/schema.sql`

### 3. Set Environment Variables
Create `.env` file in root:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Configure Supabase Storage
1. Go to Storage in Supabase console
2. Create a new bucket named `resources` (public)
3. No additional configuration needed

### 5. Create Admin User
1. Go to Supabase Authentication → Users
2. Create a user manually or use Sign Up on /signup
3. In Supabase console, go to profiles table
4. Find the user and change role from 'student' to 'admin'

### 6. Start Development
```bash
npm run dev
```
Navigate to `http://localhost:3000`

## Admin Access
- Go to `/admin` to access admin dashboard
- Only users with `role = 'admin'` in profiles table can access
- Regular students cannot access admin routes

## File Structure
```
TOPPRIUM/
├── src/
│   ├── index.html          # Entry point
│   ├── main.js             # Router & app init
│   ├── styles.css          # Tailwind + custom CSS
│   ├── lib/
│   │   ├── supabase.js     # Supabase client & queries
│   │   ├── router.js       # Client-side router
│   │   └── utils.js        # Helper functions
│   ├── components/
│   │   └── nav.js          # Navigation component
│   └── pages/
│       ├── auth.js         # Login/Signup
│       ├── home.js         # Student home
│       ├── subject.js      # Subject detail
│       ├── chapter.js      # Chapter with resources & tests
│       ├── test.js         # Take test
│       ├── admin-dashboard.js
│       ├── admin-subjects.js
│       ├── admin-resources.js
│       └── admin-tests.js
├── supabase/
│   └── schema.sql          # Database schema
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Database Schema

### profiles
- `id` (uuid) - User ID from auth
- `role` (text) - 'student' or 'admin'

### subjects
- `id` (uuid)
- `name` (text)

### chapters
- `id` (uuid)
- `subject_id` (uuid) - FK to subjects
- `title` (text)

### resources
- `id` (uuid)
- `chapter_id` (uuid) - FK to chapters
- `title` (text)
- `file_url` (text)
- `file_type` (text) - MIME type

### tests
- `id` (uuid)
- `chapter_id` (uuid) - FK to chapters
- `title` (text)

### questions
- `id` (uuid)
- `test_id` (uuid) - FK to tests
- `question` (text)
- `option_a, option_b, option_c, option_d` (text)
- `correct_answer` (text) - 'a', 'b', 'c', or 'd'

### test_scores
- `id` (uuid)
- `user_id` (uuid) - FK to auth.users
- `test_id` (uuid) - FK to tests
- `score` (integer)
- `total_questions` (integer)

## Admin Workflow

### Add Subject
1. Login as admin
2. Go to /admin/subjects
3. Click "Add Subject"
4. Enter name

### Add Chapter
1. Go to /admin/subjects
2. Click "Chapters" button
3. Click "Add Chapter"
4. Enter title

### Upload Resources
1. Go to /admin/resources
2. Select subject and chapter
3. Upload file (PDF, PPT, DOCX, MP4, images, etc.)
4. Resources appear automatically in student view

### Create Tests
1. Go to /admin/tests
2. Select subject and chapter
3. Create test
4. Click "Load Questions"
5. Add questions with 4 options and correct answer

## Student Workflow

1. Sign up or login
2. Browse subjects
3. View chapters and resources
4. Download or view files
5. Take tests
6. See scores

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Push to GitHub
# Connect repo to Vercel
# Add environment variables in Vercel settings
```

### Netlify
```bash
npm run build
# Drop dist/ folder or connect GitHub
# Add environment variables in Netlify settings
```

### Self-Hosted (Node/Express)
```bash
npm run build
npx serve -s dist -l 3000
```

## Cost Optimization

- Supabase free tier: 500MB storage, unlimited API calls
- File uploads: Use jpg/png instead of original formats when possible
- Supabase Storage: 1GB free per month
- Database: Unlimited rows (free tier)
- Bandwidth: 2GB free per month

## Security Notes

- Row Level Security (RLS) enabled on all tables
- Admin-only routes protected at app level
- File uploads go to public storage bucket
- Sessions managed by Supabase Auth
- No sensitive data stored client-side

## Troubleshooting

**Admin can't access /admin:**
- Check profiles table - role should be 'admin'
- Clear browser cache
- Re-login

**Resources not showing:**
- Check storage bucket exists and is public
- Verify file_url in database is correct
- Check browser console for errors

**Tests not saving scores:**
- Check test_scores table has correct RLS policy
- Verify user is logged in
- Check browser console

**File upload fails:**
- Verify storage bucket exists
- Check bucket is public
- Verify file type is allowed

## Support
Check browser console (F12) for detailed error messages.
