import { useState } from 'react'
import type { FormEvent } from 'react'
import MapView from '../components/MapView'
import type { MapPin } from '../components/MapView'
import NotificationsSheet from '../components/NotificationsSheet'
import { useApp } from '../context/AppContext'
import { NEIGHBORHOODS } from '../data/neighborhoods'
import { DROPOFFS } from '../data/dropoffs'
import { milesBetween } from '../lib/geocode'
import type { NeighborhoodId } from '../types'

const NEAR_PIN_MILES = 1
const NEAR_GROUP_MILES = 1.5

export default function Home() {
  const {
    mode,
    user,
    openSignIn,
    signOut,
    neighborhood,
    setNeighborhoodId,
    pins,
    groups,
    myPin,
    setTab,
    youLocation,
    referencePoint,
    locate,
    registerInterest,
    unreadCount,
    profileName,
  } = useApp()
  const [address, setAddress] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)

  // Radius-first: once we know where you are, "near you" means real distance.
  // The neighborhood dropdown remains as a browse tool.
  const nearPins = referencePoint
    ? pins.filter((p) => milesBetween(referencePoint, p.position) <= NEAR_PIN_MILES)
    : pins.filter((p) => p.neighborhoodId === neighborhood.id)
  const nearGroups = referencePoint
    ? groups.filter((g) => milesBetween(referencePoint, g.position) <= NEAR_GROUP_MILES)
    : groups.filter((g) => g.neighborhoodId === neighborhood.id)

  const mapPins: MapPin[] = [
    ...pins.map(
      (p): MapPin => ({
        id: p.id,
        position: p.position,
        kind: 'neighbor',
        label: p.mine ? 'Your interest pin (block-level, not your address)' : 'A neighbor here wants to compost',
      }),
    ),
    ...groups.map(
      (g): MapPin => ({
        id: g.id,
        position: g.position,
        kind: 'group',
        label: `${g.hostLabel} · ${g.members}/${g.capacity} members${g.status === 'forming' ? ' · forming' : ''}`,
      }),
    ),
    ...DROPOFFS.map((d): MapPin => ({ id: d.id, position: d.position, kind: 'dropoff', label: d.name })),
  ]
  if (youLocation) {
    mapPins.push({ id: 'you', position: youLocation.position, kind: 'you', label: 'You (approximate)' })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!address.trim() || searching) return
    setSearching(true)
    setSearchError(null)
    try {
      const result = await locate(address.trim())
      if (!result) setSearchError("Couldn't find that address — try adding a ZIP code.")
    } catch {
      setSearchError('Address lookup failed — check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  const mapCenter = referencePoint ?? neighborhood.center
  const joinable = nearGroups.some((g) => !g.isMember && g.members < g.capacity)
  const statusLine = referencePoint
    ? nearPins.length > 0
      ? `${nearPins.length} ${nearPins.length === 1 ? 'neighbor' : 'neighbors'} within a mile of you ${nearPins.length === 1 ? 'wants' : 'want'} to compost`
      : 'No interest within a mile of you yet'
    : nearPins.length > 0
      ? `${nearPins.length} ${nearPins.length === 1 ? 'neighbor' : 'neighbors'} in ${neighborhood.name} ${nearPins.length === 1 ? 'wants' : 'want'} to compost`
      : 'No interest logged in this area yet'

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="gradient-title font-display text-[24px] font-extrabold tracking-tight">ScrapMap ATL</h1>
          <p className="text-sm text-gray-500">Compost for a few dollars a month, with your neighbors.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {mode === 'live' && user ? (
            <button
              onClick={() => setNotifOpen(true)}
              className="pressable relative rounded-full border border-white/70 bg-white/80 p-2 text-gray-600 shadow-sm backdrop-blur"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17H9m6 0h4l-1.4-2.3a2 2 0 0 1-.3-1V10a5.3 5.3 0 0 0-10.6 0v3.7a2 2 0 0 1-.3 1L5 17h4m6 0a3 3 0 1 1-6 0"
                />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-plum px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {mode === 'live' ? (
            user ? (
              <button onClick={() => void signOut()} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                {profileName ? `${profileName} · Sign out` : 'Sign out'}
              </button>
            ) : (
              <button onClick={openSignIn} className="rounded-full btn-primary px-3 py-1.5 text-xs">
                Sign in
              </button>
            )
          ) : null}
        </div>
      </header>

      {mode === 'demo' ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo mode — nothing saves. Add Supabase keys to .env.local to go live (see README).
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-xl btn-primary px-4 py-2.5 text-sm disabled:bg-gray-300"
        >
          {searching ? '…' : 'Find'}
        </button>
      </form>
      {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}

      {youLocation ? (
        <div className="card p-3">
          <p className="text-sm text-gray-700">
            Found: <span className="font-medium">{youLocation.label}</span>
          </p>
          {myPin ? (
            <p className="mt-1.5 text-sm font-medium text-forest">Your interest pin is on the map.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-gray-500">
                We only save your block, never your exact address.
              </p>
              <button
                onClick={() => void registerInterest()}
                className="mt-2 w-full rounded-xl btn-primary py-2.5 text-sm"
              >
                Put my interest on the map
              </button>
            </>
          )}
        </div>
      ) : null}

      {!referencePoint ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Browse a neighborhood</label>
          <select
            value={neighborhood.id}
            onChange={(e) => setNeighborhoodId(e.target.value as NeighborhoodId)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest"
          >
            {NEIGHBORHOODS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <MapView center={mapCenter} pins={mapPins} zoom={15} heightClass="h-64" />

      <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-gray-600">
        <span className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-forest" /> Interested neighbor
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-plum" /> Group
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-amber-600" /> Drop-off
        </span>
      </div>

      <div className="card p-4">
        <p className="font-semibold text-gray-900">{statusLine}</p>
        <p className="mt-1 text-sm text-gray-500">
          {referencePoint
            ? joinable
              ? 'There’s a group with open spots near you.'
              : 'Put your pin down and rally your block — 4 households is all it takes.'
            : neighborhood.blurb}
        </p>
        <button
          onClick={() => setTab('groups')}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white ${
            joinable ? 'btn-plum' : 'btn-primary'
          }`}
        >
          {joinable
            ? 'Join a group near you'
            : nearPins.length >= 3
              ? 'Start a group with interested neighbors'
              : 'Start interest in your area'}
        </button>
      </div>

      {notifOpen ? <NotificationsSheet onClose={() => setNotifOpen(false)} /> : null}
    </div>
  )
}
