import MapView from '../components/MapView'
import type { MapPin } from '../components/MapView'
import { useApp } from '../context/AppContext'
import { DROPOFFS } from '../data/dropoffs'

function milesBetween(a: [number, number], b: [number, number]): number {
  const R = 3958.8
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const la1 = (a[0] * Math.PI) / 180
  const la2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function Dropoffs() {
  const { neighborhood } = useApp()

  const pins: MapPin[] = DROPOFFS.map((d) => ({
    id: d.id,
    position: d.position,
    kind: 'dropoff',
    label: d.name,
  }))

  const sorted = [...DROPOFFS].sort(
    (a, b) => milesBetween(neighborhood.center, a.position) - milesBetween(neighborhood.center, b.position),
  )

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-gray-900">Drop-offs</h1>
        <p className="text-sm text-gray-500">No group yet? Drop scraps at these spots, sorted from {neighborhood.name}.</p>
      </header>

      <MapView center={neighborhood.center} pins={pins} zoom={12} heightClass="h-52" />

      <div className="space-y-3">
        {sorted.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  d.free ? 'bg-mint text-forest' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {d.free ? 'Free' : 'Paid'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {milesBetween(neighborhood.center, d.position).toFixed(1)} mi away · {d.hours}
            </p>
            <p className="mt-1.5 text-sm text-gray-600">Accepts: {d.accepts}</p>
            {d.note ? <p className="mt-1 text-xs text-amber-700">{d.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
