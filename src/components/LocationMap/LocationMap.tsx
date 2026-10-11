/**
 * LocationMap.tsx
 *
 * A reusable Leaflet map component that:
 *  - Shows the current user's position (if isTracking)
 *  - Shows other nearby users' positions from Firestore subscriptions
 *  - Renders colour-coded markers: blue = doctor, green = patient, purple = admin
 *  - Displays a popup with user name, role, and last-updated time on click
 *  - Handles the Ionic shadow-DOM tile-rendering bug via InvalidateSize
 *
 * Props:
 *   mode       - 'self'    → show own pin only (Patient dashboard)
 *              - 'nearby'  → show own pin + role-filtered others (Doctor)
 *              - 'all'     → show everyone currently sharing (Admin)
 *   currentUid - UID of logged-in user (to style their pin differently)
 *   ownPosition- current user's GeolocationPosition (from useLocationTracking)
 *   locations  - array of LocationRecord fetched from Firestore
 *   height     - CSS height of the map container (default '220px')
 */

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationMap.css";
import type { LocationRecord } from "../Services/locationService";

// ─── Leaflet icon fix (Vite breaks the default icon URL resolution) ────────────

const makeIcon = (color: "blue" | "green" | "purple" | "red") => {
  const colorMap = {
    blue:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    green:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    purple: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    red:    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  };
  return new L.Icon({
    iconUrl: colorMap[color],
    iconRetinaUrl: colorMap[color].replace(".png", "-2x.png"),
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const ICONS = {
  doctor:  makeIcon("blue"),
  patient: makeIcon("green"),
  admin:   makeIcon("purple"),
  self:    makeIcon("red"),
};

// ─── InvalidateSize helper (fixes blank/grey tiles inside Ionic shadow DOM) ────

const InvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// ─── FlyToPosition – animate map centre when own position arrives ──────────────

interface FlyToProps {
  lat: number;
  lng: number;
}
const FlyToPosition: React.FC<FlyToProps> = ({ lat, lng }) => {
  const map = useMap();
  const hasFlewRef = useRef(false);
  useEffect(() => {
    if (!hasFlewRef.current) {
      map.flyTo([lat, lng], 14, { duration: 1.2 });
      hasFlewRef.current = true;
    }
  }, [lat, lng, map]);
  return null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUpdatedAt(ts: { seconds: number } | null | undefined): string {
  if (!ts) return "Unknown";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export type LocationMapMode = "self" | "nearby" | "all";

interface LocationMapProps {
  mode?: LocationMapMode;
  currentUid?: string | null;
  ownPosition?: GeolocationPosition | null;
  locations?: LocationRecord[];
  height?: string;
}

const LocationMap: React.FC<LocationMapProps> = ({
  mode = "self",
  currentUid,
  ownPosition,
  locations = [],
  height = "220px",
}) => {
  // Default centre: Douala, Cameroon
  const DEFAULT_CENTER: [number, number] = [4.0511, 9.7679];

  const ownLat = ownPosition?.coords.latitude;
  const ownLng = ownPosition?.coords.longitude;
  const center: [number, number] =
    ownLat !== undefined && ownLng !== undefined
      ? [ownLat, ownLng]
      : DEFAULT_CENTER;

  return (
    <div className="location-map-wrapper" style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        className="location-map-leaflet"
        zoomControl
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <InvalidateSize />

        {/* Fly to own position on first fix */}
        {ownLat !== undefined && ownLng !== undefined && (
          <FlyToPosition lat={ownLat} lng={ownLng} />
        )}

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* ── Own position marker ── */}
        {ownLat !== undefined && ownLng !== undefined && (
          <>
            {/* Accuracy circle */}
            <Circle
              center={[ownLat, ownLng]}
              radius={ownPosition?.coords.accuracy ?? 50}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1 }}
            />
            <Marker position={[ownLat, ownLng]} icon={ICONS.self}>
              <Popup>
                <div className="loc-popup">
                  <strong>You</strong>
                  <span className="loc-popup-role loc-popup-self">Your location</span>
                  <span className="loc-popup-time">
                    Updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* ── Other users' markers ── */}
        {locations
          .filter((loc) => loc.uid !== currentUid && loc.isSharing)
          .map((loc) => (
            <Marker
              key={loc.uid}
              position={[loc.lat, loc.lng]}
              icon={ICONS[loc.role] ?? ICONS.patient}
            >
              <Popup>
                <div className="loc-popup">
                  {loc.avatar && (
                    <img
                      src={loc.avatar}
                      alt={loc.name}
                      className="loc-popup-avatar"
                    />
                  )}
                  <strong>{loc.name}</strong>
                  <span className={`loc-popup-role loc-popup-${loc.role}`}>
                    {roleLabel(loc.role)}
                  </span>
                  <span className="loc-popup-time">
                    Updated: {formatUpdatedAt(loc.updatedAt)}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Legend */}
      {mode !== "self" && (
        <div className="location-map-legend">
          {mode === "all" && (
            <>
              <span className="legend-item legend-doctor">● Doctor</span>
              <span className="legend-item legend-patient">● Patient</span>
              <span className="legend-item legend-admin">● Admin</span>
            </>
          )}
          {mode === "nearby" && (
            <span className="legend-item legend-patient">● Patient</span>
          )}
          <span className="legend-item legend-self">● You</span>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
