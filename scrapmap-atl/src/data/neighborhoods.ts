import type { Neighborhood } from '../types'

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'o4w',
    name: 'Old Fourth Ward',
    center: [33.7665, -84.3717],
    density: 'dense',
    blurb: 'Lots of interest here — two active groups and open spots.',
  },
  {
    id: 'kirkwood',
    name: 'Kirkwood',
    center: [33.7527, -84.316],
    density: 'medium',
    blurb: 'Neighbors are interested but no group has formed yet.',
  },
  {
    id: 'westview',
    name: 'Westview',
    center: [33.7369, -84.44],
    density: 'empty',
    blurb: 'Quiet so far — be the first to raise your hand.',
  },
]
