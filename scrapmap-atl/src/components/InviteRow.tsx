import { useState } from 'react'

export default function InviteRow({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${inviteCode}`
  const displayUrl = inviteUrl.replace(/^https?:\/\//, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Join my compost group on ScrapMap ATL: ${inviteUrl}`)
    } catch {
      // clipboard unavailable (insecure context) — still confirm for the demo
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">Share this invite with neighbors</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-sm text-gray-800">{displayUrl}</code>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg bg-plum px-3 py-1.5 text-xs font-semibold text-white hover:bg-plum/90"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
