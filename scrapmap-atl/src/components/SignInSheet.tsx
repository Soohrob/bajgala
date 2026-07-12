import { useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '../context/AppContext'

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/rate limit/i.test(msg))
    return 'Too many sign-in emails in the last hour — wait a bit and try again. (Free email quota; a custom sender lifts this.)'
  if (/invalid|expired/i.test(msg)) return 'That code is wrong or expired — check the email or resend.'
  if (/valid email/i.test(msg)) return 'That doesn’t look like a valid email address.'
  return `Could not complete sign-in: ${msg}`
}

export default function SignInSheet() {
  const { signInOpen, closeSignIn, sendMagicLink, verifyCode } = useApp()
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!signInOpen) return null

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await sendMagicLink(email.trim())
      setStage('code')
      setCode('')
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    const token = code.replace(/\D/g, '')
    if (token.length < 6 || busy) return
    setBusy(true)
    setError(null)
    try {
      await verifyCode(email.trim(), token)
      // Success: auth listener closes the sheet and resumes any queued action.
      setStage('email')
      setCode('')
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop absolute inset-0 z-[1000] flex items-end bg-black/45" onClick={closeSignIn}>
      <div className="sheet-panel w-full rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        {stage === 'email' ? (
          <form onSubmit={sendCode}>
            <h2 className="text-lg font-bold text-gray-900">Sign in to ScrapMap</h2>
            <p className="mt-1 text-sm text-gray-500">
              We'll email you a 6-digit code. Type it here — no password, no link-clicking.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoFocus
              className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm disabled:bg-gray-200 disabled:text-gray-400"
            >
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode}>
            <h2 className="text-lg font-bold text-gray-900">Enter your code</h2>
            <p className="mt-1 text-sm text-gray-500">
              We sent a 6-digit code to <span className="font-medium">{email}</span>. The email's link
              works too, but the code is faster.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
              className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-forest"
            />
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm disabled:bg-gray-200 disabled:text-gray-400"
            >
              {busy ? 'Checking…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage('email')
                setError(null)
              }}
              className="mt-2 w-full py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
            >
              Different email / resend
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
