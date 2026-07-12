import { useEffect, useRef, useState } from 'react'
import type { Group } from '../types'
import CostBreakdown from './CostBreakdown'
import InviteRow from './InviteRow'
import GroupBoard from './GroupBoard'
import { useApp } from '../context/AppContext'

function HostDetailsEditor({ group }: { group: Group }) {
  const { updateGroupDetails } = useApp()
  const [venmo, setVenmo] = useState(group.venmoHandle ?? '')
  const [note, setNote] = useState(group.hostNote ?? '')
  const [saving, setSaving] = useState(false)

  const dirty = venmo !== (group.venmoHandle ?? '') || note !== (group.hostNote ?? '')

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500">Host settings (only you see this form)</p>
      <input
        value={venmo}
        onChange={(e) => setVenmo(e.target.value.replace(/^@/, ''))}
        placeholder="Your Venmo handle (for members to pay you)"
        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-forest"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for members — where's the bin, drop-off tips…"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-forest"
      />
      {dirty ? (
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await updateGroupDetails(group.id, { venmoHandle: venmo.trim(), hostNote: note.trim() })
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          className="w-full rounded-lg bg-forest py-2 text-xs font-semibold text-white disabled:bg-gray-300"
        >
          {saving ? 'Saving…' : 'Save details'}
        </button>
      ) : null}
    </div>
  )
}

function MemberDetails({ group }: { group: Group }) {
  const perPerson = group.monthlyCost / Math.max(group.members, 1)
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
      <div>
        <p className="text-xs font-semibold text-gray-500">Members</p>
        <p className="mt-0.5 text-gray-800">
          {group.memberNames.length > 0 ? group.memberNames.join(', ') : `${group.members} neighbors`}
          {group.hostName ? (
            <span className="text-gray-500"> · {group.hostName} hosts</span>
          ) : null}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500">Settling up</p>
        {group.venmoHandle ? (
          <p className="mt-0.5 text-gray-800">
            Venmo <span className="font-medium">${perPerson.toFixed(2)}/mo</span> to{' '}
            <a
              href={`https://venmo.com/u/${group.venmoHandle}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-plum underline"
            >
              @{group.venmoHandle}
            </a>{' '}
            — the host pays the pickup service.
          </p>
        ) : (
          <p className="mt-0.5 text-gray-500">The host hasn't added a Venmo handle yet.</p>
        )}
      </div>
      {group.hostNote ? (
        <div>
          <p className="text-xs font-semibold text-gray-500">From the host</p>
          <p className="mt-0.5 text-gray-800">{group.hostNote}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function GroupCard({
  group,
  onJoin,
  onLeave,
  distanceMiles,
}: {
  group: Group
  onJoin: () => void
  onLeave: () => void
  distanceMiles?: number
}) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const confirmTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  const forming = group.status === 'forming'
  const full = group.members >= group.capacity
  const spotsLeft = group.capacity - group.members
  const stillNeeded = Math.max(group.activationTarget - group.members, 0)

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{group.hostLabel}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {group.binSize} · pickup {group.pickupDay}s
            {distanceMiles !== undefined ? ` · ${distanceMiles.toFixed(1)} mi from you` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              forming
                ? 'bg-plum-light text-plum'
                : full
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-mint text-forest'
            }`}
          >
            {forming ? 'Forming' : full ? 'Full' : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
          </span>
          {group.isExample ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Example
            </span>
          ) : null}
        </div>
      </div>

      {forming ? (
        <div className="mt-3 rounded-xl bg-plum-light p-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-plum">
              {stillNeeded} more {stillNeeded === 1 ? 'neighbor' : 'neighbors'} needed
            </span>{' '}
            to activate. At {group.activationTarget} members everyone pays about{' '}
            <span className="font-semibold">${(group.monthlyCost / group.activationTarget).toFixed(2)}/mo</span>.
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: group.activationTarget }).map((_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < group.members ? 'bg-plum' : 'bg-plum/20'}`} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <CostBreakdown monthlyCost={group.monthlyCost} members={group.members} capacity={group.capacity} />
        </div>
      )}

      {group.isMember ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-mint px-3 py-2.5 text-sm font-medium text-forest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            {forming
              ? "You're in — it activates when enough neighbors join."
              : `You're in — first pickup ${group.pickupDay}. You pay $${(group.monthlyCost / group.members).toFixed(2)}/mo.`}
          </div>
          <MemberDetails group={group} />
          {group.isHost && !forming && !group.isExample ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <p className="text-xs font-semibold text-amber-800">Your next step as host</p>
              <p className="mt-0.5">
                Order pickup service to your address — e.g.{' '}
                <a href="https://www.compostnow.org" target="_blank" rel="noreferrer" className="font-medium underline">
                  compostnow.org
                </a>{' '}
                — then add your Venmo below so members can split the bill with you.
              </p>
            </div>
          ) : null}
          {group.isHost ? <HostDetailsEditor group={group} /> : null}
          <GroupBoard group={group} />
          {!full ? (
            <div className="mt-3">
              <InviteRow inviteCode={group.inviteCode} />
            </div>
          ) : null}
          <button
            onClick={() => {
              if (!confirmLeave) {
                setConfirmLeave(true)
                confirmTimer.current = window.setTimeout(() => setConfirmLeave(false), 5000)
                return
              }
              window.clearTimeout(confirmTimer.current)
              setConfirmLeave(false)
              onLeave()
            }}
            className={`mt-2 w-full rounded-xl py-2 text-xs font-medium transition-colors ${
              confirmLeave ? 'bg-red-50 text-red-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {confirmLeave
              ? group.members - 1 > 0
                ? `Tap again to confirm — neighbors' share becomes $${(group.monthlyCost / (group.members - 1)).toFixed(2)}/mo`
                : 'Tap again to confirm — the group will be removed'
              : 'Leave group'}
          </button>
        </>
      ) : (
        <button
          onClick={onJoin}
          disabled={full}
          className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {full
            ? 'Group full'
            : forming
              ? `Join — about $${(group.monthlyCost / group.activationTarget).toFixed(2)}/mo once active`
              : `Join group — pay $${(group.monthlyCost / (group.members + 1)).toFixed(2)}/mo`}
        </button>
      )}
    </div>
  )
}
