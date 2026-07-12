import MapView from '../components/MapView'
import type { MapPin } from '../components/MapView'
import { useApp } from '../context/AppContext'
import { NEIGHBORHOODS } from '../data/neighborhoods'

// The pitch page for pickup services: what ScrapMap demand looks like as
// business. Reached via ?partner=1 — everything here is live data.
export default function PartnerDashboard() {
  const { pins, groups } = useApp()

  const active = groups.filter((g) => g.status === 'active')
  const forming = groups.filter((g) => g.status === 'forming')
  const totalMembers = groups.reduce((sum, g) => sum + g.members, 0)
  const monthlyRevenue = active.reduce((sum, g) => sum + g.monthlyCost, 0)
  const projectedRevenue = monthlyRevenue + forming.reduce((sum, g) => sum + g.monthlyCost, 0)

  const byHood = NEIGHBORHOODS.map((n) => ({
    name: n.name,
    pins: pins.filter((p) => p.neighborhoodId === n.id).length,
    groups: groups.filter((g) => g.neighborhoodId === n.id).length,
  }))
  const maxPins = Math.max(...byHood.map((h) => h.pins), 1)

  const mapPins: MapPin[] = [
    ...pins.map((p): MapPin => ({ id: p.id, position: p.position, kind: 'neighbor' })),
    ...groups.map(
      (g): MapPin => ({
        id: g.id,
        position: g.position,
        kind: 'group',
        label: `${g.hostLabel} · ${g.members} members · $${g.monthlyCost}/mo`,
      }),
    ),
  ]

  const stat = (label: string, value: string, accent = false) => (
    <div className="card p-4">
      <p className={`font-display text-[26px] font-extrabold tracking-tight ${accent ? 'text-forest' : 'text-gray-900'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )

  return (
    <div className="space-y-4 p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-plum">Partner view</p>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-gray-900">ScrapMap ATL — demand snapshot</h1>
        <p className="mt-1 text-sm text-gray-500">
          Households organizing themselves into shared pickup subscriptions. Every number below is live.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stat('Households asking to compost', String(pins.length + totalMembers))}
        {stat('Subscriptions running via groups', String(active.length), true)}
        {stat('Groups forming now', String(forming.length))}
        {stat('Projected monthly revenue', `$${projectedRevenue}`, true)}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900">Interest by neighborhood</h2>
        <div className="mt-3 space-y-2.5">
          {byHood.map((h) => (
            <div key={h.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-700">{h.name}</span>
                <span className="text-xs text-gray-500">
                  {h.pins} interested · {h.groups} {h.groups === 1 ? 'group' : 'groups'}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-forest"
                  style={{ width: `${Math.max((h.pins / maxPins) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900">Where the demand is</h2>
        <div className="mt-3">
          <MapView center={[33.755, -84.375]} pins={mapPins} zoom={12} heightClass="h-72" />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Green: households that asked to compost. Purple: self-organized groups (one bin, one stop, 4–6
          households each).
        </p>
      </div>

      <div className="rounded-2xl bg-mint p-4">
        <h2 className="font-semibold text-forest">The offer</h2>
        <p className="mt-1 text-sm text-gray-700">
          ScrapMap aggregates the residents your pricing can't reach — people who'd pay ~$8/mo but not $32 —
          and delivers them as pre-formed groups: one address, one bin, one bill, zero acquisition cost to
          you.
        </p>
      </div>
    </div>
  )
}
