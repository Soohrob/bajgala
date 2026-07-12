import type { NeighborhoodId } from '../types'

export interface HostSpot {
  label: string
  position: [number, number]
}

export const HOST_SPOT_OPTIONS: Record<NeighborhoodId, HostSpot[]> = {
  o4w: [
    { label: 'Freedom Park east corner', position: [33.7686, -84.3593] },
    { label: 'North Ave & Boulevard', position: [33.7712, -84.3665] },
    { label: 'Historic Fourth Ward Park shed', position: [33.7645, -84.3673] },
  ],
  kirkwood: [
    { label: 'Bessie Branham Park entrance', position: [33.7551, -84.3172] },
    { label: 'Kirkwood Ave & Oakview Rd corner', position: [33.7509, -84.3157] },
    { label: 'Coan Park community shed', position: [33.7568, -84.3269] },
  ],
  westview: [
    { label: 'Westview Community Garden gate', position: [33.7375, -84.4381] },
    { label: 'Ralph David Abernathy & Lawton St', position: [33.7405, -84.4331] },
    { label: 'Westview Ave pocket park', position: [33.7358, -84.4425] },
  ],
}
