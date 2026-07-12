import type { AppData, DataAdapter, GroupDetails, StartGroupInput } from './adapter'
import type { AppNotification, Group, GroupMessage, InterestPin } from '../types'
import { GROUPS } from './groups'
import { NEIGHBORS } from './neighbors'

const DEMO_MESSAGES: Record<string, GroupMessage[]> = {
  g1: [
    {
      id: 'm1',
      authorName: 'Maya',
      mine: false,
      body: 'Bin goes out tonight — remember Thursday is pickup. New folks: latch, no code.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'm2',
      authorName: 'Devon',
      mine: false,
      body: 'Venmo sent for July. Also the freezer-bag trick is life-changing, thanks Maya.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  g2: [
    {
      id: 'm3',
      authorName: 'Jordan',
      mine: false,
      body: "Heads up: I'm out of town next week — Sam will roll the bin out Monday.",
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    },
  ],
}

// In-memory backend used when Supabase env vars are absent. Same behavior,
// nothing persists across refresh.
export class LocalAdapter implements DataAdapter {
  mode = 'demo' as const
  private pins: InterestPin[] = NEIGHBORS.map((n) => ({
    id: n.id,
    neighborhoodId: n.neighborhoodId,
    position: n.position,
    mine: false,
  }))
  private groups: Group[] = GROUPS.map((g) => ({ ...g }))
  private messages: Record<string, GroupMessage[]> = { ...DEMO_MESSAGES }
  private notifications: AppNotification[] = []
  private profileName: string | null = 'You'
  private listeners = new Set<() => void>()

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  async load(): Promise<AppData> {
    return { pins: this.pins.map((p) => ({ ...p })), groups: this.groups.map((g) => ({ ...g })) }
  }

  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange)
    return () => this.listeners.delete(onChange)
  }

  async registerInterest(position: [number, number], neighborhoodId: InterestPin['neighborhoodId']) {
    this.pins = this.pins.filter((p) => !p.mine)
    this.pins.push({ id: 'me', neighborhoodId, position, mine: true })
    this.notify()
  }

  async joinGroup(groupId: string) {
    this.groups = this.groups.map((g) => {
      if (g.id !== groupId || g.isMember || g.members >= g.capacity) return g
      const members = g.members + 1
      const status = g.status === 'forming' && members >= g.activationTarget ? 'active' : g.status
      return {
        ...g,
        members,
        status,
        isMember: true,
        memberNames: [...g.memberNames, this.profileName ?? 'You'],
      }
    })
    this.notify()
  }

  async leaveGroup(groupId: string) {
    this.groups = this.groups
      .map((g) =>
        g.id === groupId && g.isMember
          ? {
              ...g,
              members: g.members - 1,
              isMember: false,
              isHost: false,
              memberNames: g.memberNames.slice(0, -1),
            }
          : g,
      )
      .filter((g) => g.members > 0)
    this.notify()
  }

  async startGroup(input: StartGroupInput): Promise<Group> {
    const name = this.profileName ?? 'You'
    const group: Group = {
      id: `local-${Date.now()}`,
      neighborhoodId: input.neighborhoodId,
      hostLabel: input.hostLabel,
      position: input.position,
      members: 1,
      capacity: 6,
      monthlyCost: input.monthlyCost,
      pickupDay: input.pickupDay,
      binSize: '12-gallon bin',
      status: input.activationTarget <= 1 ? 'active' : 'forming',
      activationTarget: input.activationTarget,
      inviteCode: `${input.neighborhoodId}-${Math.random().toString(36).slice(2, 7)}`,
      isMember: true,
      isHost: true,
      isExample: false,
      hostName: name,
      memberNames: [name],
      venmoHandle: null,
      hostNote: null,
    }
    this.groups = [...this.groups, group]
    this.notify()
    return group
  }

  async findGroupByInvite(code: string): Promise<Group | null> {
    return this.groups.find((g) => g.inviteCode === code) ?? null
  }

  async updateGroupDetails(groupId: string, details: GroupDetails) {
    this.groups = this.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            venmoHandle: details.venmoHandle !== undefined ? details.venmoHandle || null : g.venmoHandle,
            hostNote: details.hostNote !== undefined ? details.hostNote || null : g.hostNote,
          }
        : g,
    )
    this.notify()
  }

  async getProfileName() {
    return this.profileName
  }

  async saveProfileName(name: string) {
    this.profileName = name
  }

  async loadNotifications() {
    return this.notifications.map((n) => ({ ...n }))
  }

  async markNotificationsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }))
  }

  async loadMessages(groupId: string): Promise<GroupMessage[]> {
    return (this.messages[groupId] ?? []).map((m) => ({ ...m }))
  }

  async sendMessage(groupId: string, body: string) {
    const list = this.messages[groupId] ?? []
    this.messages[groupId] = [
      ...list,
      {
        id: `m-${Date.now()}`,
        authorName: this.profileName ?? 'You',
        mine: true,
        body,
        createdAt: new Date().toISOString(),
      },
    ]
    this.notify()
  }
}
