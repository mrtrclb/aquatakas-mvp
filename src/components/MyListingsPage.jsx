import React from "react";
import {
  Edit3,
  Pin,
  Trash2,
  Eye
} from "lucide-react";

export default function MyListingsPage({
  listings,
  onOpen,
  onRemove,
  onPromote
}) {
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
    </div>
  );
}
