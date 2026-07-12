import { useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '../context/AppContext'

// Shown once after first sign-in: neighbors need a first name to trust a group.
export default function NamePromptSheet() {
  const { needsName, saveName } = useApp()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  if (!needsName) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await saveName(name.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop absolute inset-0 z-[1000] flex items-end bg-black/45">
      <form onSubmit={onSubmit} className="sheet-panel w-full rounded-t-3xl bg-white p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <h2 className="text-lg font-bold text-gray-900">What should neighbors call you?</h2>
        <p className="mt-1 text-sm text-gray-500">
          First name is enough. It shows on groups you join, so neighbors know who they're sharing a bin
          with.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          autoFocus
          maxLength={30}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm disabled:bg-gray-200 disabled:text-gray-400"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
