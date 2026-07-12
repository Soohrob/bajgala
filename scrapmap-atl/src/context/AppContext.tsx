import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppNotification, Group, GroupMessage, InterestPin, Neighborhood, NeighborhoodId, TabId } from '../types'
import type { DataAdapter } from '../data/adapter'
import { LocalAdapter } from '../data/localAdapter'
import { SupabaseAdapter } from '../data/supabaseAdapter'
import { NEIGHBORHOODS } from '../data/neighborhoods'
import type { HostSpot } from '../data/hostSpots'
import { geocodeAddress } from '../lib/geocode'
import type { GeocodeResult } from '../lib/geocode'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface AppUser {
  id: string
  email: string
}

interface AppContextValue {
  mode: 'demo' | 'live'
  tab: TabId
  setTab: (tab: TabId) => void
  neighborhood: Neighborhood
  setNeighborhoodId: (id: NeighborhoodId) => void
  loading: boolean
  pins: InterestPin[]
  groups: Group[]
  myPin: InterestPin | undefined
  user: AppUser | null
  signInOpen: boolean
  openSignIn: () => void
  closeSignIn: () => void
  sendMagicLink: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  notice: string | null
  showNotice: (msg: string) => void
  youLocation: GeocodeResult | null
  /** Where "near you" is measured from: fresh geocode, else your saved pin. */
  referencePoint: [number, number] | null
  locate: (address: string) => Promise<GeocodeResult | null>
  registerInterest: () => Promise<void>
  joinGroup: (id: string) => Promise<void>
  leaveGroup: (id: string) => Promise<void>
  startGroup: (
    spot: HostSpot,
    options: { monthlyCost: number; pickupDay: string; activationTarget: number },
  ) => Promise<void>
  updateGroupDetails: (id: string, details: { venmoHandle?: string; hostNote?: string }) => Promise<void>
  profileName: string | null
  needsName: boolean
  saveName: (name: string) => Promise<void>
  notifications: AppNotification[]
  unreadCount: number
  markNotificationsRead: () => Promise<void>
  loadMessages: (groupId: string) => Promise<GroupMessage[]>
  sendMessage: (groupId: string, body: string) => Promise<void>
  /** Bumps on every data refresh so open views (e.g. the group board) can re-pull. */
  dataVersion: number
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const adapterRef = useRef<DataAdapter | null>(null)
  if (!adapterRef.current) {
    adapterRef.current = isSupabaseConfigured ? new SupabaseAdapter() : new LocalAdapter()
  }
  const adapter = adapterRef.current

  const [tab, setTab] = useState<TabId>('home')
  const [neighborhoodId, setNeighborhoodId] = useState<NeighborhoodId>('o4w')
  const [loading, setLoading] = useState(true)
  const [pins, setPins] = useState<InterestPin[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [user, setUser] = useState<AppUser | null>(
    adapter.mode === 'demo' ? { id: 'demo', email: 'demo@scrapmap.local' } : null,
  )
  const [signInOpen, setSignInOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [youLocation, setYouLocation] = useState<GeocodeResult | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  const noticeTimer = useRef<number | undefined>(undefined)
  // Action deferred until the user finishes signing in (e.g. clicked Join while signed out).
  const pendingAction = useRef<(() => Promise<void>) | null>(null)

  const neighborhood = NEIGHBORHOODS.find((n) => n.id === neighborhoodId) ?? NEIGHBORHOODS[0]

  const showNotice = useCallback((msg: string) => {
    setNotice(msg)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000)
  }, [])

  const refresh = useCallback(async () => {
    const data = await adapter.load()
    setPins(data.pins)
    setGroups(data.groups)
    try {
      setNotifications(await adapter.loadNotifications())
    } catch {
      // notifications table may not exist yet (migration pending) — non-fatal
    }
    setDataVersion((v) => v + 1)
  }, [adapter])

  const loadProfile = useCallback(async () => {
    try {
      setProfileName(await adapter.getProfileName())
    } catch {
      // display_name column may not exist yet (migration pending) — non-fatal
    }
    setProfileLoaded(true)
  }, [adapter])

  const runOrQueueAuth = useCallback(
    async (action: () => Promise<void>) => {
      if (adapter.mode === 'live' && !user) {
        pendingAction.current = action
        setSignInOpen(true)
        showNotice('Sign in with your email to continue.')
        return
      }
      await action()
    },
    [adapter, user, showNotice],
  )

  const joinGroup = useCallback(
    async (id: string) => {
      await runOrQueueAuth(async () => {
        const group = groups.find((g) => g.id === id)
        await adapter.joinGroup(id)
        await refresh()
        if (group) {
          const newCost = (group.monthlyCost / Math.min(group.members + 1, group.capacity)).toFixed(2)
          showNotice(
            group.status === 'forming'
              ? `You joined the forming group at ${group.hostLabel}.`
              : `You joined ${group.hostLabel}. Everyone now pays $${newCost}/mo.`,
          )
        }
      })
    },
    [adapter, groups, refresh, runOrQueueAuth, showNotice],
  )

  const leaveGroup = useCallback(
    async (id: string) => {
      const group = groups.find((g) => g.id === id)
      try {
        await adapter.leaveGroup(id)
        await refresh()
        if (group) {
          const remaining = group.members - 1
          showNotice(
            remaining > 0
              ? `You left ${group.hostLabel}. Remaining members now pay $${(group.monthlyCost / remaining).toFixed(2)}/mo.`
              : `You left — the empty group at ${group.hostLabel} was removed.`,
          )
        }
      } catch (err) {
        console.error(err)
        showNotice('Could not leave the group — try again.')
      }
    },
    [adapter, groups, refresh, showNotice],
  )

  // Initial load + realtime subscription + invite-link handling (?join=CODE).
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      try {
        await refresh()
        if (adapter.mode === 'demo') await loadProfile()
      } catch (err) {
        console.error(err)
        showNotice('Could not load data — check your connection.')
      }
      if (cancelled) return
      setLoading(false)

      const code = new URLSearchParams(window.location.search).get('join')
      if (code) {
        window.history.replaceState(null, '', window.location.pathname)
        try {
          const group = await adapter.findGroupByInvite(code)
          if (!group) {
            showNotice('That invite link is no longer valid.')
            return
          }
          setNeighborhoodId(group.neighborhoodId)
          setTab('groups')
          if (adapter.mode === 'live' && !user) {
            pendingAction.current = async () => {
              await adapter.joinGroup(group.id)
              await refresh()
              showNotice(`Invite accepted — you're in the ${group.hostLabel} group.`)
            }
            setSignInOpen(true)
            showNotice(`You've been invited to the ${group.hostLabel} group. Sign in to join.`)
          } else if (!group.isMember) {
            await adapter.joinGroup(group.id)
            await refresh()
            showNotice(`Invite accepted — you're in the ${group.hostLabel} group.`)
          }
        } catch (err) {
          console.error(err)
          showNotice('Could not process that invite link.')
        }
      }
    }
    void boot()
    const unsubscribe = adapter.subscribe(() => void refresh())
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auth state (live mode only).
  useEffect(() => {
    if (adapter.mode !== 'live') return
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u) setUser({ id: u.id, email: u.email ?? '' })
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (u) {
        setSignInOpen(false)
        await refresh() // re-derive isMember/mine flags for this user
        await loadProfile()
        const action = pendingAction.current
        pendingAction.current = null
        if (action) {
          try {
            await action()
          } catch (err) {
            console.error(err)
            showNotice('Something went wrong — try again.')
          }
        }
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [adapter, refresh, loadProfile, showNotice])

  const locate = useCallback(
    async (address: string) => {
      const result = await geocodeAddress(address)
      if (result) {
        setYouLocation(result)
        setNeighborhoodId(result.neighborhoodId)
      }
      return result
    },
    [],
  )

  const registerInterest = useCallback(async () => {
    const loc = youLocation
    if (!loc) return
    await runOrQueueAuth(async () => {
      await adapter.registerInterest(loc.position, loc.neighborhoodId)
      await refresh()
      showNotice("You're on the map — neighbors will now see interest here.")
    })
  }, [adapter, youLocation, refresh, runOrQueueAuth, showNotice])

  const startGroup = useCallback(
    async (spot: HostSpot, options: { monthlyCost: number; pickupDay: string; activationTarget: number }) => {
      await runOrQueueAuth(async () => {
        await adapter.startGroup({
          neighborhoodId: neighborhood.id,
          hostLabel: spot.label,
          position: spot.position,
          monthlyCost: options.monthlyCost,
          pickupDay: options.pickupDay,
          activationTarget: options.activationTarget,
        })
        await refresh()
        showNotice('Group created — share your invite link to fill it.')
      })
    },
    [adapter, neighborhood.id, refresh, runOrQueueAuth, showNotice],
  )

  const updateGroupDetails = useCallback(
    async (id: string, details: { venmoHandle?: string; hostNote?: string }) => {
      try {
        await adapter.updateGroupDetails(id, details)
        await refresh()
        showNotice('Group details saved.')
      } catch (err) {
        console.error(err)
        showNotice('Could not save — try again.')
      }
    },
    [adapter, refresh, showNotice],
  )

  const saveName = useCallback(
    async (name: string) => {
      await adapter.saveProfileName(name)
      setProfileName(name)
      await refresh()
    },
    [adapter, refresh],
  )

  const loadMessages = useCallback((groupId: string) => adapter.loadMessages(groupId), [adapter])

  const sendMessage = useCallback(
    async (groupId: string, body: string) => {
      await adapter.sendMessage(groupId, body)
      await refresh()
    },
    [adapter, refresh],
  )

  const markNotificationsRead = useCallback(async () => {
    try {
      await adapter.markNotificationsRead()
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error(err)
    }
  }, [adapter])

  const sendMagicLink = useCallback(async (email: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw error
  }, [])

  const verifyCode = useCallback(async (email: string, code: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) throw error
    // onAuthStateChange takes over: closes the sheet, reloads data, runs any queued action.
  }, [])

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut()
    await refresh()
    showNotice('Signed out.')
  }, [refresh, showNotice])

  const myPin = pins.find((p) => p.mine)
  const referencePoint = youLocation?.position ?? myPin?.position ?? null
  const needsName = adapter.mode === 'live' && user !== null && profileLoaded && !profileName
  const unreadCount = notifications.filter((n) => !n.read).length

  const value = useMemo<AppContextValue>(
    () => ({
      mode: adapter.mode,
      tab,
      setTab,
      neighborhood,
      setNeighborhoodId,
      loading,
      pins,
      groups,
      myPin,
      user,
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
      sendMagicLink,
      verifyCode,
      signOut,
      notice,
      showNotice,
      youLocation,
      referencePoint,
      locate,
      registerInterest,
      joinGroup,
      leaveGroup,
      startGroup,
      updateGroupDetails,
      profileName,
      needsName,
      saveName,
      notifications,
      unreadCount,
      markNotificationsRead,
      loadMessages,
      sendMessage,
      dataVersion,
    }),
    [
      adapter.mode,
      tab,
      neighborhood,
      loading,
      pins,
      groups,
      myPin,
      user,
      signInOpen,
      sendMagicLink,
      verifyCode,
      signOut,
      notice,
      showNotice,
      youLocation,
      referencePoint,
      locate,
      registerInterest,
      joinGroup,
      leaveGroup,
      startGroup,
      updateGroupDetails,
      profileName,
      needsName,
      saveName,
      notifications,
      unreadCount,
      markNotificationsRead,
      loadMessages,
      sendMessage,
      dataVersion,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
