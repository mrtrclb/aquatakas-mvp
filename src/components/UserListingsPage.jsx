import React from "react";
import { ArrowLeft, MapPin, CalendarDays } from "lucide-react";

export default function UserListingsPage({
  user,
  onBack,
  onOpen,
  onProfile,
  users,
  listings,
  formatDate,
  priceLabel,
  UserName
}) {
  const userId = Number(
    Object.keys(users).find((id) => users[id].username === user.username)
  );

  const userListings = listings.filter((item) => item.userId === userId);

  return (
    <div className="mx-auto max-w-5xl p-5">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft size={17} /> İlan akışına dön
      </button>

      <div className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-slate-500">Kullanıcı ilanları</div>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {user.username}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Bu kullanıcının yayındaki aktif ilanlarını görüntülüyorsun. İlan kartına tıklayarak
              detay sayfasına gidebilir, kullanıcı adına tıklayarak profil kartını tekrar açabilirsin.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <div className="text-2xl font-black text-cyan-950">{userListings.length}</div>
            <div className="text-xs font-black text-slate-500">aktif ilan</div>
          </div>
        </div>
      </div>

      {userListings.length > 0 ? (
        <div className="grid gap-3">
          {userListings.map((item) => {
            const listingUser = users[item.userId];

            return (
              <article
                key={item.id}
                className="grid gap-4 rounded-[26px] border border-slate-200 bg-white p-3 transition hover:bg-slate-50 sm:grid-cols-[112px_1fr]"
              >
                <button
                  onClick={() => onOpen(item)}
                  className="relative h-28 w-28 overflow-hidden rounded-2xl bg-slate-100"
                >
                  <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                </button>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-cyan-950 px-2.5 py-1 text-xs font-black text-white">
                      {item.type}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {item.category}
                    </span>
                  </div>

                  <button onClick={() => onOpen(item)} className="block w-full text-left">
                    <h3 className="line-clamp-1 text-lg font-black leading-snug text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </button>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                      <button
                        onClick={() => onProfile(listingUser)}
                        className="font-black text-slate-700 hover:underline"
                      >
                        <UserName user={listingUser} />
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
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center">
          <h3 className="text-lg font-black text-slate-800">Aktif ilan bulunamadı</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu kullanıcının şu anda yayında görünen bir ilanı yok.
          </p>
        </div>
      )}
    </div>
  );
}
