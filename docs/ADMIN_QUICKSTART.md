# Admin Quick Start Guide

## 1. Set Yourself as Admin

After signing up:
1. Login to [Supabase](https://supabase.com)
2. Go to your project
3. Click "SQL Editor"
4. Run this:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your_user_id';
```

Find your user ID in `auth.users` table, or check browser localStorage.

## 2. Access Admin Panel

Go to: `yoursite.com/admin`

You should see the dashboard with 3 cards:
- Total Subjects
- Total Students  
- Status

## 3. Create Content

### Option A: Via UI (Easier)

**Create Subject:**
1. Click "Manage Subjects" 
2. Click "+ Add Subject"
3. Enter name (e.g., "Mathematics", "Biology")
4. Done!

**Create Chapter:**
1. Click "Chapters" button next to subject
2. Click "+ Add Chapter"
3. Enter title (e.g., "Chapter 1: Introduction")

**Upload Resources:**
1. Go to Admin → Upload Resources
2. Select Subject → Chapter
3. Enter resource title
4. Select file (PDF, PPT, DOCX, video, image)
5. Click Upload
6. Done! File appears on student page

**Create Test:**
1. Go to Admin → Create Tests
2. Select Subject → Chapter
3. Enter test name
4. Click "Create Test"
5. Click "Load Questions"
6. Click "+ Add Question"
7. Enter:
   - Question text
   - Option A, B, C, D
   - Correct answer (a/b/c/d)
8. Done!

### Option B: Via SQL (Advanced)

Insert directly into database:

```sql
-- Create a subject
INSERT INTO subjects (name) VALUES ('Mathematics') 
RETURNING id;

-- Create a chapter (use subject_id from above)
INSERT INTO chapters (subject_id, title) 
VALUES ('subject-id-here', 'Chapter 1: Basics') 
RETURNING id;

-- Create a test (use chapter_id from above)
INSERT INTO tests (chapter_id, title) 
VALUES ('chapter-id-here', 'Chapter 1 Quiz') 
RETURNING id;

-- Add a question (use test_id from above)
INSERT INTO questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer)
VALUES (
  'test-id-here',
  'What is 2+2?',
  '3',
  '4',
  '5',
  '6',
  'b'
);
```

## 4. View Student Progress

Go to `/admin` dashboard to see:
- Total number of students
- Total subjects created

To view individual scores:
1. Go to Supabase SQL Editor
2. Run:
```sql
SELECT u.email, ts.score, ts.total_questions, t.title, ts.created_at
FROM test_scores ts
JOIN auth.users u ON ts.user_id = u.id
JOIN tests t ON ts.test_id = t.id
ORDER BY ts.created_at DESC;
```

## 5. File Size Limits

- **Single file:** 5GB max (Supabase free tier)
- **Storage total:** 1GB free per month
- **Tips:**
  - Compress PDFs before upload
  - Use MP4 for videos (smaller than MOV)
  - JPG images instead of PNG when possible
  - Recommended max file size: 50MB

## 6. Supported File Types

✅ **Approved:**
- PDF (`.pdf`) - Documents
- PowerPoint (`.pptx`) - Presentations  
- Word (`.docx`) - Documents
- Video (`.mp4`) - Lessons
- Images (`.jpg`, `.png`) - Diagrams
- Audio (`.mp3`) - Optional

❌ **Not recommended:**
- PPTX converted to video (use HTML5 video instead)
- Huge video files (>200MB) - compress first
- Executable files
- Encrypted documents

## 7. Best Practices

### Naming
- Subject: "Mathematics", "Science", "History"
- Chapter: "1. Basic Concepts", "2. Problem Solving"
- Resource: "Lecture Notes - Chapter 1", "Practice Problems"
- Test: "Chapter 1 Quiz", "Mid-term Exam"

### Organization
```
Mathematics
├── Chapter 1: Algebra Basics
│   ├── Resource: Lecture Notes.pdf
│   ├── Resource: Video Lesson.mp4
│   └── Test: Chapter 1 Quiz
├── Chapter 2: Equations
│   ├── Resource: Textbook Excerpt.pdf
│   ├── Resource: Practice Problems.docx
│   └── Test: Chapter 2 Quiz
```

### Content Tips
- Keep chapter titles short
- Use descriptive resource names
- Test questions should be clear and concise
- Check all files work before uploading
- Use relative dates in naming ("Q1 2024" not "Jan 2024")

## 8. Make Someone Else Admin

Run in SQL Editor:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'teacher@example.com'
);
```

Or do it manually:
1. Have teacher sign up
2. Find their user ID in `auth.users`
3. Update their profile role to 'admin'

## 9. Troubleshooting

**Can't access /admin:**
- Reload page (Ctrl+R)
- Check browser console (F12)
- Verify your role is 'admin' in profiles table
- Try incognito mode

**File won't upload:**
- Check file size (<100MB recommended)
- Verify storage bucket exists (named 'resources')
- Try different file format
- Check internet connection

**Can't create test:**
- Verify chapter is selected
- Ensure chapter belongs to selected subject
- Check for JavaScript errors (F12 console)

**Students can't see resources:**
- Verify file_url starts with https://
- Check storage bucket is public (not private)
- Wait 5 minutes for cache to clear
- Test link directly in new tab

## 10. Backup Your Data

Weekly backup:
1. Supabase Dashboard → SQL Editor
2. Run:
```sql
-- Export data
COPY (SELECT * FROM subjects) 
TO STDOUT CSV HEADER;
```
3. Save results to `.csv` file
4. Or use Supabase built-in backups

## Common Tasks

### Delete a Subject
```sql
DELETE FROM subjects WHERE id = 'subject-id';
-- (automatically deletes chapters & resources via cascade)
```

### Edit a Chapter Title
```sql
UPDATE chapters 
SET title = 'New Title'
WHERE id = 'chapter-id';
```

### View All Resources in a Chapter
```sql
SELECT * FROM resources 
WHERE chapter_id = 'chapter-id';
```

### See Which Students Took Which Tests
```sql
SELECT DISTINCT u.email, t.title
FROM test_scores ts
JOIN auth.users u ON ts.user_id = u.id
JOIN tests t ON ts.test_id = t.id
ORDER BY u.email;
```

## Support

Check `SETUP.md` or `DEPLOYMENT.md` for more help.

---

**You're all set! Start adding content now!**
