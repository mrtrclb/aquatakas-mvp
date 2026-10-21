import { supabase } from "./supabase";

// Kişisel veri içermeyen ziyaret sayacı: yalnızca gün + bölüm bazında toplam sayılar.
// Oturum işareti sekme kapanınca silinen sessionStorage'da tutulur; IP ya da kullanıcı kimliği gönderilmez.
let lastKey = "";
export function trackVisit(section, key) {
  if (key === lastKey) return;
  lastKey = key;
  let newSession = false;
  try {
    if (!sessionStorage.getItem("aq-visit")) {
      sessionStorage.setItem("aq-visit", "1");
      newSession = true;
    }
  } catch (error) {
    newSession = false;
  }
  if (typeof navigator !== "undefined" && navigator.webdriver && !window.__aqTrackInTests) return; // otomatik tarayıcıları sayma
  supabase.rpc("track_visit", { p_section: section, p_new_session: newSession }).then(() => {}, () => {});
}
