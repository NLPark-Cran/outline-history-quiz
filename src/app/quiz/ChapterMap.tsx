'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { PLACES, Place } from '@/lib/questions';
import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';

interface MapEvent {
  date: string;
  title: string;
  summary: string;
  detail: string;
  place?: string;
}

interface ChapterMapProps {
  title: string;
  timeline: MapEvent[];
}

type TileSource = 'carto' | 'amap';

const CHINA_BOUNDS: [[number, number], [number, number]] = [
  [17.5, 73.5],
  [54.5, 135.5],
];

const TILE_LAYERS: Record<
  TileSource,
  { url: string; attribution: string; subdomains: string | string[] }
> = {
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  amap: {
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    attribution: '&copy; 高德地图',
    subdomains: ['1', '2', '3', '4'],
  },
};

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number): number {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((lat / 12.0) * Math.PI) + 320 * Math.sin((lat * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(lng: number, lat: number): number {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((lng / 12.0) * Math.PI) + 300.0 * Math.sin((lng / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const offsetLat = (dLat * 180.0) / ((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * Math.PI);
  const offsetLng = (dLng * 180.0) / (6378245.0 / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lng + offsetLng, lat + offsetLat];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function groupByPlace(timeline: MapEvent[]) {
  const groups: Record<string, MapEvent[]> = {};
  for (const event of timeline) {
    if (!event.place || !PLACES[event.place]) continue;
    if (!groups[event.place]) groups[event.place] = [];
    groups[event.place].push(event);
  }
  return groups;
}

const STORAGE_KEY = 'outline-map-tile-source';

export default function ChapterMap({ title, timeline }: ChapterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const [activePlace, setActivePlace] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<MapEvent[] | null>(null);
  const [tileSource, setTileSource] = useState<TileSource>(() => {
    if (typeof window === 'undefined') return 'amap';
    const saved = localStorage.getItem(STORAGE_KEY) as TileSource | null;
    return saved === 'carto' ? 'carto' : 'amap';
  });

  const grouped = useMemo(() => groupByPlace(timeline), [timeline]);
  const placeIds = useMemo(() => Object.keys(grouped), [grouped]);

  const placeCoords = useMemo(() => {
    const coords: Record<string, [number, number]> = {};
    for (const id of placeIds) {
      const place = PLACES[id];
      if (tileSource === 'amap') {
        coords[id] = wgs84ToGcj02(place.lng, place.lat);
      } else {
        coords[id] = [place.lng, place.lat];
      }
    }
    return coords;
  }, [placeIds, tileSource]);

  const switchTileSource = useCallback(
    (next: TileSource) => {
      setTileSource(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
    },
    [setTileSource]
  );

  // Initialize the map once.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const L = await import('leaflet');
      if (!mounted || !containerRef.current) return;

      LRef.current = L;
      const mapInstance = L.map(containerRef.current, {
        center: [35.2, 104.2],
        zoom: 4,
        minZoom: 3,
        maxZoom: 11,
        scrollWheelZoom: true,
        attributionControl: false,
      });

      L.control.attribution({ position: 'bottomright' }).addTo(mapInstance);

      const layer = L.layerGroup().addTo(mapInstance);
      mapRef.current = mapInstance;
      layerRef.current = layer;
      setLeafletReady(true);

      requestAnimationFrame(() => mapInstance.invalidateSize());
      mapInstance.fitBounds(CHINA_BOUNDS, { padding: [8, 8] });
    })();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
        tileLayerRef.current = null;
        LRef.current = null;
      }
    };
  }, []);

  // Switch tile layer when tileSource changes, without rebuilding the whole map.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !leafletReady) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const tileConfig = TILE_LAYERS[tileSource];
    const tiles = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains,
      maxZoom: 18,
      detectRetina: true,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
    }).addTo(map);
    tileLayerRef.current = tiles;
  }, [tileSource, leafletReady]);

  // Render markers based on timeline and current coordinate system.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer || !leafletReady) return;

    layer.clearLayers();
    const bounds: [number, number][] = [];
    let firstMarker: Leaflet.Marker | null = null;

    placeIds.forEach((placeId, idx) => {
      const place: Place = PLACES[placeId];
      const events = grouped[placeId];
      const [lng, lat] = placeCoords[placeId];
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<button type="button" aria-label="${escapeHtml(place.name)}" class="grid place-items-center w-8 h-8 rounded-full bg-[#a8272b] text-white text-xs font-bold shadow-lg border-2 border-white hover:bg-[#7f1d20] transition-colors">${events.length > 1 ? events.length : '史'}</button>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(layer);

      const popupHtml = `<div class="font-serif-sc"><b>${escapeHtml(place.name)}</b><br/>${events
        .map((e) => `${escapeHtml(e.date)} · ${escapeHtml(e.title)}`)
        .join('<br/>')}</div>`;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setActivePlace(placeId);
        setSelectedEvents(events);
      });

      bounds.push([lat, lng]);
      if (idx === 0) firstMarker = marker;
    });

    requestAnimationFrame(() => map.invalidateSize());
    if (bounds.length > 0) {
      map.fitBounds(bounds.length === 1 ? [bounds[0], bounds[0]] : bounds, {
        padding: [24, 24],
        maxZoom: 8,
      });
      if (firstMarker) {
        setActivePlace(placeIds[0]);
        setSelectedEvents(grouped[placeIds[0]]);
      }
    } else {
      map.fitBounds(CHINA_BOUNDS, { padding: [8, 8] });
      setActivePlace(null);
      setSelectedEvents(null);
    }
  }, [leafletReady, timeline, grouped, placeIds, placeCoords]);

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8c8170] font-serif-sc flex items-center justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <span>{placeIds.length} 个地点</span>
          <div className="inline-flex rounded-lg border border-[#d8cdb6] overflow-hidden">
            <button
              onClick={() => switchTileSource('amap')}
              className={`px-2 py-1 text-[11px] ${
                tileSource === 'amap'
                  ? 'bg-[#a8272b] text-white'
                  : 'bg-white text-[#5b5247] hover:bg-[#f4eedf]'
              }`}
              title="高德地图（大陆访问更快，推荐）"
            >
              高德（建议）
            </button>
            <button
              onClick={() => switchTileSource('carto')}
              className={`px-2 py-1 text-[11px] border-l border-[#d8cdb6] ${
                tileSource === 'carto'
                  ? 'bg-[#a8272b] text-white'
                  : 'bg-white text-[#5b5247] hover:bg-[#f4eedf]'
              }`}
              title="CARTO（全球 CDN）"
            >
              CARTO
            </button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="h-[260px] rounded-xl border border-[#d8cdb6] bg-[#e6ddc9]" />
      {selectedEvents && activePlace && (
        <div className="bg-white border border-[#d8cdb6] rounded-xl p-3 animate-[fade_.2s_ease-out]">
          <h4 className="font-serif-sc font-bold text-[#a8272b] mb-2">{PLACES[activePlace].name}</h4>
          <ul className="space-y-2 text-sm text-[#5b5247]">
            {selectedEvents.map((e, i) => (
              <li key={`${e.date}-${e.title}-${i}`}>
                <b className="text-[#211c16]">{e.date} · {e.title}</b>
                <p className="text-[13px] mt-0.5 leading-relaxed">{e.detail || e.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {placeIds.length === 0 && (
        <div className="bg-white border border-[#d8cdb6] rounded-xl p-4 text-sm text-[#5b5247]">
          本章事件多为全国性制度或思想线索，暂无具体地点标注。
        </div>
      )}
    </div>
  );
}
