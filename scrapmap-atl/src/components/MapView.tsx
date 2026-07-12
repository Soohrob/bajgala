import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

export type PinKind = 'neighbor' | 'group' | 'dropoff' | 'you'

export interface MapPin {
  id: string
  position: [number, number]
  kind: PinKind
  label?: string
}

const ICONS: Record<PinKind, L.DivIcon> = {
  neighbor: L.divIcon({ className: 'pin-neighbor', html: '<span class="pin-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
  group: L.divIcon({ className: 'pin-group', html: '<span class="pin-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
  dropoff: L.divIcon({ className: 'pin-dropoff', html: '<span class="pin-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
  you: L.divIcon({ className: 'pin-you', html: '<span class="pin-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [map, center])
  return null
}

export default function MapView({
  center,
  pins,
  zoom = 15,
  heightClass = 'h-60',
}: {
  center: [number, number]
  pins: MapPin[]
  zoom?: number
  heightClass?: string
}) {
  return (
    <div
      className={`${heightClass} relative z-0 w-full overflow-hidden rounded-[1.4rem] shadow-[0_12px_32px_-14px_rgba(15,110,86,0.35)] ring-1 ring-black/10`}
    >
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        {pins.map((pin) => (
          <Marker key={pin.id} position={pin.position} icon={ICONS[pin.kind]}>
            {pin.label ? <Popup>{pin.label}</Popup> : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
