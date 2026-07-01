# TOPPRIUM - Fast Educational Platform

A lightweight, cost-effective learning platform built with vanilla JavaScript, Tailwind CSS, and Supabase.

## Features

### For Students
- Browse subjects and chapters
- View uploaded resources (PDFs, videos, images, presentations, documents)
- Take tests and get instant scores
- Track personal test scores

### For Admins
- Create and manage subjects
- Create and manage chapters
- Upload educational resources
- Create tests with multiple-choice questions
- View student count

## Tech Stack

- **Frontend:** Vanilla JavaScript, Tailwind CSS, Vite
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel or self-hosted
- **Cost:** ~$50/month (or free tier for <10K students)

## Quick Start

```bash
npm install
npm run dev
```

See [SETUP.md](SETUP.md) for detailed instructions.

## Deployment

Push to GitHub, connect to Vercel, add env vars. Done!

See [DEPLOYMENT.md](DEPLOYMENT.md) for full guide.

## Project Structure

```
src/
├── pages/           # Student & admin pages
├── components/      # Reusable components
├── lib/            # Supabase & utilities
└── main.js         # Router & initialization
```

## Key Files

- `src/main.js` - Route handling
- `src/lib/supabase.js` - Database queries
- `supabase/schema.sql` - Database schema
- `.env.example` - Required environment variables

## Admin Routes

- `/admin` - Dashboard
- `/admin/subjects` - Manage subjects/chapters
- `/admin/resources` - Upload files
- `/admin/tests` - Create tests

## Student Routes

- `/` - Home (subject list)
- `/subject/:id` - Subject detail
- `/chapter/:id` - Chapter with resources & tests
- `/test/:id` - Take a test
- `/login` - Login
- `/signup` - Register

## Database

7 main tables with Row Level Security:
- `profiles` - User roles
- `subjects` - Course subjects
- `chapters` - Sub-topics
- `resources` - Uploaded files
- `tests` - Quizzes
- `questions` - Test questions
- `test_scores` - Student results

## Security

- All users start as 'student' role
- Admins set manually in database
- Row Level Security on all tables
- Public file storage with auth protection
- No sensitive data on client

## Performance

- **Fast:** Vite bundling, no frameworks
- **Lightweight:** <50KB JavaScript
- **Cheap:** Supabase free tier supports 10K+ students
- **Scalable:** Indexes on all FKs, optimized queries

## Support & Issues

1. Check [SETUP.md](SETUP.md) troubleshooting
2. Review browser console (F12) for errors
3. Check Supabase dashboard for database issues
4. Verify environment variables are set

## License

MIT

---

**Built with ❤️ for educators**
