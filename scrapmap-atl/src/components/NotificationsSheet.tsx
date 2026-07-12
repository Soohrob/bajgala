import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { notifications, markNotificationsRead } = useApp()

  useEffect(() => {
    void markNotificationsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="sheet-backdrop absolute inset-0 z-[1000] flex items-end bg-black/45" onClick={onClose}>
      <div className="sheet-panel max-h-[70%] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Nothing yet. You'll hear when neighbors join your group, when it activates, or when a new group
            forms near your pin.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-gray-200' : 'bg-plum'}`} />
                <div>
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
