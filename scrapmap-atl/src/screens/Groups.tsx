import { useState } from 'react'
import GroupCard from '../components/GroupCard'
import { useApp } from '../context/AppContext'
import { NEIGHBORHOODS } from '../data/neighborhoods'
import { HOST_SPOT_OPTIONS } from '../data/hostSpots'
import { milesBetween } from '../lib/geocode'
import type { NeighborhoodId } from '../types'

const NEARBY_MILES = 1.5
const PICKUP_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Groups() {
  const { neighborhood, setNeighborhoodId, pins, groups, joinGroup, leaveGroup, startGroup, referencePoint } =
    useApp()
  const [browseHood, setBrowseHood] = useState<'near' | NeighborhoodId | null>(null)
  const [hostSpotLabel, setHostSpotLabel] = useState<string>('')
  const [monthlyCost, setMonthlyCost] = useState('32')
  const [pickupDay, setPickupDay] = useState('Thursday')
  const [activationTarget, setActivationTarget] = useState(3)
  const [starting, setStarting] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  // "Near you" is the default view once the user has a location; otherwise
  // fall back to browsing the selected neighborhood.
  const mode = browseHood ?? (referencePoint ? 'near' : neighborhood.id)

  const shownGroups =
    mode === 'near' && referencePoint
      ? groups
          .map((g) => ({ g, d: milesBetween(referencePoint, g.position) }))
          .filter(({ d }) => d <= NEARBY_MILES)
          .sort((a, b) => a.d - b.d)
      : groups
          .filter((g) => g.neighborhoodId === (mode === 'near' ? neighborhood.id : mode))
          .map((g) => ({ g, d: referencePoint ? milesBetween(referencePoint, g.position) : undefined }))

  const activeHoodId = mode === 'near' ? neighborhood.id : mode
  const hoodPins = pins.filter((p) => p.neighborhoodId === activeHoodId)
  const spots = HOST_SPOT_OPTIONS[activeHoodId]

  const onStart = async () => {
    const label = hostSpotLabel.trim()
    const cost = parseFloat(monthlyCost)
    if (!label || starting || !cost || cost <= 0) return
    // The bin pin lands where the user is (block-level), or at the browsed
    // neighborhood's center if they haven't shared a location.
    const position: [number, number] = referencePoint ?? neighborhood.center
    setStarting(true)
    try {
      await startGroup({ label, position }, { monthlyCost: cost, pickupDay, activationTarget })
      setHostSpotLabel('')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-gray-900">Groups</h1>
        <p className="text-sm text-gray-500">One subscription, one bin, split the bill.</p>
      </header>

      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value as 'near' | NeighborhoodId
          setBrowseHood(v)
          if (v !== 'near') setNeighborhoodId(v)
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest"
      >
        {referencePoint ? <option value="near">Near you (within {NEARBY_MILES} mi)</option> : null}
        {NEIGHBORHOODS.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>

      {shownGroups.length > 0 ? (
        <div className="space-y-3">
          {shownGroups.map(({ g, d }) => (
            <GroupCard
              key={g.id}
              group={g}
              distanceMiles={d}
              onJoin={() => void joinGroup(g.id)}
              onLeave={() => void leaveGroup(g.id)}
            />
          ))}
        </div>
      ) : null}

      {shownGroups.length > 0 && !startOpen ? (
        <button
          onClick={() => setStartOpen(true)}
          className="w-full rounded-2xl border border-dashed border-gray-300 bg-white/60 py-3 text-sm font-medium text-gray-500 hover:border-forest hover:text-forest"
        >
          Don't see one on your block? Start your own group
        </button>
      ) : null}

      {shownGroups.length === 0 || startOpen ? (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900">
            {shownGroups.length > 0
              ? 'Start your own group'
              : mode === 'near'
                ? 'No groups within reach yet'
                : `No groups in ${neighborhood.name} yet`}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {hoodPins.length > 1
              ? `${hoodPins.length} neighbors around here already want to compost. Start a group and share the invite.`
              : 'Be the first — pick a host spot and we’ll help you recruit neighbors.'}
          </p>
          <p className="mt-3 text-xs font-medium text-gray-500">Where will the shared bin live?</p>
          <input
            value={hostSpotLabel}
            onChange={(e) => setHostSpotLabel(e.target.value)}
            maxLength={60}
            placeholder='e.g. "My driveway on Mell Ave" or "behind the blue fence"'
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {spots.map((spot) => (
              <button
                key={spot.label}
                type="button"
                onClick={() => setHostSpotLabel(spot.label)}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-mint hover:text-forest"
              >
                {spot.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {referencePoint
              ? 'The group pin goes near your location (block-level).'
              : `No location shared yet, so the pin goes to the center of ${neighborhood.name} — enter your address on Home for a precise spot.`}
          </p>
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">Service cost /mo</label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3">
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="1"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  className="w-full bg-transparent py-2.5 pl-1 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">Pickup day</label>
              <select
                value={pickupDay}
                onChange={(e) => setPickupDay(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none"
              >
                {PICKUP_DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Group activates at how many households (you included)?
            </label>
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setActivationTarget(n)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
                    activationTarget === n
                      ? 'border-forest bg-mint text-forest'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              At {activationTarget} people everyone pays about{' '}
              <span className="font-semibold text-forest">
                ${((parseFloat(monthlyCost) || 0) / activationTarget).toFixed(2)}/mo
              </span>
              . The group keeps accepting neighbors after it activates — cost drops with each join.
            </p>
            {activationTarget === 2 ? (
              <p className="mt-1 text-xs text-amber-700">
                Heads up: in a 2-person group, if one leaves the other holds the full $
                {(parseFloat(monthlyCost) || 0).toFixed(0)}/mo bill.
              </p>
            ) : null}
          </div>
          <button
            onClick={() => void onStart()}
            disabled={!hostSpotLabel || starting}
            className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {starting ? 'Creating…' : 'Start a group here'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
