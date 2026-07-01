# TOPPRIUM Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet Users                           │
│                                                                   │
│  Student    │   Admin    │   Guest                              │
└──────┬──────┴────┬───────┴───────┬──────────────────────────────┘
       │           │               │
       └───────────┼───────────────┘
                   │
       ┌───────────▼───────────┐
       │  Static HTML/CSS/JS   │
       │  (Served by Vercel)   │
       │   (50KB bundle)       │
       └───────────┬───────────┘
                   │
       ┌───────────▼───────────────────────────┐
       │   Client-Side Router                  │
       │   (SPA - Single Page App)             │
       │   No server rendering needed          │
       └───────────┬───────────────────────────┘
                   │
       ┌───────────┴─────────────────────────────────────┐
       │                                                   │
   ┌───▼──────────────────┐     ┌──────────────────────┐
   │  Supabase Auth       │     │  Supabase Database   │
   │                      │     │  (PostgreSQL)        │
   │  • Signup            │     │                      │
   │  • Login             │     │  Tables:             │
   │  • Session mgmt      │     │  • profiles          │
   │  • JWT tokens        │     │  • subjects          │
   │  • Email verify      │     │  • chapters          │
   │  • User lifecycle    │     │  • resources         │
   │                      │     │  • tests             │
   │                      │     │  • questions         │
   │                      │     │  • test_scores       │
   └──────┬───────────────┘     │                      │
          │                     │  Row Level Security  │
          │                     │  (automatic access   │
          │                     │   control)           │
          └─────────┬───────────┴──────────────────────┘
                    │
              ┌─────▼────────────┐
              │ Supabase API     │
              │ (REST endpoints) │
              │ postgres://...   │
              └──────────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
   ┌───▼──────────────┐    ┌─────▼──────────────┐
   │ Supabase Storage │    │ Database           │
   │ (AWS S3 backed)  │    │ (PostgreSQL)       │
   │                  │    │                    │
   │ Bucket:          │    │ • Persists all     │
   │ "resources"      │    │   content          │
   │ (public access)  │    │ • RLS enforced     │
   │                  │    │ • Backup daily     │
   │ • PDFs           │    │                    │
   │ • Videos         │    │                    │
   │ • Images         │    │                    │
   │ • Documents      │    │                    │
   └──────────────────┘    └────────────────────┘
```

---

## Data Flow Diagram

### Student Learning Flow

```
Student Visits Site
    │
    ▼
┌─────────────────┐
│ Load /          │
│ (Home Page)     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ Query: SELECT * FROM subjects│
│ Results: List of subjects    │
└────────┬─────────────────────┘
         │ Click subject
         ▼
┌─────────────────────────────────────┐
│ Load /subject/:id                   │
│ Query: SELECT * FROM chapters       │
│ Results: Chapters in subject        │
└────────┬────────────────────────────┘
         │ Click chapter
         ▼
┌──────────────────────────────────────────────┐
│ Load /chapter/:id                            │
│ Queries:                                     │
│ 1. SELECT * FROM resources (files)           │
│ 2. SELECT * FROM tests (quizzes)             │
└────────┬──────────────────┬──────────────────┘
         │                  │
    Download            Take Test
    File                    │
         │                  ▼
         │           ┌──────────────────────┐
         │           │ Load /test/:id       │
         │           │ Query: Questions     │
         │           └─────────┬────────────┘
         │                     │
         │               Answer Q1
         │               Answer Q2
         │               Submit
         │                     │
         │                     ▼
         │           ┌─────────────────────────┐
         │           │ Calculate Score         │
         │           │ INSERT INTO test_scores │
         │           │ SHOW RESULT             │
         │           └─────────────────────────┘
         │
    File downloaded ──→ User has learned
         │
         ▼
    Back to home
```

### Admin Content Creation Flow

```
Admin Logs In
    │
    ▼
┌──────────────────────────────────┐
│ Verify: role = 'admin' in profile│
│ If not: Redirect to /            │
└────────┬─────────────────────────┘
         │ Access granted
         ▼
┌──────────────────────────────────┐
│ Go to /admin/subjects            │
│ Query: SELECT * FROM subjects    │
└────────┬─────────────────────────┘
         │
    ┌────┴──────────────────────────────────────┐
    │                                           │
    ▼                                           ▼
┌─────────────────────┐            ┌──────────────────────┐
│ Create Subject      │            │ Create Chapter       │
│ INPUT: name         │            │ INPUT: subject, name │
│ INSERT subjects     │            │ INSERT chapters      │
│ Returns new subject │            │ Returns new chapter  │
└─────────────────────┘            └──────┬───────────────┘
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │ Go to /admin/resources          │
                        │ Select chapter to add files to  │
                        └──────────────┬──────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │ Upload File                 │
                        │ 1. Select file              │
                        │ 2. Upload to storage bucket │
                        │ 3. Get file URL             │
                        │ 4. INSERT into resources    │
                        │ 5. File appears on site     │
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │ Go to /admin/tests          │
                        │ Select chapter              │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │ Create Test                 │
                        │ INPUT: test title           │
                        │ INSERT tests                │
                        │ Returns new test            │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │ Add Questions               │
                        │ INPUT: q, opt_a/b/c/d, ans  │
                        │ INSERT questions            │
                        │ Test ready for students     │
                        └─────────────────────────────┘

Content → Automatically appears on student site
```

---

## Technology Stack

```
┌──────────────────────────────────────────────────────────┐
│                    TOPPRIUM Stack                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend                   Backend           Storage     │
│  ─────────────────         ──────────────     ─────────  │
│  • Vanilla JS              • PostgreSQL       • AWS S3    │
│  • Tailwind CSS            • Row Level Sec.   • Vercel    │
│  • Vite                    • Supabase Auth    • CDN       │
│  • No dependencies*        • REST API                     │
│                            • Real-time subs. (optional)   │
│                                                           │
│ *Except: @supabase/supabase-js (10KB)                    │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                   Total Size                              │
│                                                           │
│  Bundle: 50KB (gzipped: 15KB)                            │
│  Load time: <1 second on 3G                              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           Vercel CDN (Edge)                              │
│  • Global static hosting                                │
│  • Auto-minifies HTML/CSS/JS                            │
│  • Caching headers                                      │
│  • 90+ edge locations worldwide                         │
└────────────┬────────────────────────────────────────────┘
             │
   ┌─────────┴─────────┬───────────────┐
   │                   │               │
   ▼                   ▼               ▼
┌──────────┐     ┌──────────┐    ┌──────────────┐
│index.html│     │ JS files │    │ CSS files    │
│          │     │ (8KB)    │    │ (2KB)        │
└──────────┘     └──────────┘    └──────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │ Supabase API            │
        │ (Managed by Supabase)   │
        │                         │
        │ https://xxx.supabase.co │
        │                         │
        └────────┬────────┬───────┘
                 │        │
       ┌─────────▼──┐ ┌───▼──────────┐
       │ Database   │ │ Storage      │
       │ (Postgres) │ │ (AWS S3)     │
       └────────────┘ └──────────────┘
```

---

## Security Architecture

```
┌───────────────────────────────────────────────────────────┐
│                   Security Layers                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  Layer 1: Authentication                                 │
│  ──────────────────────                                  │
│  • Supabase Auth (built-in)                              │
│  • Email + password (or social)                          │
│  • JWT tokens in localStorage                            │
│  • Auto logout on token expiry                           │
│                                                            │
│  Layer 2: Authorization (RLS)                            │
│  ────────────────────────────                            │
│  • Every table has RLS enabled                           │
│  • Policies enforce access:                              │
│    - Students: read subjects/chapters/tests              │
│    - Students: write only own test_scores                │
│    - Admins: full access to all tables                   │
│  • Database enforces at SQL level                        │
│  • No way to bypass from app                             │
│                                                            │
│  Layer 3: Network Security                               │
│  ──────────────────────────                              │
│  • HTTPS/SSL enforced                                    │
│  • All API calls authenticated                           │
│  • CORS headers prevent unauthorized origins             │
│  • Vercel provides DDoS protection                        │
│                                                            │
│  Layer 4: Data Protection                                │
│  ──────────────────────                                 │
│  • Passwords hashed by Supabase                          │
│  • Files in public storage but hard to enumerate         │
│  • No sensitive data in localStorage                     │
│  • Database backups encrypted at rest                    │
│                                                            │
├───────────────────────────────────────────────────────────┤
│                    Attack Surface                          │
│                                                            │
│  ✗ SQL Injection: Impossible (Supabase parameterizes)   │
│  ✗ XSS: No eval/innerHTML (only textContent)             │
│  ✗ CSRF: Supabase handles tokens securely                │
│  ✗ Brute Force: Supabase rate limits (5 attempts/min)   │
│  ✗ Session Hijacking: Tokens rotated automatically       │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## Scalability Path

```
Phase 1: MVP (Current - 10K students)
├── Free Supabase tier
├── Vercel free tier
├── 500MB storage
└── <2GB bandwidth/month

Phase 2: Growth (10K-100K students) - Cost ~$50/month
├── Supabase Pro ($25/month): 8GB storage
├── Vercel Pro ($20/month): better support
├── Still no database upgrade needed
└── 100GB bandwidth/month

Phase 3: Scale (100K+ students) - Cost ~$200+/month
├── Supabase Business plan ($600/month)
├── Vercel + Enterprise SLA
├── Cloudflare R2 for file storage
├── Redis caching for queries
└── CDN optimization for resources

Phase 4: Enterprise (1M+ students)
├── Dedicated Postgres instance
├── Multi-region deployment
├── Custom infrastructure
└── Hire infrastructure team
```

---

## API Design

### All Queries via Supabase REST

```javascript
// Pattern used throughout app
const { data, error } = await supabase
  .from('table_name')
  .select('columns')
  .eq('column', 'value')
  .single()

// Example: Get a subject
const { data: subject, error } = await supabase
  .from('subjects')
  .select('*')
  .eq('id', subjectId)
  .single()

// RLS automatically filters based on:
// - User ID (via auth.uid())
// - User role (via profiles table lookup)
// - Policy rules (defined in schema.sql)
```

---

## Browser Compatibility

| Feature | Support |
|---------|---------|
| ES6+ JavaScript | Chrome, Firefox, Safari 12+, Edge 79+ |
| CSS Grid/Flexbox | All modern browsers |
| Fetch API | All modern browsers |
| localStorage | All browsers (1MB storage) |
| Service Workers | Not used (not needed) |

**Minimum Requirements:**
- Modern browser (released after 2018)
- JavaScript enabled
- Cookies/localStorage enabled
- 10MB free storage (for browser cache)

---

## Performance Metrics

```
Load Times:
├── First Paint: <500ms
├── First Contentful Paint: <800ms
├── Time to Interactive: <1.2s
└── Complete Load: <2s

Bundle Sizes (gzipped):
├── JavaScript: 15KB
├── CSS: 2KB
├── Images: 0KB (using emojis)
└── Total: 17KB

Runtime Performance:
├── Page navigation: <100ms
├── Database queries: 50-200ms
├── File upload: <5s (network limited)
└── Test submission: <500ms
```

---

## Monitoring Checklist

```
Daily:
□ Check Vercel deployment status
□ Monitor for critical errors (browser console)

Weekly:
□ Review Supabase database size
□ Check storage usage (should be <500MB free tier)
□ Count total students

Monthly:
□ Export database backup
□ Review test scores for issues
□ Update content if needed
□ Check security logs

Quarterly:
□ Upgrade dependencies (npm update)
□ Review & optimize slow queries
□ Plan capacity upgrades if needed
□ Security audit of RLS policies
```

---

This architecture is designed for:
- ✓ Simplicity (no moving parts)
- ✓ Reliability (managed services)
- ✓ Cost-effectiveness (free tier viable)
- ✓ Security (RLS automatic)
- ✓ Scalability (add capacity as needed)
