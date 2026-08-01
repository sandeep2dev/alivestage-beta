'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const amberPinSvg = `
<svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 29 17 29s17-17 17-29C34 7.6 26.4 0 17 0z" fill="#F5A623"/>
  <circle cx="17" cy="17" r="7" fill="#161616"/>
</svg>`;

const amberIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(amberPinSvg) : ''}`,
  iconSize: [34, 46],
  iconAnchor: [17, 46],
  popupAnchor: [0, -40],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], map.getZoom() < 14 ? 15 : map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name ?? null;
}

/** Display-only; values stored/submitted keep full IEEE-754 double precision. */
function formatCoord(value) {
  return Number(value).toFixed(8).replace(/\.?0+$/, '');
}

async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
      query
    )}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default function VenueLocationPicker({
  id = 'venue-location',
  value,
  onChange,
  error,
  defaultCenter = { lat: 26.9124, lng: 75.7873 },
}) {
  const [query, setQuery] = useState(value?.address ?? '');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);

  const lat = value?.lat ?? null;
  const lng = value?.lng ?? null;

  useEffect(() => {
    setQuery(value?.address ?? '');
  }, [value?.address]);

  const commitPoint = useCallback(
    async (newLat, newLng, presetAddress) => {
      setShowResults(false);
      onChange({
        address: presetAddress ?? value?.address ?? '',
        lat: newLat,
        lng: newLng,
      });
      if (!presetAddress) {
        const addr = await reverseGeocode(newLat, newLng);
        if (addr) {
          setQuery(addr);
          onChange({ address: addr, lat: newLat, lng: newLng });
        }
      } else {
        setQuery(presetAddress);
      }
    },
    [onChange, value?.address]
  );

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange({ address: q, lat, lng });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await searchAddress(q);
      setResults(r);
      setShowResults(true);
      setLoading(false);
    }, 450);
  };

  const handlePickResult = (r) => {
    commitPoint(Number(r.lat), Number(r.lon), r.display_name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        commitPoint(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const center = lat != null && lng != null ? { lat, lng } : defaultCenter;

  return (
    <div
      id={id}
      style={styles.wrap}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <div style={styles.searchRow}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id={`${id}-search`}
            style={{
              ...styles.input,
              ...(error ? { borderColor: '#e57373' } : {}),
            }}
            placeholder="Search address, venue, or society name..."
            value={query}
            onChange={handleQueryChange}
            onFocus={() => results.length && setShowResults(true)}
            onBlur={() => {
              setTimeout(() => setShowResults(false), 150);
            }}
          />
          {showResults && results.length > 0 && (
            <ul
              style={styles.dropdown}
              onMouseDown={(e) => e.preventDefault()}
            >
              {results.map((r) => (
                <li
                  key={r.place_id}
                  style={styles.dropdownItem}
                  onClick={() => handlePickResult(r)}
                >
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          style={styles.locateBtn}
          disabled={locating}
        >
          {locating ? 'Locating…' : '📍 Use my location'}
        </button>
      </div>

      <div
        style={{
          ...styles.mapWrap,
          ...(error ? { borderColor: '#e57373' } : {}),
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={lat != null ? 15 : 12}
          style={{ height: '320px', width: '100%' }}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          <ZoomControl position="bottomright" />
          <ClickHandler onPick={(la, ln) => commitPoint(la, ln)} />
          {lat != null && lng != null && (
            <Marker
              position={[lat, lng]}
              icon={amberIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  commitPoint(p.lat, p.lng);
                },
              }}
            />
          )}
          <RecenterOnChange lat={lat} lng={lng} />
        </MapContainer>
      </div>

      {error ? (
        <p id={`${id}-error`} style={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <p style={styles.hint}>
        Search above, click anywhere on the map, or drag the pin to set the exact spot.
        {loading ? ' Searching…' : null}
        {lat != null && lng != null && (
          <span style={styles.coords}>
            {' '}
            &middot; {formatCoord(lat)}, {formatCoord(lng)}
          </span>
        )}
      </p>
    </div>
  );
}

const styles = {
  wrap: {
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#EDEDED',
  },
  searchRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    background: '#0F0F0F',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#EDEDED',
    fontSize: 14,
    outline: 'none',
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    left: 0,
    right: 0,
    background: '#1E1E1E',
    border: '1px solid #333',
    borderRadius: 8,
    listStyle: 'none',
    margin: 0,
    padding: 4,
    zIndex: 2000,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    maxHeight: 220,
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '8px 10px',
    fontSize: 13,
    borderRadius: 6,
    cursor: 'pointer',
  },
  locateBtn: {
    whiteSpace: 'nowrap',
    background: '#2a2a2a',
    border: '1px solid #3a3a3a',
    color: '#F5A623',
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  mapWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid #2a2a2a',
  },
  error: {
    fontSize: 13,
    color: '#e57373',
    margin: '8px 0 0',
  },
  hint: {
    fontSize: 12,
    color: '#8a8a8a',
    marginTop: 8,
    marginBottom: 0,
  },
  coords: {
    color: '#F5A623',
    fontFamily: 'monospace',
  },
};
