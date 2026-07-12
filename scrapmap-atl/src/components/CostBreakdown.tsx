export default function CostBreakdown({
  monthlyCost,
  members,
  capacity,
}: {
  monthlyCost: number
  members: number
  capacity: number
}) {
  const perPerson = monthlyCost / Math.max(members, 1)
  const nextPerPerson = monthlyCost / Math.min(members + 1, capacity)
  const full = members >= capacity

  return (
    <div className="rounded-2xl bg-plum-light p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-600">
          ${monthlyCost}/mo ÷ {members} {members === 1 ? 'person' : 'people'}
        </span>
        {/* keyed so the price pops whenever the split changes */}
        <span key={perPerson.toFixed(2)} className="anim-pop inline-block font-display text-lg font-bold text-plum">
          ${perPerson.toFixed(2)}/each
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: capacity }).map((_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < members ? 'bg-plum' : 'bg-plum/20'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {full
          ? 'Group is full — cost is locked in.'
          : `One more member drops it to $${nextPerPerson.toFixed(2)} each.`}
      </p>
    </div>
  )
}
