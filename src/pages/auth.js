import { signUp, signIn, supabase, signInWithGoogleIdToken } from '../lib/supabase.js'
import { showNotification } from '../lib/utils.js'
import { Router } from '../lib/router.js'
import { renderNav } from '../components/nav.js'
import { initGoogleSignIn } from '../googleAuth.js'
import toppriumQr from '../assets/topprium-qr.png'

export async function renderLogin() {
  return `
    ${renderNav()}
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-600 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(168,85,247,0.15),_transparent_60%)]">
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <span class="text-6xl font-extrabold text-white tracking-tight">TOPPRIUM</span>
        </div>
        <div class="card !p-8">
          <h2 class="text-3xl font-extrabold text-center mb-2">Welcome back</h2>
          <p class="text-center text-slate-500 text-sm mb-8">Log in to continue learning</p>
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
          <div id="google-signin-button" class="mt-4"></div>
          <p class="text-center mt-4 text-sm text-gray-600">
            Don't have an account? <a href="/signup" class="text-blue-600 hover:underline">Sign up</a>
          </p>
        </div>
        <div class="card !p-6 mt-4">
          <h3 class="text-sm font-semibold text-center mb-3">Share Topprium with others</h3>
          <div class="flex flex-col items-center gap-3">
            <img src="${toppriumQr}" alt="QR code linking to Topprium" class="w-32 h-32 rounded-lg border border-slate-200" />
            <div class="flex w-full gap-2">
              <input id="share-link-input" type="text" readonly class="input flex-1 text-xs" />
              <button id="copy-share-link" type="button" class="btn btn-outline text-sm whitespace-nowrap">Copy link</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function renderSignup() {
  return `
    ${renderNav()}
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-600 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(168,85,247,0.15),_transparent_60%)]">
      <div class="w-full max-w-md">
        <div class="card !p-8">
          <h2 class="text-3xl font-extrabold text-center mb-2">Create your account</h2>
          <p class="text-center text-slate-500 text-sm mb-8">Free to join, start in under a minute</p>
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

function initShareWidget() {
  const linkInput = document.getElementById('share-link-input')
  const copyBtn = document.getElementById('copy-share-link')
  if (!linkInput || !copyBtn) return

  const shareUrl = 'https://psycho12e4.github.io/TOPPRIUM/'
  linkInput.value = shareUrl

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showNotification('Link copied to clipboard')
    } catch (err) {
      console.warn('Clipboard copy failed:', err)
      showAuthError('Could not copy link')
    }
  })
}

export function initAuthEvents() {
  const loginForm = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')

  initShareWidget()

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

  // Initialize Google Sign-In (GSI) on the login page if configured.
  if (loginForm) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (clientId) {
      try {
        initGoogleSignIn({
          clientId,
          btnContainerId: 'google-signin-button',
          callback: async (response) => {
            // response.credential contains the ID token (JWT)
            try {
              const res = await signInWithGoogleIdToken(response.credential)
              const { data, error } = res
              if (error || !data?.user) {
                showAuthError(getErrorMessage(error) || 'Google sign-in failed')
                return
              }
              showNotification('Logged in with Google')
              localStorage.setItem('userId', data.user.id)
              Router.setPath('/')
              window.location.href = Router.getUrl('/')
            } catch (ex) {
              console.error('Google sign-in error:', ex)
              showAuthError('Google sign-in failed. Please try again.')
            }
          },
          buttonOptions: { theme: 'outline', size: 'large' },
        })
      } catch (e) {
        // don't block normal login if GSI fails to initialize
        console.warn('GSI init failed:', e)
      }
    }
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
