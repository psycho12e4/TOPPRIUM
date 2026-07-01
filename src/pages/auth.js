import { signUp, signIn, supabase } from '../lib/supabase.js'
import { showNotification } from '../lib/utils.js'
import { Router } from '../lib/router.js'
import { renderNav } from '../components/nav.js'

export async function renderLogin() {
  return `
    ${renderNav()}
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-md">
        <div class="card">
          <h2 class="text-3xl font-bold text-center mb-8">Login</h2>
          <form id="login-form">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2">Email</label>
              <input type="email" id="email" required class="input" placeholder="you@example.com">
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2">Password</label>
              <input type="password" id="password" required class="input" placeholder="••••••••">
            </div>
            <button type="submit" class="w-full btn btn-primary">Login</button>
          </form>
          <p class="text-center mt-4 text-sm text-gray-600">
            Don't have an account? <a href="/signup" class="text-blue-600 hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  `
}

export async function renderSignup() {
  return `
    ${renderNav()}
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-md">
        <div class="card">
          <h2 class="text-3xl font-bold text-center mb-8">Sign Up</h2>
          <form id="signup-form">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2">Email</label>
              <input type="email" id="email" required class="input" placeholder="you@example.com">
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2">Password</label>
              <input type="password" id="password" required class="input" placeholder="••••••••">
            </div>
            <button type="submit" class="w-full btn btn-primary">Sign Up</button>
          </form>
          <p class="text-center mt-4 text-sm text-gray-600">
            Already have an account? <a href="/login" class="text-blue-600 hover:underline">Login</a>
          </p>
        </div>
      </div>
    </div>
  `
}

function getErrorMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.error_description) return error.error_description
  if (error.msg) return error.msg
  return ''
}

export function initAuthEvents() {
  const loginForm = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value

      let result
      try {
        result = await signIn(email, password)
      } catch (ex) {
        showNotification(ex?.message || 'Login failed', 'error')
        return
      }

      const { data, error } = result
      if (error || !data?.user) {
        showNotification(getErrorMessage(error) || 'Invalid login credentials', 'error')
      } else {
        showNotification('Logged in successfully')
        localStorage.setItem('userId', data.user.id)
        Router.setPath('/')
        window.location.href = '/'
      }
    })
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value

      let result
      try {
        result = await signUp(email, password)
      } catch (ex) {
        showNotification(ex?.message || 'Signup failed', 'error')
        return
      }

      const { data, error } = result

      // Signup succeeded with a session — go straight in
      if (!error && data?.session && data?.user) {
        showNotification('Account created! Logging in...')
        localStorage.setItem('userId', data.user.id)
        Router.setPath('/')
        window.location.href = '/'
        return
      }

      // Signup returned a user but no session (email confirm on, or rate limit)
      // OR signup errored (user may already exist) — fall back to login attempt
      const { data: loginData, error: loginError } = await signIn(email, password)
      if (!loginError && loginData?.user) {
        showNotification('Logged in successfully')
        localStorage.setItem('userId', loginData.user.id)
        Router.setPath('/')
        window.location.href = '/'
        return
      }

      const msg = getErrorMessage(error) || getErrorMessage(loginError) || 'Signup failed'
      showNotification(msg, 'error')
    })
  }
}
