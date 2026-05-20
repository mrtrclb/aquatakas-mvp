import React, { useState } from "react";
import {
  MapPin,
  CalendarDays,
  Pin,
  Play
} from "lucide-react";

export default function ListingFeed({
  listings,
  onOpen,
  onProfile,
  users,
  featuredListingIds,
  adPool,
  priceLabel,
  formatDate,
  UserName,
  FeedAdCard
}) {
  const [visibleCount, setVisibleCount] = useState(8);
  const visibleListings = listings.slice(0, visibleCount);
  const feedItems = [];

  visibleListings.forEach((item, index) => {
    feedItems.push({ kind: "listing", item });

    if ((index + 1) % 5 === 0) {
      feedItems.push({
        kind: "ad",
        ad: adPool[Math.floor(index / 5) % adPool.length]
      });
    }
  });

  return (
    <div>
      {feedItems.map((entry, entryIndex) => {
        if (entry.kind === "ad") {
          return <FeedAdCard key={entry.ad.id + "-" + entryIndex} ad={entry.ad} />;
        }

        const item = entry.item;
        const user = users[item.userId];
        const isFeatured = featuredListingIds.includes(item.id);

        return (
          <article
            key={item.id}
            className={
              "relative border-b border-slate-200 p-4 transition " +
              (isFeatured ? "bg-cyan-50/60 hover:bg-cyan-50" : "bg-white hover:bg-slate-50")
            }
          >
            {isFeatured && (
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 shadow-sm">
                <Pin size={12} fill="currentColor" /> Öne çıkan
              </div>
            )}

            <button
              onClick={() => onOpen(item)}
              className="grid w-full grid-cols-[96px_1fr] gap-4 pr-0 text-left sm:pr-24"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
                <img src={item.images[0]} alt="" className="h-full w-full object-cover" />

                {item.youtube && (
                  <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow">
                    <Play size={14} fill="currentColor" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-cyan-950 px-2.5 py-1 text-xs font-black text-white">
                    {item.type}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {item.category}
                  </span>
                </div>

                <h3 className="line-clamp-1 text-[17px] font-black leading-snug">
                  {item.title}
                </h3>

                <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>
            </button>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[112px] text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                <button
                  onClick={() => onProfile(user)}
                  className="font-black text-slate-700 hover:underline"
                >
                  <UserName user={user} />
                </button>

                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {item.city} / {item.district}
                </span>

                <span className="flex items-center gap-1">
                  <CalendarDays size={14} /> {formatDate(item.date)}
                </span>
              </div>

              <strong className="text-base font-black text-cyan-950">
                {priceLabel(item)}
              </strong>
            </div>
          </article>
        );
      })}

      {visibleCount < listings.length && (
        <div className="border-b border-slate-200 p-5">
          <button
            onClick={() => setVisibleCount((count) => count + 8)}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Daha fazla göster
          </button>
        </div>
      )}
    </div>
  );
}
