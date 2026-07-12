export type NeighborhoodId = 'o4w' | 'kirkwood' | 'westview'

export type Density = 'dense' | 'medium' | 'empty'

export interface Neighborhood {
  id: NeighborhoodId
  name: string
  center: [number, number]
  density: Density
  blurb: string
}

export interface Neighbor {
  id: string
  neighborhoodId: NeighborhoodId
  position: [number, number]
}

export type GroupStatus = 'forming' | 'active'

export interface Group {
  id: string
  neighborhoodId: NeighborhoodId
  hostLabel: string
  position: [number, number]
  members: number
  capacity: number
  monthlyCost: number
  pickupDay: string
  binSize: string
  status: GroupStatus
  activationTarget: number
  inviteCode: string
  isMember: boolean
  isHost: boolean
  isExample: boolean
  hostName: string | null
  memberNames: string[]
  venmoHandle: string | null
  hostNote: string | null
}

export interface AppNotification {
  id: string
  message: string
  read: boolean
  createdAt: string
}

export interface GroupMessage {
  id: string
  authorName: string
  mine: boolean
  body: string
  createdAt: string
}

export interface InterestPin {
  id: string
  neighborhoodId: NeighborhoodId
  position: [number, number]
  mine: boolean
}

export type ItemStatus = 'yes' | 'depends' | 'no'

export interface CompostItem {
  name: string
  status: ItemStatus
  reason: string
}

export interface DropoffSite {
  id: string
  name: string
  position: [number, number]
  hours: string
  accepts: string
  free: boolean
  note?: string
}

export type TabId = 'home' | 'groups' | 'learn' | 'dropoffs'
