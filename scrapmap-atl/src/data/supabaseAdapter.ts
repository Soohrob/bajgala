import type { AppData, DataAdapter, GroupDetails, StartGroupInput } from './adapter'
import type { AppNotification, Group, GroupMessage, GroupStatus, InterestPin, NeighborhoodId } from '../types'
import { getSupabase } from '../lib/supabase'

interface MemberRow {
  user_id: string
  profiles: { display_name: string | null } | null
}

interface GroupRow {
  id: string
  neighborhood_id: NeighborhoodId
  host_label: string
  lat: number
  lng: number
  capacity: number
  monthly_cost: number
  pickup_day: string
  bin_size: string
  status: GroupStatus
  activation_target: number
  seed_members: number
  invite_code: string
  created_by: string | null
  venmo_handle: string | null
  host_note: string | null
  creator: { display_name: string | null } | null
  group_members: MemberRow[]
}

interface PinRow {
  id: string
  user_id: string | null
  lat: number
  lng: number
  neighborhood_id: NeighborhoodId
}

// Seeded demo groups (created_by null) carry phantom members with no profiles;
// give them placeholder names so the member list isn't empty.
const EXAMPLE_NAMES = ['Maya', 'Devon', 'Priya', 'Sam', 'Alexis', 'Marcus']

function toGroup(row: GroupRow, uid: string | null): Group {
  const realNames = row.group_members.map((m) => m.profiles?.display_name || 'A neighbor')
  const seedNames = EXAMPLE_NAMES.slice(0, row.seed_members)
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    hostLabel: row.host_label,
    position: [row.lat, row.lng],
    members: row.seed_members + row.group_members.length,
    capacity: row.capacity,
    monthlyCost: Number(row.monthly_cost),
    pickupDay: row.pickup_day,
    binSize: row.bin_size,
    status: row.status,
    activationTarget: row.activation_target,
    inviteCode: row.invite_code,
    isMember: uid !== null && row.group_members.some((m) => m.user_id === uid),
    isHost: uid !== null && row.created_by === uid,
    isExample: row.created_by === null,
    hostName: row.creator?.display_name ?? (row.created_by === null ? seedNames[0] ?? null : null),
    memberNames: [...seedNames, ...realNames],
    venmoHandle: row.venmo_handle,
    hostNote: row.host_note,
  }
}

const GROUP_COLUMNS =
  'id, neighborhood_id, host_label, lat, lng, capacity, monthly_cost, pickup_day, bin_size, status, activation_target, seed_members, invite_code, created_by, venmo_handle, host_note, creator:profiles!groups_created_by_fkey(display_name), group_members(user_id, profiles(display_name))'

// Pre-migration-003 shape, so the app still works before the migration runs.
const LEGACY_GROUP_COLUMNS =
  'id, neighborhood_id, host_label, lat, lng, capacity, monthly_cost, pickup_day, bin_size, status, activation_target, seed_members, invite_code, created_by, group_members(user_id)'

function fromLegacyRow(row: Record<string, unknown>): GroupRow {
  return {
    ...(row as unknown as GroupRow),
    venmo_handle: null,
    host_note: null,
    creator: null,
    group_members: (row.group_members as { user_id: string }[]).map((m) => ({ ...m, profiles: null })),
  }
}

export class SupabaseAdapter implements DataAdapter {
  mode = 'live' as const

  private async uid(): Promise<string | null> {
    const { data } = await getSupabase().auth.getUser()
    return data.user?.id ?? null
  }

  async load(): Promise<AppData> {
    const supabase = getSupabase()
    const uid = await this.uid()

    const [pinsRes, groupsResFull] = await Promise.all([
      supabase.from('interest_pins').select('id, user_id, lat, lng, neighborhood_id'),
      supabase.from('groups').select(GROUP_COLUMNS),
    ])
    if (pinsRes.error) throw pinsRes.error
    let groupsRes: { data: unknown[] } = groupsResFull as { data: unknown[] }
    if (groupsResFull.error) {
      const legacy = await supabase.from('groups').select(LEGACY_GROUP_COLUMNS)
      if (legacy.error) throw groupsResFull.error
      groupsRes = { data: (legacy.data as Record<string, unknown>[]).map(fromLegacyRow) }
    }

    const pins: InterestPin[] = (pinsRes.data as PinRow[]).map((p) => ({
      id: p.id,
      neighborhoodId: p.neighborhood_id,
      position: [p.lat, p.lng],
      mine: uid !== null && p.user_id === uid,
    }))
    const groups: Group[] = (groupsRes.data as unknown as GroupRow[]).map((g) => toGroup(g, uid))
    return { pins, groups }
  }

  subscribe(onChange: () => void): () => void {
    const supabase = getSupabase()
    const channel = supabase
      .channel('scrapmap-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interest_pins' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, onChange)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }

  async registerInterest(position: [number, number], neighborhoodId: NeighborhoodId) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in to add your interest pin')
    const { error } = await getSupabase()
      .from('interest_pins')
      .upsert(
        { user_id: uid, lat: position[0], lng: position[1], neighborhood_id: neighborhoodId },
        { onConflict: 'user_id' },
      )
    if (error) throw error
  }

  async joinGroup(groupId: string) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in to join a group')
    const { error } = await getSupabase().from('group_members').insert({ group_id: groupId, user_id: uid })
    if (error && error.code !== '23505') throw error // 23505 = already a member
  }

  async leaveGroup(groupId: string) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in first')
    // A DB trigger deletes the group if this was its last member (and it has no seed members).
    const { error } = await getSupabase()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', uid)
    if (error) throw error
  }

  async startGroup(input: StartGroupInput): Promise<Group> {
    const supabase = getSupabase()
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in to start a group')

    const inviteCode = `${input.neighborhoodId}-${Math.random().toString(36).slice(2, 8)}`
    const { data, error } = await supabase
      .from('groups')
      .insert({
        neighborhood_id: input.neighborhoodId,
        host_label: input.hostLabel,
        lat: input.position[0],
        lng: input.position[1],
        monthly_cost: input.monthlyCost,
        pickup_day: input.pickupDay,
        activation_target: input.activationTarget,
        invite_code: inviteCode,
        created_by: uid,
      })
      .select(GROUP_COLUMNS)
      .single()
    if (error) throw error

    const row = data as unknown as GroupRow
    await this.joinGroup(row.id)
    return { ...toGroup(row, uid), members: 1, isMember: true, isHost: true }
  }

  async findGroupByInvite(code: string): Promise<Group | null> {
    const uid = await this.uid()
    const { data, error } = await getSupabase()
      .from('groups')
      .select(GROUP_COLUMNS)
      .eq('invite_code', code)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return toGroup(data as unknown as GroupRow, uid)
  }

  async updateGroupDetails(groupId: string, details: GroupDetails) {
    const patch: Record<string, string | null> = {}
    if (details.venmoHandle !== undefined) patch.venmo_handle = details.venmoHandle || null
    if (details.hostNote !== undefined) patch.host_note = details.hostNote || null
    const { error } = await getSupabase().from('groups').update(patch).eq('id', groupId)
    if (error) throw error
  }

  async getProfileName(): Promise<string | null> {
    const uid = await this.uid()
    if (!uid) return null
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('display_name')
      .eq('id', uid)
      .maybeSingle()
    if (error) throw error
    return data?.display_name ?? null
  }

  async saveProfileName(name: string) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in first')
    const { error } = await getSupabase().from('profiles').update({ display_name: name }).eq('id', uid)
    if (error) throw error
  }

  async loadNotifications(): Promise<AppNotification[]> {
    const uid = await this.uid()
    if (!uid) return []
    const { data, error } = await getSupabase()
      .from('notifications')
      .select('id, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return (data as { id: string; message: string; read: boolean; created_at: string }[]).map((n) => ({
      id: n.id,
      message: n.message,
      read: n.read,
      createdAt: n.created_at,
    }))
  }

  async markNotificationsRead() {
    const uid = await this.uid()
    if (!uid) return
    const { error } = await getSupabase().from('notifications').update({ read: true }).eq('read', false)
    if (error) throw error
  }

  async loadMessages(groupId: string): Promise<GroupMessage[]> {
    const uid = await this.uid()
    const { data, error } = await getSupabase()
      .from('group_messages')
      .select('id, user_id, body, created_at, profiles(display_name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) throw error
    return (
      data as unknown as { id: string; user_id: string; body: string; created_at: string; profiles: { display_name: string | null } | null }[]
    ).map((m) => ({
      id: m.id,
      authorName: m.profiles?.display_name || 'A neighbor',
      mine: uid !== null && m.user_id === uid,
      body: m.body,
      createdAt: m.created_at,
    }))
  }

  async sendMessage(groupId: string, body: string) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sign in first')
    const { error } = await getSupabase()
      .from('group_messages')
      .insert({ group_id: groupId, user_id: uid, body })
    if (error) throw error
  }
}
