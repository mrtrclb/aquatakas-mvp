import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Herkese açık site ayarları (duyuru, topluluk kuralları); yönetim panelinden değişir
export function useSiteSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["announcement", "community_rules"])
      .then(({ data }) => {
        if (!cancelled && data) setSettings(Object.fromEntries(data.map((row) => [row.key, row.value])));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}
