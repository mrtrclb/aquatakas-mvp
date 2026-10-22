import React, { Suspense, lazy, useState } from "react";

export const BLOG_URL = "https://blog.aquagram.com.tr";

// Site bilgileri penceresi (yasal metinler dahil) ayrı parça: yalnızca açılınca indirilir
export const SiteInfoModal = lazy(() => import("./site-info.jsx").then((mod) => ({ default: mod.SiteInfoModal })));

export function LazySiteInfoModal(props) {
  return (
    <Suspense fallback={null}>
      <SiteInfoModal {...props} />
    </Suspense>
  );
}

// Mobil menüde site bağlantıları (masaüstünde sağ sütunun altında yer alır)
export function SiteLinks({ className = "" }) {
  const [tab, setTab] = useState(null);
  const links = [["nedir", "Nedir?"], ["contact", "Bize ulaşın"], ["terms", "Kullanım şartları"], ["ads", "Reklam verin"], ["adpolicy", "Reklam politikası"], ["warnings", "Önemli uyarılar"], ["privacy", "Gizlilik politikası"], ["kvkk", "KVKK"]];
  return (
    <div className={"flex flex-wrap gap-1 " + className}>
      {links.map(([key, label]) => (
        <button key={key} type="button" onClick={() => setTab(key)} className="rounded-xl px-2.5 py-1.5 text-[12px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800">{label}</button>
      ))}
      <a href={BLOG_URL} target="_blank" rel="noopener" className="rounded-xl px-2.5 py-1.5 text-[12px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800">Blog</a>
      {tab && <LazySiteInfoModal activeTab={tab} setActiveTab={setTab} onClose={() => setTab(null)} />}
    </div>
  );
}
