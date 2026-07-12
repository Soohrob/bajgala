import type { AppNotification, Group, GroupMessage, InterestPin, NeighborhoodId } from '../types'

export interface StartGroupInput {
  neighborhoodId: NeighborhoodId
  hostLabel: string
  position: [number, number]
  monthlyCost: number
  pickupDay: string
  activationTarget: number
}

export interface GroupDetails {
  venmoHandle?: string
  hostNote?: string
}

export interface AppData {
  pins: InterestPin[]
  groups: Group[]
}

// One interface, two backends: LocalAdapter (in-memory demo) and
// SupabaseAdapter (real persistence). The context never knows which it has.
export interface DataAdapter {
  mode: 'demo' | 'live'
  load(): Promise<AppData>
  /** Notifies when data changed elsewhere (realtime in live mode). Returns unsubscribe. */
  subscribe(onChange: () => void): () => void
  registerInterest(position: [number, number], neighborhoodId: NeighborhoodId): Promise<void>
  joinGroup(groupId: string): Promise<void>
  leaveGroup(groupId: string): Promise<void>
  startGroup(input: StartGroupInput): Promise<Group>
  findGroupByInvite(code: string): Promise<Group | null>
  updateGroupDetails(groupId: string, details: GroupDetails): Promise<void>
  getProfileName(): Promise<string | null>
  saveProfileName(name: string): Promise<void>
  loadNotifications(): Promise<AppNotification[]>
  markNotificationsRead(): Promise<void>
  loadMessages(groupId: string): Promise<GroupMessage[]>
  sendMessage(groupId: string, body: string): Promise<void>
}
