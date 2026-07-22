// The site is scoped to a single class for now. Subjects with no grade set
// are treated as belonging to this class too (that's the only class in use
// today), so only subjects explicitly tagged with a DIFFERENT grade are
// excluded. Change CURRENT_CLASS (or remove the filter calls) when more
// classes go live.
export const CURRENT_CLASS = 'IX'

export function isCurrentClassSubject(subject) {
  return !subject.grade || subject.grade === CURRENT_CLASS
}

export function filterToCurrentClass(subjects) {
  return (subjects || []).filter(isCurrentClassSubject)
}
