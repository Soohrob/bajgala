import { useState } from 'react'

const CARDS = [
  {
    title: 'Neighbors share one bin',
    body: 'Compost pickup costs ~$32/month alone — too much for most people. A few households on the same block share one subscription and one bin instead.',
    icon: '🗑️',
  },
  {
    title: 'Split the cost',
    body: 'Four neighbors means about $8 each per month. The map shows who near you wants in, and every join lowers everyone’s share.',
    icon: '➗',
  },
  {
    title: 'Easier than you think',
    body: 'Keep scraps in a container in your freezer — no smell, no mess. Drop the bag in the shared bin whenever. The Learn tab covers the rest.',
    icon: '❄️',
  },
]

const LS_KEY = 'scrapmap_onboarded'

export default function OnboardingOverlay() {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === '1'
    } catch {
      return true
    }
  })
  const [step, setStep] = useState(0)

  if (seen) return null

  const done = () => {
    try {
      localStorage.setItem(LS_KEY, '1')
    } catch {
      // private-mode storage failure — just dismiss for this session
    }
    setSeen(true)
  }

  const card = CARDS[step]
  const last = step === CARDS.length - 1

  return (
    <div className="sheet-backdrop absolute inset-0 z-[1200] flex items-center justify-center bg-black/50 p-6 backdrop-blur-[2px]">
      <div key={step} className="anim-pop w-full rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="text-4xl">{card.icon}</div>
        <h2 className="mt-3 text-lg font-bold text-gray-900">{card.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.body}</p>
        <div className="mt-4 flex justify-center gap-1.5">
          {CARDS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-forest' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
        <button
          onClick={() => (last ? done() : setStep(step + 1))}
          className="mt-4 w-full rounded-xl btn-primary py-2.5 text-sm"
        >
          {last ? 'Show me the map' : 'Next'}
        </button>
        {!last ? (
          <button onClick={done} className="mt-2 w-full py-1 text-xs font-medium text-gray-400">
            Skip
          </button>
        ) : null}
      </div>
    </div>
  )
}
