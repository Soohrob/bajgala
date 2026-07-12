import type { DropoffSite } from '../types'

export const DROPOFFS: DropoffSite[] = [
  {
    id: 'd1',
    name: 'CHaRM (Center for Hard to Recycle Materials)',
    position: [33.729, -84.3697],
    hours: 'Tue–Sat, 9am–4pm',
    accepts: 'All food scraps including meat and dairy',
    free: false,
    note: 'Suggested $5 donation per visit',
  },
  {
    id: 'd2',
    name: 'Freedom Park Community Garden',
    position: [33.7686, -84.3536],
    hours: 'Daylight hours, daily',
    accepts: 'Fruit and veg scraps, coffee grounds, eggshells',
    free: true,
  },
  {
    id: 'd3',
    name: 'Wylde Center Compost Club (Oakhurst)',
    position: [33.7666, -84.2951],
    hours: 'Mon–Sat, 10am–5pm',
    accepts: 'All plant-based scraps, no meat or dairy',
    free: false,
    note: '$5/month club membership',
  },
  {
    id: 'd4',
    name: 'City of Atlanta food scrap drop-off (pilot)',
    position: [33.7488, -84.3877],
    hours: 'Sat, 9am–1pm',
    accepts: 'Fruit, veg, grains, coffee, eggshells',
    free: true,
  },
  {
    id: 'd5',
    name: 'Grant Park Farmers Market compost stand',
    position: [33.7401, -84.3699],
    hours: 'Sun, 9am–1pm (market days)',
    accepts: 'Plant-based kitchen scraps',
    free: true,
  },
]
