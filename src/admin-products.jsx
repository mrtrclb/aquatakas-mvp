// Yönetim paneli — Ürünler: başvurular, markayı sahiplenme, video önerileri, marka/ürün düzenleme, ücretler.
import React, { useMemo, useRef, useState } from "react";
import { Check, ExternalLink, FileText, Loader2, Plus, Search, Upload, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";
import { slugifyTr, youtubeId } from "./lib/products";
import { Badge, Btn, Card, Empty, LoadState, PAYMENT_LABELS, Person, Section, Tabs, fmtDate, must, profilesByIds, useAdmin, useLoad } from "./admin.jsx";

const STATUS = { pending: ["Onay bekliyor", "amber"], published: ["Yayında", "emerald"], rejected: ["Reddedildi", "rose"], hidden: ["Gizli", "slate"], approved: ["Onaylandı", "emerald"] };
const StatusBadge = ({ status }) => {
  const [label, tone] = STATUS[status] || [status, "slate"];
  return <Badge tone={tone}>{label}</Badge>;
};
const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700";
const tl = (value) => Number(value || 0).toLocaleString("tr-TR") + " ₺";

export function ProductsAdminSection() {
  const { act, ask, auth } = useAdmin();
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null); // { kind: "brand"|"product", row }
  const state = useLoad(async () => {
    const [brands, products, claims, videos, categories, prices] = await Promise.all([
      must(supabase.from("admin_brands").select("*").order("name")),
      must(supabase.from("admin_products").select("*").order("name")),
      must(supabase.from("brand_claims").select("*").order("created_at", { ascending: false }).limit(200)),
      must(supabase.from("product_video_suggestions").select("*").order("created_at", { ascending: false }).limit(200)),
      must(supabase.from("product_categories").select("*").order("position")),
      must(supabase.from("site_settings").select("value").eq("key", "catalog_prices").maybeSingle())
    ]);
    const profiles = await profilesByIds([...brands.map((r) => r.submitted_by), ...brands.map((r) => r.owner_id), ...products.map((r) => r.submitted_by), ...claims.map((r) => r.user_id), ...videos.map((r) => r.user_id)]);
    return {
      brands,
      products,
      claims,
      videos,
      categories,
      prices: (prices && prices.value) || { brand: 0, product: 0 },
      profiles,
      brandById: Object.fromEntries(brands.map((r) => [r.id, r])),
      productById: Object.fromEntries(products.map((r) => [r.id, r])),
      catName: Object.fromEntries(categories.map((r) => [r.id, r.name]))
    };
  }, []);

  async function reviewSubmission(kind, row, approve) {
    const reason = approve
      ? await ask({ title: (kind === "brand" ? "Markayı" : "Ürünü") + " onayla", text: "“" + row.name + "” yayına alınır ve başvurana bildirim gider." + (kind === "brand" ? " Markayı ekleyen üye marka hesabı (resmî yanıt verebilen) olur." : ""), input: false, confirm: "Onayla" })
      : await ask({ title: "Başvuruyu reddet", text: "Gerekçe üyeye bildirimle iletilir. PRO hakkıyla yapılmışsa hak iade edilir.", presets: ["Zaten mevcut", "Eksik / yanlış bilgi", "Görsel uygun değil", "Akvaryum ürünü değil"], confirm: "Reddet", danger: true });
    if (reason === null) return;
    if (await act(supabase.rpc("review_catalog_submission", { p_kind: kind, p_id: row.id, p_approve: approve, p_reason: approve ? null : reason || null }), approve ? "Onaylandı" : "Reddedildi")) state.reload();
  }
  async function reviewClaim(row, approve) {
    const reason = approve
      ? await ask({ title: "Sahiplenmeyi onayla", text: "Üye bu markanın resmî hesabı olur; değerlendirmelere “Resmî yanıt” rozetiyle yanıt verebilir.", input: false, confirm: "Onayla" })
      : await ask({ title: "Sahiplenmeyi reddet", presets: ["Belgeler yetersiz", "Yetki doğrulanamadı", "Marka zaten sahiplenilmiş"], confirm: "Reddet", danger: true });
    if (reason === null) return;
    if (await act(supabase.rpc("review_brand_claim", { p_id: row.id, p_approve: approve, p_reason: approve ? null : reason || null }), approve ? "Marka hesabı onaylandı" : "Başvuru reddedildi")) state.reload();
  }
  async function reviewVideo(row, approve) {
    if (await act(supabase.rpc("review_video_suggestion", { p_id: row.id, p_approve: approve }), approve ? "Video ürüne eklendi" : "Öneri reddedildi")) state.reload();
  }
  async function openDoc(path) {
    const { data, error } = await supabase.storage.from("brand-claims").createSignedUrl(path, 600);
    if (error) return alert(trError(error));
    window.open(data.signedUrl, "_blank", "noopener");
  }
  async function setStatus(kind, row, status) {
    if (await act(supabase.from(kind === "brand" ? "brands" : "products").update({ status }).eq("id", row.id), status === "published" ? "Yayına alındı" : "Gizlendi")) state.reload();
  }
  async function removeOwner(row) {
    const ok = await ask({ title: "Marka hesabını kaldır", text: row.name + " markasının resmî hesap bağlantısı kaldırılır.", input: false, confirm: "Kaldır", danger: true });
    if (ok === null) return;
    if (await act(supabase.from("brands").update({ owner_id: null }).eq("id", row.id), "Marka hesabı kaldırıldı")) state.reload();
  }

  return (
    <Section
      title="Ürünler"
      subtitle="Markalar, ürünler, üye başvuruları ve marka hesapları."
      actions={
        <>
          <Btn onClick={() => setEditor({ kind: "brand", row: null })}><Plus size={14} /> Marka</Btn>
          <Btn tone="primary" onClick={() => setEditor({ kind: "product", row: null })}><Plus size={14} /> Ürün</Btn>
        </>
      }
    >
      <LoadState state={state}>
        {(data) => {
          const pending = [...data.brands.filter((r) => r.status === "pending").map((r) => ["brand", r]), ...data.products.filter((r) => r.status === "pending").map((r) => ["product", r])];
          const claims = data.claims.filter((r) => r.status === "pending");
          const videos = data.videos.filter((r) => r.status === "pending");
          const q = query.trim().toLocaleLowerCase("tr");
          const match = (text) => !q || String(text || "").toLocaleLowerCase("tr").includes(q);
          return (
            <>
              <Tabs
                value={tab}
                onChange={setTab}
                items={[["pending", "Başvurular", pending.length], ["claims", "Sahiplenme", claims.length], ["videos", "Video önerileri", videos.length], ["brands", "Markalar (" + data.brands.length + ")"], ["products", "Ürünler (" + data.products.length + ")"], ["prices", "Ücretler"]]}
              />

              {(tab === "brands" || tab === "products") && (
                <div className="mb-3 flex max-w-sm items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <Search size={15} className="text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara" className="w-full bg-transparent text-sm outline-none" />
                </div>
              )}

              {tab === "pending" && (!pending.length ? <Empty>Onay bekleyen marka ya da ürün başvurusu yok.</Empty> : (
                <Card className="divide-y divide-slate-100 p-0">
                  {pending.map(([kind, row]) => {
                    const brand = kind === "product" ? data.brandById[row.brand_id] : null;
                    const images = kind === "brand" ? [row.logo_url].filter(Boolean) : row.images || [];
                    return (
                      <div key={kind + row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="flex gap-2">{images.slice(0, 3).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-16 w-16 rounded-xl bg-white object-contain ring-1 ring-slate-200" /></a>)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={kind === "brand" ? "violet" : "cyan"}>{kind === "brand" ? "Marka" : "Ürün"}</Badge>
                            <span className="font-black">{row.name}</span>
                            {brand && <span className="text-sm text-slate-500">{brand.name}{brand.status === "pending" ? " (marka da onay bekliyor)" : ""}</span>}
                            {kind === "product" && <Badge>{data.catName[row.category_id] || row.category_id}</Badge>}
                          </div>
                          {row.model_code && <p className="text-xs text-slate-500">Model: {row.model_code}</p>}
                          {row.website && <a href={/^https?:/.test(row.website) ? row.website : "https://" + row.website} target="_blank" rel="noreferrer noopener" className="text-xs font-bold text-cyan-800 hover:underline">{row.website}</a>}
                          <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-slate-600">{row.description}</p>
                          {Array.isArray(row.facts) && row.facts.length > 0 && <p className="mt-1 text-xs text-slate-500">{row.facts.map((f) => f[0] + ": " + f[1]).join(" · ")}</p>}
                          {row.distributor && Object.keys(row.distributor).length > 0 && <p className="mt-1 text-xs text-slate-500">Distribütör: {Object.values(row.distributor).join(" · ")}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <Person profile={data.profiles[row.submitted_by]} />
                            <span>{fmtDate(row.created_at)}</span>
                            <Badge tone={row.payment_status === "pro_free" ? "violet" : "slate"}>{PAYMENT_LABELS[row.payment_status] || row.payment_status || "—"}{row.price ? " · " + tl(row.price) : ""}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Btn small onClick={() => setEditor({ kind, row })}>Düzenle</Btn>
                          <Btn small tone="success" onClick={() => reviewSubmission(kind, row, true)}><Check size={13} /> Onayla</Btn>
                          <Btn small tone="ghostDanger" onClick={() => reviewSubmission(kind, row, false)}><X size={13} /> Reddet</Btn>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              ))}

              {tab === "claims" && (!data.claims.length ? <Empty>Henüz markayı sahiplenme başvurusu yok.</Empty> : (
                <Card className="divide-y divide-slate-100 p-0">
                  {data.claims.map((row) => {
                    const brand = data.brandById[row.brand_id];
                    return (
                      <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black">{brand ? brand.name : "Silinmiş marka"}</span>
                            <StatusBadge status={row.status} />
                            {brand && brand.owner_id && row.status === "pending" && <Badge tone="rose">Markanın zaten hesabı var</Badge>}
                          </div>
                          <p className="text-sm text-slate-700">{row.company} · {row.contact_name}{row.title ? " (" + row.title + ")" : ""}</p>
                          <p className="text-xs text-slate-500">{row.email}{row.phone ? " · " + row.phone : ""}</p>
                          {row.note && <p className="mt-1 text-sm text-slate-600">{row.note}</p>}
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {(row.documents || []).map((path, i) => (
                              <button key={path} onClick={() => openDoc(path)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"><FileText size={12} /> Belge {i + 1}</button>
                            ))}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <Person profile={data.profiles[row.user_id]} />
                            <span>{fmtDate(row.created_at)}</span>
                            {row.reject_reason && <span>Gerekçe: {row.reject_reason}</span>}
                          </div>
                        </div>
                        {row.status === "pending" && (
                          <div className="flex gap-2">
                            <Btn small tone="success" onClick={() => reviewClaim(row, true)}><Check size={13} /> Onayla</Btn>
                            <Btn small tone="ghostDanger" onClick={() => reviewClaim(row, false)}><X size={13} /> Reddet</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              ))}

              {tab === "videos" && (!data.videos.length ? <Empty>Henüz video önerisi yok.</Empty> : (
                <Card className="divide-y divide-slate-100 p-0">
                  {data.videos.map((row) => {
                    const product = data.productById[row.product_id];
                    return (
                      <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <a href={"https://www.youtube.com/watch?v=" + row.youtube_id} target="_blank" rel="noreferrer noopener"><img src={"https://i.ytimg.com/vi/" + row.youtube_id + "/mqdefault.jpg"} alt="" className="h-16 w-28 rounded-xl object-cover" /></a>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="font-black">{product ? product.name : "Silinmiş ürün"}</span><StatusBadge status={row.status} /></div>
                          {row.title && <p className="text-sm text-slate-600">{row.title}</p>}
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500"><Person profile={data.profiles[row.user_id]} /><span>{fmtDate(row.created_at)}</span></div>
                        </div>
                        {row.status === "pending" && (
                          <div className="flex gap-2">
                            <Btn small tone="success" onClick={() => reviewVideo(row, true)}><Check size={13} /> Ekle</Btn>
                            <Btn small tone="ghostDanger" onClick={() => reviewVideo(row, false)}><X size={13} /> Reddet</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              ))}

              {tab === "brands" && (
                <Card className="divide-y divide-slate-100 p-0">
                  {data.brands.filter((r) => match(r.name)).map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      {row.logo_url ? <img src={row.logo_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain ring-1 ring-slate-200" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-xs font-black">{row.name.slice(0, 2)}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-black">{row.name}</span><StatusBadge status={row.status} />{row.owner_id && <Badge tone="cyan">Marka hesabı: @{(data.profiles[row.owner_id] || {}).username || "?"}</Badge>}</div>
                        <p className="text-xs text-slate-500">{data.products.filter((p) => p.brand_id === row.id).length} ürün{row.country ? " · " + row.country : ""}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a href={"/marka/" + row.slug} target="_blank" rel="noreferrer" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Sayfayı aç"><ExternalLink size={15} /></a>
                        {row.owner_id && <Btn small onClick={() => removeOwner(row)}>Hesabı kaldır</Btn>}
                        {row.status === "published" ? <Btn small onClick={() => setStatus("brand", row, "hidden")}>Gizle</Btn> : row.status !== "pending" && <Btn small onClick={() => setStatus("brand", row, "published")}>Yayına al</Btn>}
                        <Btn small tone="primary" onClick={() => setEditor({ kind: "brand", row })}>Düzenle</Btn>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {tab === "products" && (
                <Card className="divide-y divide-slate-100 p-0">
                  {data.products.filter((r) => match(r.name + " " + (r.model_code || "") + " " + ((data.brandById[r.brand_id] || {}).name || ""))).map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      {row.images && row.images[0] ? <img src={row.images[0]} alt="" className="h-10 w-10 rounded-lg bg-white object-contain ring-1 ring-slate-200" /> : <span className="h-10 w-10 rounded-lg bg-slate-100" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-black">{row.name}</span><StatusBadge status={row.status} /></div>
                        <p className="text-xs text-slate-500">{(data.brandById[row.brand_id] || {}).name} · {data.catName[row.category_id]} · {(row.images || []).length} görsel · {(row.videos || []).length} video · ⭐ {Number(row.rating_avg).toLocaleString("tr-TR")} ({row.rating_count})</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a href={"/urun/" + row.slug} target="_blank" rel="noreferrer" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Sayfayı aç"><ExternalLink size={15} /></a>
                        {row.status === "published" ? <Btn small onClick={() => setStatus("product", row, "hidden")}>Gizle</Btn> : row.status !== "pending" && <Btn small onClick={() => setStatus("product", row, "published")}>Yayına al</Btn>}
                        <Btn small tone="primary" onClick={() => setEditor({ kind: "product", row })}>Düzenle</Btn>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {tab === "prices" && <PricesCard prices={data.prices} onSaved={state.reload} />}

              {editor && editor.kind === "brand" && <BrandEditor row={editor.row} myId={auth.user && auth.user.id} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); state.reload(); }} />}
              {editor && editor.kind === "product" && <ProductEditor row={editor.row} data={data} myId={auth.user && auth.user.id} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); state.reload(); }} />}
            </>
          );
        }}
      </LoadState>
    </Section>
  );
}

function PricesCard({ prices, onSaved }) {
  const { act } = useAdmin();
  const [brand, setBrand] = useState(prices.brand || 0);
  const [product, setProduct] = useState(prices.product || 0);
  return (
    <Card className="max-w-md">
      <p className="mb-3 text-sm text-slate-500">Üyelerin marka ve ürün ekleme ücreti. 12 aylık PRO alan üyeye 1 marka + 5 ürün ekleme hakkı tanımlanır.</p>
      <label className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">Marka ekleme <span><input type="number" min={0} value={brand} onChange={(e) => setBrand(Number(e.target.value))} className="w-24 rounded-full border border-slate-200 px-3 py-1.5" /> ₺</span></label>
      <label className="mb-3 flex items-center justify-between gap-3 text-sm font-bold">Ürün ekleme <span><input type="number" min={0} value={product} onChange={(e) => setProduct(Number(e.target.value))} className="w-24 rounded-full border border-slate-200 px-3 py-1.5" /> ₺</span></label>
      <Btn tone="primary" small onClick={async () => { if (await act(supabase.from("site_settings").upsert({ key: "catalog_prices", value: { brand, product } }), "Ücretler kaydedildi")) onSaved(); }}>Kaydet</Btn>
    </Card>
  );
}

function EditorShell({ title, onClose, children, onSave, busy, error }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[5vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-[26px] bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Kapat"><X size={18} /></button></div>
        {children}
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2"><Btn onClick={onClose}>Vazgeç</Btn><Btn tone="primary" disabled={busy} onClick={onSave}>{busy && <Loader2 size={14} className="animate-spin" />} Kaydet</Btn></div>
      </div>
    </div>
  );
}

const F = ({ label, children, wide }) => (
  <label className={"block " + (wide ? "sm:col-span-2" : "")}>
    <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
    {children}
  </label>
);

async function uploadAdminImages(myId, files) {
  const urls = [];
  for (const file of files) {
    const blob = await shrinkImage(file, 1600);
    const type = blob.type || "image/jpeg";
    const path = myId + "/catalog/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const { error } = await supabase.storage.from("community-media").upload(path, blob, { contentType: type });
    if (error) throw error;
    urls.push(supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

function UploadButton({ myId, onUploaded, multiple = true }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" disabled={busy} onClick={() => input.current && input.current.click()} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Görsel yükle
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;
        setBusy(true);
        try {
          onUploaded(await uploadAdminImages(myId, files));
        } catch (err) {
          alert(trError(err));
        }
        setBusy(false);
      }} />
    </>
  );
}

function BrandEditor({ row, myId, onClose, onSaved }) {
  const { act } = useAdmin();
  const d = (row && row.distributor) || {};
  const [f, setF] = useState({
    name: row ? row.name : "",
    slug: row ? row.slug : "",
    logo_url: row ? row.logo_url || "" : "",
    website: row ? row.website || "" : "",
    country: row ? row.country || "" : "",
    description: row ? row.description || "" : "",
    keywords: row ? (row.keywords || []).join(", ") : "",
    status: row ? row.status : "published",
    dname: d.name || "", dweb: d.website || "", dphone: d.phone || "", demail: d.email || "", daddr: d.address || ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (f.name.trim().length < 2) return setError("Marka adı gerekli.");
    setBusy(true);
    setError("");
    const distributor = Object.fromEntries([["name", f.dname], ["website", f.dweb], ["phone", f.dphone], ["email", f.demail], ["address", f.daddr]].filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
    const payload = {
      name: f.name.trim(),
      slug: (f.slug.trim() || slugifyTr(f.name)).toLowerCase(),
      logo_url: f.logo_url.trim() || null,
      website: f.website.trim() || null,
      country: f.country.trim() || null,
      description: f.description.trim(),
      keywords: f.keywords.split(",").map((w) => w.trim()).filter(Boolean),
      status: f.status,
      distributor
    };
    const ok = await act(row ? supabase.from("brands").update(payload).eq("id", row.id) : supabase.from("brands").insert(payload), "Marka kaydedildi");
    setBusy(false);
    if (ok) onSaved();
  }

  return (
    <EditorShell title={row ? "Markayı düzenle" : "Yeni marka"} onClose={onClose} onSave={save} busy={busy} error={error}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Ad"><input value={f.name} onChange={set("name")} className={INPUT} /></F>
        <F label="Adres adı (slug)"><input value={f.slug} onChange={set("slug")} placeholder={slugifyTr(f.name)} className={INPUT} /></F>
        <F label="Logo adresi" wide>
          <div className="flex items-center gap-2">
            {f.logo_url && <img src={f.logo_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain ring-1 ring-slate-200" />}
            <input value={f.logo_url} onChange={set("logo_url")} className={INPUT} />
            <UploadButton myId={myId} multiple={false} onUploaded={(urls) => setF((prev) => ({ ...prev, logo_url: urls[0] }))} />
          </div>
        </F>
        <F label="Web sitesi"><input value={f.website} onChange={set("website")} className={INPUT} /></F>
        <F label="Ülke"><input value={f.country} onChange={set("country")} className={INPUT} /></F>
        <F label="Tanıtım" wide><textarea value={f.description} onChange={set("description")} rows={4} className={INPUT} /></F>
        <F label="Anahtar kelimeler (virgülle)" wide><input value={f.keywords} onChange={set("keywords")} className={INPUT} /></F>
        <F label="Distribütör firma"><input value={f.dname} onChange={set("dname")} className={INPUT} /></F>
        <F label="Distribütör web"><input value={f.dweb} onChange={set("dweb")} className={INPUT} /></F>
        <F label="Distribütör telefon"><input value={f.dphone} onChange={set("dphone")} className={INPUT} /></F>
        <F label="Distribütör e-posta"><input value={f.demail} onChange={set("demail")} className={INPUT} /></F>
        <F label="Distribütör adres" wide><input value={f.daddr} onChange={set("daddr")} className={INPUT} /></F>
        <F label="Durum">
          <select value={f.status} onChange={set("status")} className={INPUT}>
            <option value="published">Yayında</option><option value="hidden">Gizli</option><option value="pending">Onay bekliyor</option><option value="rejected">Reddedildi</option>
          </select>
        </F>
      </div>
    </EditorShell>
  );
}

function ProductEditor({ row, data, myId, onClose, onSaved }) {
  const { act } = useAdmin();
  const [f, setF] = useState({
    brand_id: row ? String(row.brand_id) : "",
    category_id: row ? row.category_id : "",
    name: row ? row.name : "",
    slug: row ? row.slug : "",
    model_code: row ? row.model_code || "" : "",
    description: row ? row.description || "" : "",
    facts: row && Array.isArray(row.facts) ? row.facts.map((p) => p[0] + ": " + p[1]).join("\n") : "",
    keywords: row ? (row.keywords || []).join(", ") : "",
    images: row ? (row.images || []).join("\n") : "",
    videos: row && Array.isArray(row.videos) ? row.videos.map((v) => "https://youtu.be/" + v.id + (v.title ? " | " + v.title : "")).join("\n") : "",
    status: row ? row.status : "published"
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const brand = data.brandById[Number(f.brand_id)];
  const imageList = useMemo(() => f.images.split("\n").map((s) => s.trim()).filter(Boolean), [f.images]);

  async function save() {
    if (!f.brand_id || !f.category_id || f.name.trim().length < 2) return setError("Marka, kategori ve ad gerekli.");
    const videos = [];
    for (const line of f.videos.split("\n").map((s) => s.trim()).filter(Boolean)) {
      const [link, ...rest] = line.split("|");
      const id = youtubeId(link.trim());
      if (!id) return setError("Geçersiz YouTube bağlantısı: " + link);
      videos.push({ id, title: rest.join("|").trim() });
    }
    setBusy(true);
    setError("");
    const payload = {
      brand_id: Number(f.brand_id),
      category_id: f.category_id,
      name: f.name.trim(),
      slug: (f.slug.trim() || slugifyTr((brand ? brand.name + " " : "") + f.name)).toLowerCase(),
      model_code: f.model_code.trim() || null,
      description: f.description.trim(),
      facts: f.facts.split("\n").map((l) => l.split(":")).filter((p) => p.length >= 2 && p[0].trim()).map((p) => [p[0].trim(), p.slice(1).join(":").trim()]),
      keywords: f.keywords.split(",").map((w) => w.trim()).filter(Boolean),
      images: imageList,
      videos,
      status: f.status
    };
    const ok = await act(row ? supabase.from("products").update(payload).eq("id", row.id) : supabase.from("products").insert(payload), "Ürün kaydedildi");
    setBusy(false);
    if (ok) onSaved();
  }

  return (
    <EditorShell title={row ? "Ürünü düzenle" : "Yeni ürün"} onClose={onClose} onSave={save} busy={busy} error={error}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Marka">
          <select value={f.brand_id} onChange={set("brand_id")} className={INPUT}>
            <option value="">Seç</option>
            {data.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </F>
        <F label="Kategori">
          <select value={f.category_id} onChange={set("category_id")} className={INPUT}>
            <option value="">Seç</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </F>
        <F label="Ad"><input value={f.name} onChange={set("name")} className={INPUT} /></F>
        <F label="Model kodu"><input value={f.model_code} onChange={set("model_code")} className={INPUT} /></F>
        <F label="Adres adı (slug)" wide><input value={f.slug} onChange={set("slug")} placeholder={slugifyTr((brand ? brand.name + " " : "") + f.name)} className={INPUT} /></F>
        <F label="Açıklama" wide><textarea value={f.description} onChange={set("description")} rows={5} className={INPUT} /></F>
        <F label="Künye (her satır “Etiket: Değer”)" wide><textarea value={f.facts} onChange={set("facts")} rows={4} className={INPUT} /></F>
        <F label="Anahtar kelimeler (virgülle; paylaşımlarda tanıma için)" wide><input value={f.keywords} onChange={set("keywords")} className={INPUT} /></F>
        <F label="Görseller (her satıra bir adres; ilk görsel kapak)" wide>
          <textarea value={f.images} onChange={set("images")} rows={3} className={INPUT} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {imageList.map((url) => <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg bg-white object-contain ring-1 ring-slate-200" />)}
            <UploadButton myId={myId} onUploaded={(urls) => setF((prev) => ({ ...prev, images: [prev.images.trim(), ...urls].filter(Boolean).join("\n") }))} />
          </div>
        </F>
        <F label="Videolar (her satıra YouTube bağlantısı | başlık)" wide><textarea value={f.videos} onChange={set("videos")} rows={3} className={INPUT} /></F>
        <F label="Durum">
          <select value={f.status} onChange={set("status")} className={INPUT}>
            <option value="published">Yayında</option><option value="hidden">Gizli</option><option value="pending">Onay bekliyor</option><option value="rejected">Reddedildi</option>
          </select>
        </F>
      </div>
    </EditorShell>
  );
}
