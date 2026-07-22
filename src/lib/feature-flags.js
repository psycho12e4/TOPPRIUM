// Single source of truth for features that are built but not yet ready to go
// live for real users. Flip to true when the feature should ship.

// Locked previews on chapter pages, the /buy-course request page, and the
// /admin/course-requests admin section. Approved to go live, still marked
// "Beta" in the UI (see COURSE_ACCESS_BETA_LABEL) while it's proven out.
export const COURSE_ACCESS_ENABLED = true

// Shown next to locked-card copy and the buy-course page while this feature
// is still being validated in production. Flip to false once it's no longer
// considered beta.
export const COURSE_ACCESS_BETA_LABEL = true
