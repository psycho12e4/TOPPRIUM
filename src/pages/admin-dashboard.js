import { getSubjects, getStudentCount } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'

export async function renderAdminDashboard() {
  const { data: subjects } = await getSubjects()
  const { count: studentCount } = await getStudentCount()

  return `
    ${renderNav(true)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-12">Admin Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div class="card">
          <p class="text-gray-600 text-sm font-medium">Total Subjects</p>
          <p class="text-4xl font-bold text-blue-600 mt-2">${subjects?.length || 0}</p>
        </div>
        <div class="card">
          <p class="text-gray-600 text-sm font-medium">Total Students</p>
          <p class="text-4xl font-bold text-green-600 mt-2">${studentCount}</p>
        </div>
        <div class="card">
          <p class="text-gray-600 text-sm font-medium">Status</p>
          <p class="text-lg font-semibold text-gray-900 mt-2">✓ Active</p>
        </div>
      </div>

      <div class="card">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/admin/subjects" class="btn btn-primary">Manage Subjects</a>
          <a href="/admin/resources" class="btn btn-secondary">Upload Resources</a>
        </div>
      </div>
    </div>
  `
}

export function initAdminDashboardEvents() {
  initNavEvents()
}
