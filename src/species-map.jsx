// Tür dağılım haritası (Leaflet + OpenStreetMap). Bu dosya yalnızca harita gerektiğinde yüklenir.
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> katkıcıları';
const POINT_STYLE = { radius: 7, color: "#ffffff", weight: 2, fillColor: "#059669", fillOpacity: 0.95 };
const AREA_STYLE = { stroke: false, fillColor: "#0891b2", fillOpacity: 0.2 };

const esc = (text) => String(text || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function baseMap(element) {
  const map = L.map(element, {
    worldCopyJump: true,
    scrollWheelZoom: false,
    tap: false,
    zoomSnap: 0.5,
    minZoom: 1,
    maxZoom: 13,
    attributionControl: true
  });
  map.attributionControl.setPrefix(false);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);
  // Tıklayınca fare tekerleğiyle yakınlaştırma açılır, dışarı çıkınca kapanır (sayfa kaydırmayı engellemesin)
  map.on("focus click", () => map.scrollWheelZoom.enable());
  map.on("blur mouseout", () => map.scrollWheelZoom.disable());
  return map;
}

function fit(map, points, areas) {
  const bounds = L.latLngBounds([]);
  points.forEach((p) => bounds.extend([p.lat, p.lng]));
  areas.forEach((a) => bounds.extend(L.latLng(a.lat, a.lng).toBounds(Math.max(1, a.r || 50) * 2000)));
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
  else map.setView([10, 20], 1.5);
}

/* Tür sayfasındaki salt görüntüleme haritası ------------------------------- */
export default function SpeciesMap({ points = [], areas = [], focus = null, height = 300 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    const map = baseMap(ref.current);
    mapRef.current = map;
    areas.forEach((area) => {
      L.circle([area.lat, area.lng], { ...AREA_STYLE, radius: Math.max(1, area.r || 50) * 1000 })
        .bindTooltip(esc(area.label || "Yaygın görüldüğü bölge"), { sticky: true })
        .addTo(map);
    });
    markers.current = {};
    points.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], POINT_STYLE)
        .bindPopup("<strong>" + esc(p.title) + "</strong>" + (p.origin ? "<br><span style='color:#475569'>" + esc(p.origin) + "</span>" : ""), { closeButton: false })
        .bindTooltip(esc(p.title), { direction: "top", offset: [0, -6] })
        .addTo(map);
      markers.current[p.id] = marker;
    });
    fit(map, points, areas);
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(ref.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), JSON.stringify(areas)]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    const marker = markers.current[focus.id];
    if (!marker) return;
    mapRef.current.flyTo(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 7), { duration: 0.6 });
    marker.openPopup();
  }, [focus]);

  return <div ref={ref} style={{ height }} className="z-0 w-full bg-slate-100" role="region" aria-label="Dağılım haritası" />;
}

/* Yönetim ve öneri penceresi için nokta seçici -----------------------------
   value: { lat, lng } | null — seçilen nokta
   context: [{ lat, lng, title }] — diğer kayıtlar (soluk gösterilir)
   areas: [{ lat, lng, r, label }] — yayılım daireleri
   onPick({ lat, lng }) — haritaya tıklanınca */
export function MapPicker({ value = null, context = [], areas = [], onPick, height = 260 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layer = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const map = baseMap(ref.current);
    mapRef.current = map;
    map.getContainer().style.cursor = "crosshair";
    map.on("click", (event) => {
      const { lat, lng } = event.latlng.wrap();
      pickRef.current && pickRef.current({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
    });
    layer.current = L.layerGroup().addTo(map);
    const pts = [...context, ...(value ? [value] : [])];
    fit(map, pts, areas);
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(ref.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    areas.forEach((area) => {
      if (Number.isFinite(area.lat) && Number.isFinite(area.lng)) L.circle([area.lat, area.lng], { ...AREA_STYLE, radius: Math.max(1, area.r || 50) * 1000, interactive: false }).addTo(group);
    });
    context.forEach((p) => L.circleMarker([p.lat, p.lng], { ...POINT_STYLE, radius: 5, fillColor: "#94a3b8", interactive: !!p.title }).bindTooltip(esc(p.title || "")).addTo(group));
    if (value && Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      L.circleMarker([value.lat, value.lng], { ...POINT_STYLE, radius: 9, fillColor: "#dc2626" }).addTo(group);
    }
  }, [JSON.stringify(value), JSON.stringify(context), JSON.stringify(areas)]);

  return <div ref={ref} style={{ height }} className="z-0 w-full rounded-2xl bg-slate-100 ring-1 ring-slate-200" />;
}
