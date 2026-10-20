import React, { useState } from "react";
import {
  Edit3,
  Pin,
  Trash2,
  Eye,
  X,
  Send
} from "lucide-react";

function EditListingModal({ listing, onClose }) {
  if (!listing) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight">İlanı düzenle</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              İlan bilgilerinde değişiklik yapıp inceleme için tekrar gönderebilirsin.
              Onaylanana kadar mevcut ilan yayında kalabilir.
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
                  src={listing.images[0]}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </div>

              <button className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                Görselleri güncelle
              </button>

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
                Bu MVP akışında değişiklikler temsilîdir. Canlı sürümde “İnceleme için gönder”
                butonu ilanı moderasyon kuyruğuna alır; onaylanınca yeni bilgiler yayına geçer.
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

export default function MyListingsPage({
  listings,
  onOpen,
  onRemove,
  onPromote
}) {
  const [editingListing, setEditingListing] = useState(null);

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">İlanlarım</h2>

        <p className="mt-1 text-sm text-slate-500">
          Yayındaki ilanlarını görüntüle, düzenle, öne çıkar veya yayından kaldır.
          İlanlar 1 ay sonunda tamamen silinir.
        </p>
      </div>

      <div className="grid gap-3">
        {listings.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-3 sm:grid-cols-[112px_1fr]"
          >
            <img
              src={item.images[0]}
              alt=""
              className="h-28 w-28 rounded-2xl object-cover"
            />

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                  Yayında
                </span>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                  {item.type}
                </span>

                <span className="text-xs font-black text-slate-500">
                  {item.date.split("-").reverse().join(".")}
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

                <button
                  onClick={() => setEditingListing(item)}
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
              </div>
            </div>
          </article>
        ))}
      </div>

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}
