import React, { useMemo, useState } from "react";
import {
  Edit3,
  Pin,
  Trash2,
  Eye,
  X,
  Send,
  RotateCcw,
  Bookmark,
  BookmarkX,
  Upload,
  ImagePlus
} from "lucide-react";

function EditListingModal({ listing, mode = "edit", onClose }) {
  if (!listing) return null;

  const isExpired = mode === "republish";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight">
              {isExpired ? "İlanı güncelle ve tekrar yayımla" : "İlanı düzenle"}
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isExpired
                ? "Süresi dolmuş ilanını güncelleyip yeniden inceleme için gönderebilirsin."
                : "İlan bilgilerinde değişiklik yapıp inceleme için tekrar gönderebilirsin."}
              {" "}Onaylanana kadar mevcut yayın bilgileri korunabilir.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-96px)] overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div>
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <img
                  src={listing.images?.[0]}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </div>

              <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                <ImagePlus size={16} /> Görselleri güncelle
              </button>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slot) => {
                  const image = listing.images?.[slot];

                  return (
                    <div
                      key={slot}
                      className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-300"
                    >
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Upload size={15} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                Görsel, fiyat, açıklama veya kategori değişiklikleri yeniden incelemeye gönderilir.
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">
                    İlan tipi
                  </span>

                  <select
                    defaultValue={listing.type}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                  >
                    <option>Satıyorum</option>
                    <option>Takas</option>
                    <option>Ücretsiz / Sahiplendirme</option>
                    <option>Arıyorum</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">
                    Kategori
                  </span>

                  <select
                    defaultValue={listing.category}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                  >
                    <option>Canlı</option>
                    <option>Bitki</option>
                    <option>Yem</option>
                    <option>Kimyasal</option>
                    <option>Akvaryum</option>
                    <option>Ekipman</option>
                    <option>Dekor</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">
                  İlan başlığı
                </span>

                <input
                  defaultValue={listing.title}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">
                  Açıklama
                </span>

                <textarea
                  rows={5}
                  defaultValue={listing.description}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">
                    Fiyat / teklif
                  </span>

                  <input
                    defaultValue={listing.price}
                    placeholder="Örn. 750 TL, Takas, Teklif ver"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">
                    Konum
                  </span>

                  <input
                    defaultValue={`${listing.city} / ${listing.district}`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                  />
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">
                  Etiketler
                </span>

                <input
                  defaultValue={(listing.tags || []).join(", ")}
                  placeholder="Örn. kendi üretimim, yavru, gönderim yapılır"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
                />
              </label>

              <div className="rounded-2xl bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900">
                Bu MVP akışında değişiklikler temsilidir. Canlı sürümde bu işlem moderasyon kuyruğuna düşer; onaylanınca yeni bilgiler yayına geçer.
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Vazgeç
                </button>

                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white hover:bg-cyan-900"
                >
                  <Send size={16} /> İnceleme için gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingManageCard({
  item,
  variant = "active",
  onOpen,
  onEdit,
  onRemove,
  onPromote,
  onDelete,
  onUnsave
}) {
  const dateLabel = item.date?.split("-").reverse().join(".");

  return (
    <article className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-3 sm:grid-cols-[112px_1fr]">
      <img
        src={item.images?.[0]}
        alt=""
        className="h-28 w-28 rounded-2xl object-cover"
      />

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {variant === "active" && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
              Yayında
            </span>
          )}

          {variant === "expired" && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              Süresi doldu
            </span>
          )}

          {variant === "saved" && (
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800">
              Kaydedildi
            </span>
          )}

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
            {item.type}
          </span>

          <span className="text-xs font-black text-slate-500">
            {dateLabel}
          </span>
        </div>

        <h3 className="line-clamp-1 text-lg font-black text-slate-950">
          {item.title}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
          {item.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onOpen(item)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            <Eye size={14} /> Görüntüle
          </button>

          {variant === "active" && (
            <>
              <button
                onClick={() => onEdit(item, "edit")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <Edit3 size={14} /> Düzenle
              </button>

              <button
                onClick={() => onPromote(item)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100"
              >
                <Pin size={14} /> Öne çıkar
              </button>

              <button
                onClick={() => onRemove(item)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
              >
                <Trash2 size={14} /> Yayından kaldır
              </button>
            </>
          )}

          {variant === "expired" && (
            <>
              <button
                onClick={() => onEdit(item, "republish")}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100"
              >
                <RotateCcw size={14} /> Güncelle ve tekrar yayımla
              </button>

              <button
                onClick={() => onDelete(item)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
              >
                <Trash2 size={14} /> Komple sil
              </button>
            </>
          )}

          {variant === "saved" && (
            <button
              onClick={() => onUnsave(item)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
            >
              <BookmarkX size={14} /> Kaydedilenlerden kaldır
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="text-lg font-black text-slate-800">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

export default function MyListingsPage({
  listings,
  onOpen,
  onRemove,
  onPromote
}) {
  const [tab, setTab] = useState("active");
  const [editingListing, setEditingListing] = useState(null);
  const [editingMode, setEditingMode] = useState("edit");

  const expiredListings = useMemo(() => {
    return listings.slice(0, 2).map((item, index) => ({
      ...item,
      id: "expired-" + item.id,
      date: index === 0 ? "2026-03-18" : "2026-03-05"
    }));
  }, [listings]);

  const savedListings = useMemo(() => {
    return listings.slice(-2).map((item) => ({
      ...item,
      id: "saved-" + item.id
    }));
  }, [listings]);

  function openEditor(item, mode) {
    setEditingMode(mode);
    setEditingListing(item);
  }

  const tabs = [
    ["active", "Yayındaki ilanlarım", listings.length],
    ["expired", "Süresi dolmuş ilanlar", expiredListings.length],
    ["saved", "Kaydettiğim ilanlar", savedListings.length]
  ];

  const currentList =
    tab === "expired" ? expiredListings : tab === "saved" ? savedListings : listings;

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">İlanlarım</h2>

        <p className="mt-1 text-sm text-slate-500">
          Yayındaki, süresi dolmuş ve kaydettiğin ilanları buradan yönetebilirsin.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-[24px] bg-slate-100 p-1">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              "rounded-full px-4 py-2 text-xs font-black transition " +
              (tab === key
                ? "bg-cyan-950 text-white"
                : "text-slate-600 hover:bg-white")
            }
          >
            {label}
            <span className={tab === key ? "ml-2 text-cyan-100" : "ml-2 text-slate-400"}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {currentList.length > 0 ? (
          currentList.map((item) => (
            <ListingManageCard
              key={item.id}
              item={item}
              variant={tab}
              onOpen={onOpen}
              onEdit={openEditor}
              onRemove={onRemove}
              onPromote={onPromote}
              onDelete={() => {}}
              onUnsave={() => {}}
            />
          ))
        ) : tab === "active" ? (
          <EmptyState
            title="Yayında ilanın yok"
            text="Yeni bir ilan eklediğinde burada görünecek."
          />
        ) : tab === "expired" ? (
          <EmptyState
            title="Süresi dolmuş ilanın yok"
            text="30 günlük yayın süresi biten ilanlar burada listelenir."
          />
        ) : (
          <EmptyState
            title="Kaydettiğin ilan yok"
            text="İlan detayındaki Kaydet butonunu kullandığında ilanlar burada görünecek."
          />
        )}
      </div>

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          mode={editingMode}
          onClose={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}
