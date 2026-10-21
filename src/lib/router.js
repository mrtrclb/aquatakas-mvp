// Gerçek adresli (path) yönlendirme: /tur/betta-splendens, /ilan/12, /grup/nano ...
// Eski #/... bağlantıları açılışta yeni biçime çevrilir. Yönetim paneli #/yonetim olarak kalır.

const isAdminHash = (hash) => /^#\/yonetim(\/|$)/.test(hash);

export function upgradeLegacyHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#/") && !isAdminHash(hash)) {
    window.history.replaceState(null, "", hash.slice(1) || "/");
  }
}

export function routePath() {
  const hash = window.location.hash;
  if (hash.startsWith("#/") && !isAdminHash(hash)) return hash.slice(1);
  const path = decodeURI(window.location.pathname).replace(/\.html$/, "").replace(/\/+$/, "");
  return path || "/";
}

function emit(kind) {
  window.dispatchEvent(new CustomEvent("aq:route", { detail: kind }));
}

// Uygulama içi gezinme: adres çubuğunu günceller ve sayfayı yenilemeden yönlendirir
export function navigate(path, { replace = false } = {}) {
  const target = path || "/";
  const same = target === window.location.pathname && !window.location.hash;
  if (!same) window.history[replace ? "replaceState" : "pushState"](null, "", target);
  emit("push");
}

// cb(kind): kind = "push" (uygulama içi) | "pop" (tarayıcının ileri/geri tuşu)
export function onRoute(cb) {
  const onPush = (event) => cb(event.detail || "push");
  const onPop = () => cb("pop");
  const onHash = () => {
    if (!isAdminHash(window.location.hash)) {
      upgradeLegacyHash();
      cb("pop");
    }
  };
  window.addEventListener("aq:route", onPush);
  window.addEventListener("popstate", onPop);
  window.addEventListener("hashchange", onHash);
  return () => {
    window.removeEventListener("aq:route", onPush);
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onHash);
  };
}

export function absoluteUrl(path) {
  return window.location.origin + path;
}
