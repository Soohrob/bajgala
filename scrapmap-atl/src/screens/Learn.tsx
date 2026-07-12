import { useState } from 'react'
import { COMPOST_ITEMS } from '../data/compostItems'
import type { ItemStatus } from '../types'

const STATUS_STYLE: Record<ItemStatus, { badge: string; label: string }> = {
  yes: { badge: 'bg-mint text-forest', label: 'Yes, compost it' },
  depends: { badge: 'bg-amber-100 text-amber-800', label: 'Depends on your service' },
  no: { badge: 'bg-red-100 text-red-700', label: 'No, keep it out' },
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Will it smell?',
    a: 'Not if you keep scraps in a bag or container in your freezer and empty it into the shared bin once or twice a week. Frozen scraps have no smell, and the pickup bins seal tight.',
  },
  {
    q: 'Is it gross?',
    a: 'It’s about as gross as taking out the trash, and faster. Your whole routine is scraping a cutting board into a container — maybe 30 seconds a day.',
  },
  {
    q: 'How much effort is it?',
    a: 'Almost none with a shared pickup: you drop your bag in the group bin whenever it suits you, and the service handles the rest. No turning piles, no ratios, no science.',
  },
  {
    q: 'What do I need to start?',
    a: 'A container with a lid (an old yogurt tub works), space in your freezer, and a group nearby. That’s genuinely it — no special equipment.',
  },
]

export default function Learn() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<number | null>(0)

  const q = query.trim().toLowerCase()
  const matches = q ? COMPOST_ITEMS.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 4) : []

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-gray-900">Learn</h1>
        <p className="text-sm text-gray-500">The two-minute guide to not overthinking compost.</p>
      </header>

      <a
        href={`${import.meta.env.BASE_URL}guide.pdf`}
        download="ScrapMap-ATL-Guide.pdf"
        className="pressable flex items-center gap-2.5 rounded-2xl border border-forest/10 bg-mint p-3.5 text-sm font-medium text-forest shadow-[0_8px_24px_-12px_rgba(15,110,86,0.4)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-5 w-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        Download the starter guide (2-page PDF) — great for sharing with neighbors
      </a>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900">Can I compost this?</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type an item — coffee grounds, pizza box, meat…"
          className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        {q && matches.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            We don’t know that one yet. When in doubt, leave it out — or ask your pickup service.
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {matches.map((item) => (
            <div key={item.name} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[item.status].badge}`}>
                  {STATUS_STYLE[item.status].label}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{item.reason}</p>
            </div>
          ))}
        </div>
        {!q ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Coffee grounds', 'Meat', 'Pizza box', 'Plastic bags', 'Eggshells'].map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-mint hover:text-forest"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900">The honest FAQ</h2>
        <div className="mt-2 divide-y divide-gray-100">
          {FAQ.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-gray-900"
              >
                {f.q}
                <span className="text-gray-400">{open === i ? '−' : '+'}</span>
              </button>
              {open === i ? <p className="pb-3 text-sm text-gray-600">{f.a}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <p className="pb-2 text-center">
        <a href="?partner=1" className="text-xs text-gray-400 underline">
          For composting services: see the partner view
        </a>
      </p>
    </div>
  )
}
