import { NEIGHBORHOODS } from '../data/neighborhoods'
import type { NeighborhoodId } from '../types'

export interface GeocodeResult {
  position: [number, number]
  label: string
  neighborhoodId: NeighborhoodId
}

// Bias results toward metro Atlanta (lng1,lat1,lng2,lat2).
const ATLANTA_VIEWBOX = '-84.62,33.55,-84.15,33.95'

export function milesBetween(a: [number, number], b: [number, number]): number {
  const R = 3958.8
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const la1 = (a[0] * Math.PI) / 180
  const la2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearestNeighborhood(position: [number, number]): NeighborhoodId {
  let best = NEIGHBORHOODS[0]
  let bestDist = Infinity
  for (const n of NEIGHBORHOODS) {
    const d = milesBetween(position, n.center)
    if (d < bestDist) {
      bestDist = d
      best = n
    }
  }
  return best.id
}

// Privacy: round to ~0.001° (≈ one city block) so exact addresses are never
// stored or displayed. This runs BEFORE anything is saved.
export function snapToBlock(position: [number, number]): [number, number] {
  return [Math.round(position[0] * 1000) / 1000, Math.round(position[1] * 1000) / 1000]
}

// Free OpenStreetMap geocoding (Nominatim) — no API key. Fine for pilot
// volume (~1 req/sec limit); swap in Mapbox for production scale.
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'us',
    viewbox: ATLANTA_VIEWBOX,
    bounded: '0',
    q: query,
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
  const results = (await res.json()) as { lat: string; lon: string; display_name: string }[]
  if (!results.length) return null
  const position = snapToBlock([parseFloat(results[0].lat), parseFloat(results[0].lon)])
  return {
    position,
    label: results[0].display_name.split(',').slice(0, 3).join(','),
    neighborhoodId: nearestNeighborhood(position),
  }
}
