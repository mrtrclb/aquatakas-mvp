import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, ChevronLeft, Loader2, MapPin, Search, Star, X } from "lucide-react";
import { Field, inputClass, normalizeUsername } from "./auth.jsx";
import { LEGAL_VERSION, LegalModal } from "./legal.jsx";
import { supabase, trError } from "./lib/supabase";
import { TR_CITIES } from "./lib/listings";
import { SpeciesImage } from "./knowledge.jsx";
import { KB_CATEGORIES, KB_SECTIONS } from "./species.js";

// Yeni üyeye ilk girişte adım adım profil kurulumu: (Google/Apple ile gelene önce kullanıcı adı + koşullar) → türler → gruplar → hakkında + şehir → sosyal hesaplar → bitti

const fold = (text) => (text || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (ch) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[ch]);
const TANKS = ["1", "2", "3", "4", "5+"];
const SOCIALS = [
  ["instagram", "Instagram", "@kullaniciadi"],
  ["x", "X (Twitter)", "@kullaniciadi"],
  ["youtube", "YouTube", "Kanal bağlantısı ya da @kanal"],
  ["facebook", "Facebook", "Profil bağlantısı"],
  ["web", "Web sitesi", "https://"]
];
const BASE_STEPS = ["species", "groups", "about", "socials", "done"];

export function shouldOnboard(auth) {
  const user = auth && auth.user;
  const profile = auth && auth.profile;
  if (!user || !profile || profile.deleted_at) return false;
  const meta = user.user_metadata || {};
  if (meta.onboarded_at) return false;
  // Yalnızca yeni hesaplar (son 14 gün içinde açılmış)
  const created = new Date(profile.created_at || user.created_at || 0).getTime();
  return Date.now() - created < 14 * 86400000;
}

export function OnboardingModal({ auth, species, groups, speciesId, onClose }) {
  const profile = auth.profile;
  // Google/Apple ile gelen üye koşulları kayıt formunda görmedi: ilk adım onay
  const [steps] = useState(() => (auth.needsTerms ? ["terms", ...BASE_STEPS] : BASE_STEPS));
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(profile.username || "");
  const [termsAt, setTermsAt] = useState(null);
  const [kvkkAt, setKvkkAt] = useState(null);
  const [legalOpen, setLegalOpen] = useState(null);
  const [mode, setMode] = useState("keep"); // keep | fav
  const [keep, setKeep] = useState([]);
  const [fav, setFav] = useState([]);
  const [query, setQuery] = useState("");
  const [joined, setJoined] = useState([]);
  const [tanks, setTanks] = useState("");
  const [bio, setBio] = useState(profile.bio || "");
  const [city, setCity] = useState(profile.city || "");
  const [socials, setSocials] = useState(() => ({ instagram: "", x: "", youtube: "", facebook: "", web: "", ...(profile.socials || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = steps[step];
  const go = (key) => setStep(steps.indexOf(key));
  const firstStep = steps[0] === "terms" ? 1 : 0; // onay verildikten sonra geri dönülmez
  const totalDots = steps.length - 1;

  const speciesList = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [];
    return species.filter((item) => fold([item.name, item.latin, ...(item.keywords || [])].join(" ")).includes(q)).slice(0, 30);
  }, [species, query]);

  // Tür rehberindeki kategoriler; her açılışta her kategoriden rastgele 3 tür (sıra pencere açıkken sabit)
  const [expanded, setExpanded] = useState({});
  const groupsByCategory = useMemo(() => {
    const order = Object.fromEntries(KB_SECTIONS.map((section, index) => [section.id, index]));
    return KB_CATEGORIES.slice()
      .sort((a, b) => (order[a.section] ?? 9) - (order[b.section] ?? 9))
      .map((category) => {
        const items = species.filter((item) => item.category === category.id);
        const shuffled = items.map((item) => ({ item, key: Math.random() })).sort((a, b) => a.key - b.key).map(({ item }) => item);
        return { category, items: shuffled };
      })
      .filter((group) => group.items.length > 0);
  }, [species]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupList = useMemo(() => groups.filter((group) => group.dbId && !group.memberIds.includes(profile.id)).slice(0, 12), [groups, profile.id]);
  const selected = mode === "keep" ? keep : fav;
  const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  async function acceptTerms() {
    setError("");
    if (!termsAt || !kvkkAt) return setError(!termsAt ? "Devam etmek için Kullanım Koşulları'nı okuyup kabul etmelisin." : "Devam etmek için KVKK Aydınlatma Metni'ni okumalısın.");
    const handle = normalizeUsername(username);
    if (handle.length < 3) return setError(trError(new Error("username_check")));
    setBusy(true);
    try {
      if (handle !== profile.username) {
        const { data: taken } = await supabase.from("profiles").select("id").eq("username", handle).maybeSingle();
        if (taken) throw new Error("profiles_username_key");
        const { error: err } = await supabase.from("profiles").update({ username: handle }).eq("id", profile.id);
        if (err) throw err;
        auth.reloadProfile();
      }
      const { error: err } = await supabase.auth.updateUser({ data: { terms_version: LEGAL_VERSION, terms_accepted_at: termsAt, kvkk_read_at: kvkkAt } });
      if (err) throw err;
      go("species");
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  async function markDone() {
    await supabase.auth.updateUser({ data: { onboarded_at: new Date().toISOString() } }).catch(() => {});
  }

  async function skipAll() {
    setBusy(true);
    await markDone();
    onClose(false);
  }

  function goAbout() {
    // Hakkında kutusu boşsa seçilen türlerle başlasın
    if (!bio.trim() && keep.length) {
      const names = keep.map((slug) => (species.find((item) => item.slug === slug) || {}).name).filter(Boolean);
      setBio("Beslediğim türler: " + names.join(", ") + ". ");
    }
    go("about");
  }

  async function saveAll(withSocials) {
    setBusy(true);
    setError("");
    try {
      // Türler ve gruplar
      const keepRows = keep.map((slug) => speciesId(slug)).filter(Boolean).map((id) => ({ species_id: id, user_id: profile.id }));
      const favRows = fav.map((slug) => speciesId(slug)).filter(Boolean).map((id) => ({ species_id: id, user_id: profile.id }));
      const writes = [];
      if (keepRows.length) writes.push(supabase.from("species_keepers").upsert(keepRows, { onConflict: "species_id,user_id", ignoreDuplicates: true }));
      if (favRows.length) writes.push(supabase.from("species_favorites").upsert(favRows, { onConflict: "species_id,user_id", ignoreDuplicates: true }));
      joined.forEach((groupId) => writes.push(supabase.from("group_members").insert({ group_id: groupId })));
      const results = await Promise.all(writes);
      const failed = results.find((res) => res.error && !/duplicate|23505/i.test(res.error.message + res.error.code));
      if (failed) throw failed.error;

      // Profil: hakkında (tank sayısıyla), şehir, sosyal hesaplar
      let text = bio.trim();
      if (tanks && !text.startsWith("🐠")) text = ("🐠 " + tanks + " tank" + (text ? " · " + text : "")).trim();
      const patch = { bio: text.slice(0, 500) || null, city: city || null };
      if (withSocials) {
        patch.socials = Object.fromEntries(Object.entries(socials).map(([key, value]) => [key, String(value || "").trim().slice(0, 120)]));
      }
      const { error: err } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (err) throw err;
      await markDone();
      go("done");
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  const progress = Math.min(step, totalDots - 1);

  function tile(item) {
    const on = selected.includes(item.slug);
    return (
      <button
        key={item.slug}
        type="button"
        onClick={() => toggle(selected, mode === "keep" ? setKeep : setFav, item.slug)}
        aria-pressed={on}
        className={"relative overflow-hidden rounded-2xl border text-left transition " + (on ? "border-cyan-700 ring-2 ring-cyan-700/30" : "border-slate-200 hover:border-slate-300")}
      >
        <SpeciesImage species={item} className="aspect-[4/3] w-full" label={false} />
        <span className="block truncate px-2 py-1.5 text-xs font-black text-slate-800">{item.name}</span>
        {on && (
          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-cyan-700 text-white shadow">
            {mode === "keep" ? <Check size={14} /> : <Star size={13} fill="currentColor" />}
          </span>
        )}
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/60 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Profilini oluştur">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-[28px]">
        {/* Üst çubuk */}
        {name !== "done" && (
          <div className="flex items-center gap-2 px-4 pt-4">
            {step > firstStep ? (
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Geri"><ChevronLeft size={20} /></button>
            ) : (
              <span className="w-8" />
            )}
            <div className="flex flex-1 justify-center gap-1.5" aria-label={"Adım " + (progress + 1) + " / " + totalDots}>
              {Array.from({ length: totalDots }, (_, index) => index).map((index) => (
                <span key={index} className={"h-1.5 rounded-full transition-all " + (index <= progress ? "w-8 bg-cyan-700" : "w-4 bg-slate-200")} />
              ))}
            </div>
            {name === "terms" ? (
              <span className="w-8" />
            ) : (
              <button type="button" onClick={skipAll} disabled={busy} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Kapat" title="Şimdilik geç"><X size={18} /></button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
          {name === "terms" && (
            <>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Aquagram'a hoş geldin! 🐠</h2>
              <p className="mt-1 text-sm text-slate-500">Hesabın açıldı. Önce kullanıcı adını kontrol et ve koşulları onayla; ardından profilini birlikte kuralım.</p>
              <div className="mt-4 space-y-3">
                <Field label="Kullanıcı adı" hint="Küçük harf, rakam, nokta ve alt çizgi; 3-24 karakter.">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">@</span>
                    <input value={username} onChange={(event) => setUsername(normalizeUsername(event.target.value))} className={inputClass + " pl-8"} autoComplete="username" />
                  </div>
                </Field>
                <div className="grid gap-2 pt-1">
                  {[
                    ["terms", termsAt, "Kullanım Koşulları", "’nı (topluluk ve ilan kuralları dahil) okudum, anladım ve kabul ediyorum."],
                    ["kvkk", kvkkAt, "KVKK Aydınlatma Metni", "’ni okudum ve anladım."]
                  ].map(([key, done, label, rest]) => (
                    <div key={key} className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={Boolean(done)}
                        aria-label={label}
                        onClick={() => (done ? (key === "terms" ? setTermsAt(null) : setKvkkAt(null)) : setLegalOpen(key))}
                        className={"mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border " + (done ? "border-cyan-950 bg-cyan-950 text-white" : "border-slate-300 bg-white")}
                      >
                        {done && <CheckCircle2 size={11} />}
                      </button>
                      <span>
                        <button type="button" onClick={() => setLegalOpen(key)} className="font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2 hover:text-cyan-950">{label}</button>
                        {rest}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {name === "species" && (
            <>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Hoş geldin @{profile.username}! 🐠</h2>
              <p className="mt-1 text-sm text-slate-500">Hangi türleri besliyorsun, hangilerine bayılıyorsun? Seç, aynı türü besleyen hobiciler seni bulsun.</p>
              <div className="mt-3 flex rounded-full bg-slate-100 p-1">
                {[["keep", "🐟 Besliyorum", keep.length], ["fav", "⭐ Favorilerim", fav.length]].map(([key, label, count]) => (
                  <button key={key} type="button" onClick={() => setMode(key)} className={"flex-1 rounded-full py-2 text-sm font-black transition " + (mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                    {label} {count > 0 && <span className="ml-1 rounded-full bg-cyan-700 px-1.5 text-[12px] text-white">{count}</span>}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={15} className="text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tür ara: betta, neon, karides…" className="w-full bg-transparent text-sm outline-none" aria-label="Tür ara" />
              </label>
              {query.trim() ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">{speciesList.map(tile)}</div>
                  {speciesList.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Bu isimde bir tür bulamadık.</p>}
                </>
              ) : (
                <div className="mt-3 grid gap-4">
                  {groupsByCategory.map(({ category, items }) => {
                    const open = expanded[category.id];
                    const picked = items.filter((item) => keep.includes(item.slug) || fav.includes(item.slug)).length;
                    return (
                      <section key={category.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                            <span aria-hidden="true">{category.emoji}</span> {category.name}
                            {picked > 0 && <span className="rounded-full bg-cyan-700 px-1.5 text-[12px] text-white">{picked}</span>}
                          </h3>
                          {items.length > 3 && (
                            <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [category.id]: !open }))} className="shrink-0 text-xs font-black text-cyan-800 hover:underline">
                              {open ? "Daha az" : "Tümünü gör (" + items.length + ")"}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">{(open ? items : items.slice(0, 3)).map(tile)}</div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {name === "groups" && (
            <>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">İlgi alanların neler? ✨</h2>
              <p className="mt-1 text-sm text-slate-500">Gruplara katıl; akışında sevdiğin konulardan paylaşımlar görürsün.</p>
              <div className="mt-3 grid gap-2">
                {groupList.map((group) => {
                  const on = joined.includes(group.dbId);
                  return (
                    <button key={group.dbId} type="button" onClick={() => toggle(joined, setJoined, group.dbId)} aria-pressed={on} className={"flex items-center gap-3 rounded-2xl border p-2.5 text-left transition " + (on ? "border-cyan-700 bg-cyan-50/60" : "border-slate-200 hover:bg-slate-50")}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-xl">
                        {group.cover ? <img src={group.cover} alt="" className="h-full w-full object-cover" /> : group.emoji || "💧"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-900">{group.name}</span>
                        <span className="line-clamp-1 text-xs text-slate-500">{group.description}</span>
                      </span>
                      <span className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-black " + (on ? "bg-cyan-700 text-white" : "bg-slate-900 text-white")}>{on ? "Katıldın" : "Katıl"}</span>
                    </button>
                  );
                })}
                {groupList.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Şu an önerecek grup yok.</p>}
              </div>
            </>
          )}

          {name === "about" && (
            <>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Biraz kendinden bahset 💬</h2>
              <p className="mt-1 text-sm text-slate-500">Hangi türleri besliyorsun, kaç tankın var, hobiye nasıl başladın? Yazdıkların profilindeki “Hakkında” kısmında görünür.</p>
              <div className="mt-4 text-xs font-black text-slate-500">Kaç tankın var?</div>
              <div className="mt-1.5 flex gap-2">
                {TANKS.map((value) => (
                  <button key={value} type="button" onClick={() => setTanks(tanks === value ? "" : value)} aria-pressed={tanks === value} className={"h-10 flex-1 rounded-full text-sm font-black transition " + (tanks === value ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>{value}</button>
                ))}
              </div>
              <label className="mt-4 block text-xs font-black text-slate-500">Hakkında
                <textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 480))} rows={4} placeholder="Ör. 3 yıldır bitkili tanklarla uğraşıyorum, şu an 60 litrelik tankta neon tetra ve karides besliyorum." className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-normal text-slate-900 outline-none focus:border-cyan-700 focus:bg-white" />
                <span className="block text-right font-normal text-slate-400">{bio.length} / 480</span>
              </label>
              <label className="mt-2 block text-xs font-black text-slate-500">Şehrin
                <span className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <select value={city} onChange={(event) => setCity(event.target.value)} className="w-full bg-transparent py-2.5 text-sm font-normal text-slate-900 outline-none">
                    <option value="">Şehir seç</option>
                    {TR_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </span>
                <span className="mt-1 block font-normal text-slate-400">Sana yakın hobicileri ve ilanları daha kolay bulursun; elden teslim, takas ve buluşmalar kolaylaşır.</span>
              </label>
            </>
          )}

          {name === "socials" && (
            <>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Bağlantılarını genişlet 🔗</h2>
              <p className="mt-1 text-sm text-slate-500">İstersen sosyal medya hesaplarını ekle; profilinde görünür, hobiciler seni oradan da takip edebilir. Kullanıcı adı ya da bağlantı yazabilirsin.</p>
              <div className="mt-3 grid gap-2">
                {SOCIALS.map(([key, label, placeholder]) => (
                  <label key={key} className="grid gap-1 text-xs font-black text-slate-500">{label}
                    <input value={socials[key] || ""} onChange={(event) => setSocials((prev) => ({ ...prev, [key]: event.target.value }))} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700 focus:bg-white" />
                  </label>
                ))}
              </div>
            </>
          )}

          {name === "done" && (
            <div className="py-8 text-center">
              <div className="text-6xl" aria-hidden="true">🐠</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Hazırsın!</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">Profilin hazır. Tankının bir fotoğrafını paylaşarak başlayabilirsin.</p>
              <p className="mt-4 text-lg font-black text-cyan-800">Keyifli hobiler 💫</p>
            </div>
          )}

          {error && <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        </div>

        {/* Alt düğmeler */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          {name === "terms" && (
            <>
              <button type="button" onClick={() => auth.signOut()} disabled={busy} className="flex-1 rounded-full px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100">Vazgeç, çıkış yap</button>
              <button type="button" onClick={acceptTerms} disabled={busy} className="flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-60">
                {busy && <Loader2 size={15} className="animate-spin" />} Kabul et ve devam et
              </button>
            </>
          )}
          {name === "species" && (
            <>
              <span className="flex-1 text-xs font-bold text-slate-400">{keep.length + fav.length > 0 ? keep.length + " besliyor · " + fav.length + " favori" : "İstediğin kadar seç"}</span>
              <button type="button" onClick={() => go("groups")} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">{keep.length + fav.length ? "Devam" : "Geç"}</button>
            </>
          )}
          {name === "groups" && (
            <>
              <span className="flex-1 text-xs font-bold text-slate-400">{joined.length ? joined.length + " grup seçildi" : ""}</span>
              <button type="button" onClick={goAbout} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">{joined.length ? "Devam" : "Geç"}</button>
            </>
          )}
          {name === "about" && (
            <>
              <span className="flex-1" />
              <button type="button" onClick={() => go("socials")} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Devam</button>
            </>
          )}
          {name === "socials" && (
            <>
              <button type="button" onClick={() => saveAll(false)} disabled={busy} className="flex-1 rounded-full px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100">Bu adımı geç</button>
              <button type="button" onClick={() => saveAll(true)} disabled={busy} className="flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-60">
                {busy && <Loader2 size={15} className="animate-spin" />} Bitir
              </button>
            </>
          )}
          {name === "done" && (
            <button type="button" onClick={() => onClose(true)} className="flex-1 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white hover:bg-cyan-900">Keşfetmeye başla</button>
          )}
        </div>
      </div>
      {legalOpen && (
        <LegalModal
          docKey={legalOpen}
          mustRead
          onClose={() => setLegalOpen(null)}
          onAccept={() => {
            const now = new Date().toISOString();
            if (legalOpen === "terms") setTermsAt(now);
            else setKvkkAt(now);
            setLegalOpen(null);
            setError("");
          }}
        />
      )}
    </div>,
    document.body
  );
}
