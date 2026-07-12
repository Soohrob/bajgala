import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Group, GroupMessage } from '../types'
import { useApp } from '../context/AppContext'

// The group's shared fridge note: one message list, members only. Not a chat —
// persistent facts and heads-ups that new members need to see too.
export default function GroupBoard({ group }: { group: Group }) {
  const { loadMessages, sendMessage, dataVersion } = useApp()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<GroupMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadMessages(group.id)
      .then((ms) => {
        if (!cancelled) setMessages(ms)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
    return () => {
      cancelled = true
    }
  }, [open, dataVersion, group.id, loadMessages])

  const post = async (e: FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await sendMessage(group.id, body)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 hover:border-plum hover:text-plum"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 6V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 3Z" />
        </svg>
        Open group board
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">Group board</p>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
        {messages === null ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400">
            Nothing here yet. Post bin logistics, payment notes, heads-ups — new members see it all.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`rounded-lg p-2 ${m.mine ? 'bg-mint' : 'bg-white'}`}>
              <p className="text-xs font-semibold text-gray-700">
                {m.mine ? 'You' : m.authorName}
                <span className="ml-1.5 font-normal text-gray-400">
                  {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-gray-800">{m.body}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={post} className="mt-2 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Post to your group…"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-plum"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 rounded-lg bg-plum px-3 py-2 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          Post
        </button>
      </form>
    </div>
  )
}
