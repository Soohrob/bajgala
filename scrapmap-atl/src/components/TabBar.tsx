import type { ReactNode } from 'react'
import type { TabId } from '../types'
import { useApp } from '../context/AppContext'

const TABS: { id: TabId; label: string; icon: (active: boolean) => ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="h-[22px] w-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="h-[22px] w-[22px]">
        <circle cx="9" cy="8" r="3.2" />
        <path strokeLinecap="round" d="M3.5 19c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
        <circle cx="17" cy="9.5" r="2.4" />
        <path strokeLinecap="round" d="M16.5 14.6c2.2.2 3.7 1.5 4.1 3.9" />
      </svg>
    ),
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="h-[22px] w-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.5 5 8.5 4.5 5 4.5v13c3.5 0 5.5.5 7 2 1.5-1.5 3.5-2 7-2v-13c-3.5 0-5.5.5-7 2Z" />
        <path strokeLinecap="round" d="M12 6.5v13" />
      </svg>
    ),
  },
  {
    id: 'dropoffs',
    label: 'Drop-offs',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="h-[22px] w-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
]

export default function TabBar() {
  const { tab, setTab } = useApp()
  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-[900] bg-gradient-to-t from-[#f2f5ef] via-[#f2f5ef]/75 to-transparent px-4 pb-4 pt-6">
      <div className="pointer-events-auto flex rounded-[1.6rem] border border-white/70 bg-white/80 p-1.5 shadow-[0_16px_40px_-14px_rgba(15,17,32,0.4)] backdrop-blur-xl">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pressable relative flex flex-1 flex-col items-center gap-0.5 rounded-[1.15rem] py-2 text-[10.5px] font-semibold transition-all duration-300 ${
                active ? 'bg-mint text-forest-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon(active)}
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
