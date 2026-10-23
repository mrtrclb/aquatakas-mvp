import React from "react";
import { BookOpen, ChevronRight, ShieldCheck, Tag } from "lucide-react";
import { categoryById, detectSpecies, speciesBySlug, withoutProtected } from "./species.js";

const FACT_KEYS = { fish: ["Sıcaklık", "pH", "Min. akvaryum", "Huy", "Yetişkin boy"], plant: ["Işık", "CO2", "Sıcaklık", "Büyüme hızı"], coral: ["Işık", "Akıntı", "Sıcaklık", "Tuzluluk (SG)"] };

const SAFETY_TIPS = [
  ["Önce görün, sonra ödeyin", "Mümkünse canlıyı elden, kendi gözünüzle görerek teslim alın. Görmeden kapora ya da tam ödeme göndermeyin."],
  ["Platform içinde yazışın", "Konuşmaları Aquagram mesajlarında tutun; sorun yaşarsanız ekibimiz inceleyebilir."],
  ["Canlıyı kontrol edin", "Beyaz benek, yırtık yüzgeç, hareketsizlik ya da şişkinlik gibi belirtilere bakın; yeni canlıyı karantina tankında bekletin."],
  ["Kargoda dikkat", "Canlı gönderiminde ısı yalıtımı, oksijen ve kısa teslim süresi konuşulmalı. Kargo ücretini ve hasar durumunu önceden netleştirin."],
  ["Doğaya bırakmayın", "Akvaryum canlıları ve bitkileri göl, dere ya da denize bırakılmamalı; istilacı türler ekosisteme zarar verir."],
  ["Şüpheliyse bildirin", "Çok düşük fiyat, acele ettirme ya da platform dışına çekme girişimi görürseniz ilanı ya da kullanıcıyı bildirin."]
];

export function ListingDetailAside({ item, listings, users, priceLabel, onOpenListing, onOpenSpecies, onViewUser }) {
  const slugs = withoutProtected(item.speciesSlugs && item.speciesSlugs.length ? item.speciesSlugs : detectSpecies(item.title + " " + (item.description || ""))).slice(0, 2);
  const species = slugs.map(speciesBySlug).filter(Boolean);
  const others = listings.filter((row) => row.userId === item.userId && row.id !== item.id).slice(0, 4);
  const seller = users[item.userId];

  return (
    <aside className="hidden h-fit border-r border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:block lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto [scrollbar-width:thin]" aria-label="İlanla ilgili bilgiler">
      {species.map((sp) => <SpeciesCareCard key={sp.slug} species={sp} onOpen={() => onOpenSpecies(sp)} />)}

      {others.length > 0 && (
        <section className="mb-4 rounded-[24px] border border-slate-200 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><Tag size={15} /> Satıcının diğer ilanları</h3>
          <div className="grid gap-1">
            {others.map((row) => (
              <button key={row.id} type="button" onClick={() => onOpenListing(row)} className="flex items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-slate-50">
                {row.images && row.images[0] ? <img src={row.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="h-11 w-11 shrink-0 rounded-lg bg-cyan-100" />}
                <span className="min-w-0">
                  <span className="line-clamp-1 text-xs font-black text-slate-900">{row.title}</span>
                  <span className="block text-xs font-black text-cyan-900">{priceLabel(row)}</span>
                </span>
              </button>
            ))}
          </div>
          {seller && listings.filter((row) => row.userId === item.userId).length > 5 && (
            <button type="button" onClick={() => onViewUser(seller)} className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-black text-cyan-800 hover:bg-cyan-50">Tüm ilanları <ChevronRight size={13} /></button>
          )}
        </section>
      )}

      <section className="rounded-[24px] bg-amber-50/70 p-3 ring-1 ring-amber-100">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-amber-900"><ShieldCheck size={15} /> Güvenli alışveriş</h3>
        <ul className="grid gap-2">
          {SAFETY_TIPS.map(([title, text]) => (
            <li key={title} className="text-xs leading-relaxed text-amber-950/80">
              <strong className="block text-amber-950">{title}</strong>
              {text}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function SpeciesCareCard({ species, onOpen }) {
  const category = categoryById(species.category);
  const keys = FACT_KEYS[species.kind] || FACT_KEYS.fish;
  const facts = keys.map((key) => (species.facts || []).find(([label]) => label === key)).filter(Boolean).slice(0, 4);
  const cover = species.images && species.images[0];
  return (
    <section className="mb-4 overflow-hidden rounded-[24px] border border-cyan-100 bg-cyan-50/40">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left hover:bg-cyan-50">
        {cover ? (
          <img src={cover} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className={"grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xl " + category.tone}>{category.emoji}</span>
        )}
        <span className="min-w-0">
          <span className="block text-[12px] font-black uppercase tracking-wide text-cyan-800">Bakım kartı</span>
          <span className="block truncate text-sm font-black text-slate-900">{species.name}</span>
          <span className="block truncate text-xs italic text-slate-500">{species.latin}</span>
        </span>
      </button>
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 border-t border-cyan-100 text-xs">
          {facts.map(([label, value]) => (
            <div key={label} className="border-b border-r border-cyan-100/70 px-3 py-1.5 even:border-r-0">
              <dt className="font-bold text-slate-500">{label}</dt>
              <dd className="font-black text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className={"rounded-full px-2 py-0.5 font-black " + (species.difficulty === "Kolay" ? "bg-emerald-50 text-emerald-700" : species.difficulty === "Zor" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{species.difficulty}</span>
        <button type="button" onClick={onOpen} className="flex items-center gap-1 font-black text-cyan-800 hover:underline"><BookOpen size={12} /> Tüm bilgiler</button>
      </div>
    </section>
  );
}
