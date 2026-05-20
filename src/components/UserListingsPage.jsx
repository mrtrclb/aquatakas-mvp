import React from "react";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  MessageCircle,
  UserRound,
  Instagram,
  Facebook,
  Twitter
} from "lucide-react";

function LocalVerifiedBadge() {
  return (
    <span
      title="Doğrulanmış kullanıcı"
      className="inline-grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[10px] font-black leading-none text-white"
    >
      ✓
    </span>
  );
}

function SocialLinks({ socials }) {
  const items = [
    {
      key: "instagram",
      label: "Instagram",
      value: socials?.instagram,
      icon: Instagram
    },
    {
      key: "facebook",
      label: "Facebook",
      value: socials?.facebook,
      icon: Facebook
    },
    {
      key: "x",
      label: "X",
      value: socials?.x,
      icon: Twitter
    }
  ].filter((item) => item.value);

  if (items.length === 0) {
    return (
      <div className="mt-3 text-xs font-bold text-cyan-50/60">
        Sosyal medya hesabı eklenmemiş.
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/15"
            title={item.label}
          >
            <Icon size={13} />
            {item.value}
          </span>
        );
      })}
    </div>
  );
}

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

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-cyan-950 to-slate-900 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <UserRound size={30} />

                {user.online && (
                  <span
                    title="Çevrimiçi"
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
                  />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{user.username}</h2>
                  {user.verified && <LocalVerifiedBadge />}
                </div>

                <p className="mt-1 text-sm text-cyan-50/80">
                  {user.city} · {user.joined} üyesi ·{" "}
                  {user.online ? "Çevrimiçi" : "Son ziyaret: " + user.lastSeen}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90">
                  {user.bio || "Bu kullanıcı henüz hakkında bilgisi eklememiş."}
                </p>

                <SocialLinks socials={user.socials} />
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-950 hover:bg-cyan-50">
              <MessageCircle size={16} /> Mesaj gönder
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{userListings.length}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-emerald-700">
              {user.reviewStats?.positive || 0}
            </div>
            <div className="text-xs font-black text-slate-500">Olumlu değerlendirme</div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">
              {user.verified ? "Var" : "Yok"}
            </div>
            <div className="text-xs font-black text-slate-500">Doğrulama durumu</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="text-lg font-black">{user.username} kullanıcısının ilanları</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bu sayfada kullanıcının yayındaki ücretsiz ilanları listelenir.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            İlanlar 30 gün yayında kalır
          </div>
        </div>

        {userListings.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {userListings.map((item) => {
              const listingUser = users[item.userId];

              return (
                <article
                  key={item.id}
                  className="grid gap-4 p-4 transition hover:bg-slate-50 sm:grid-cols-[112px_1fr]"
                >
                  <button
                    onClick={() => onOpen(item)}
                    className="relative h-28 w-28 overflow-hidden rounded-2xl bg-slate-100 text-left"
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

                      {(item.tags || []).slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button onClick={() => onOpen(item)} className="block w-full text-left">
                      <h4 className="line-clamp-1 text-lg font-black leading-snug text-slate-950">
                        {item.title}
                      </h4>

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
          <div className="p-8 text-center">
            <h3 className="text-lg font-black text-slate-800">Aktif ilan bulunamadı</h3>
            <p className="mt-2 text-sm text-slate-500">
              Bu kullanıcının şu anda yayında görünen bir ilanı yok.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
