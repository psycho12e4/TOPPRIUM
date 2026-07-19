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
            <p id="auth-error" class="hidden mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"></p>
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
            <p id="auth-error" class="hidden mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"></p>
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

// Show an error both inline (persistent) and as a toast, so it can't be missed.
function showAuthError(message) {
  const el = document.getElementById('auth-error')
  if (el) {
    el.textContent = message
    el.classList.remove('hidden')
  }
  showNotification(message, 'error')
}

function clearAuthError() {
  const el = document.getElementById('auth-error')
  if (el) {
    el.textContent = ''
    el.classList.add('hidden')
  }
}

export function initAuthEvents() {
  const loginForm = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      clearAuthError()
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value

      let result
      try {
        result = await signIn(email, password)
      } catch (ex) {
        showAuthError(getErrorMessage(ex) || 'Login failed. Please try again.')
        return
      }

      const { data, error } = result
      if (error || !data?.user) {
        showAuthError(getErrorMessage(error) || 'Invalid login credentials')
      } else {
        showNotification('Logged in successfully')
        localStorage.setItem('userId', data.user.id)
        Router.setPath('/')
        window.location.href = Router.getUrl('/')
      }
    })
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      clearAuthError()
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value

      let result
      try {
        result = await signUp(email, password)
      } catch (ex) {
        showAuthError(getErrorMessage(ex) || 'Signup failed. Please try again.')
        return
      }

      const { data, error } = result

      // Any explicit error from signup — surface it directly.
      if (error) {
        showAuthError(getErrorMessage(error) || 'Signup failed')
        return
      }

      // Supabase returns a "fake success" for an already-registered email:
      // a user with an empty identities array and no session. Detect it so we
      // don't fall through to a login attempt and show a misleading message.
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        showAuthError('An account with this email already exists. Please log in instead.')
        return
      }

      // Signup succeeded with a session — go straight in.
      if (data?.session && data?.user) {
        showNotification('Account created! Logging in...')
        localStorage.setItem('userId', data.user.id)
        Router.setPath('/')
        window.location.href = Router.getUrl('/')
        return
      }

      // User created but no session — email confirmation is required.
      showNotification('Account created! Please check your email to confirm your address before logging in.')
      Router.setPath('/login')
      window.location.href = Router.getUrl('/login')
    })
  }
}
