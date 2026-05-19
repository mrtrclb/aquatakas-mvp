import React, { useState } from "react";
import { Flag, Trash2, MessageCircle } from "lucide-react";

export default function MessagesPage() {
  const [tab, setTab] = useState("active");
  const [selectedConversation, setSelectedConversation] = useState(null);

  function UserAvatarBubble({ user, size = "md" }) {
    const username = user?.user || user?.from || user?.name || "Kullanıcı";
    const initial = username.replace("@", "").trim().charAt(0).toUpperCase() || "H";

    const sizeClass =
      size === "lg"
        ? "h-12 w-12 text-sm"
        : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-xs";

    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-cyan-950 font-black text-white shadow-sm`}
        title={username}
      >
        {initial}
      </div>
    );
  }

  const conversations = [
    {
      id: 1,
      user: "@kadikoytank",
      title: "160x40x45h akvaryum ve sehpa",
      last: "Merhaba, ölçüler net 160x40x45 mi?",
      date: "18.05.2026",
      unread: true,
      deleted: false,
      messages: [
        { from: "@kadikoytank", body: "Merhaba, ölçüler net 160x40x45 mi?", time: "10:24" },
        { from: "sen", body: "Evet net ölçü bu, sehpa da dahil.", time: "10:31" }
      ]
    },
    {
      id: 2,
      user: "@nanoankara",
      title: "Java fern budama paketi",
      last: "Takas için karides düşünebilirim.",
      date: "17.05.2026",
      unread: false,
      deleted: false,
      messages: [
        { from: "sen", body: "Moss paketi hâlâ duruyor mu?", time: "18:12" },
        { from: "@nanoankara", body: "Duruyor. Takas için karides düşünebilirim.", time: "18:20" }
      ]
    },
    {
      id: 3,
      user: "@izmirfiltre",
      title: "Oase dış filtre",
      last: "Hortum aparatı duruyor mu?",
      date: "16.05.2026",
      unread: false,
      deleted: false,
      messages: [
        { from: "@izmirfiltre", body: "Hortum aparatı duruyor mu?", time: "14:03" },
        { from: "sen", body: "Duruyor ama medya dahil değil.", time: "14:18" }
      ]
    },
    {
      id: 4,
      user: "@eskitank",
      title: "Bitkili tank dekorları",
      last: "Tamamdır, ben vazgeçtim teşekkürler.",
      date: "12.05.2026",
      unread: false,
      deleted: true,
      messages: [
        { from: "@eskitank", body: "Dekorların tamamı duruyor mu?", time: "09:10" },
        { from: "sen", body: "Evet duruyor.", time: "09:18" },
        { from: "@eskitank", body: "Tamamdır, ben vazgeçtim teşekkürler.", time: "09:30" }
      ]
    }
  ];

  const visibleConversations = conversations.filter((message) => {
    if (tab === "deleted") return message.deleted;
    return !message.deleted;
  });

  let activeConversation = visibleConversations[0] || null;

  if (
    selectedConversation &&
    visibleConversations.some((message) => message.id === selectedConversation.id)
  ) {
    activeConversation = selectedConversation;
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Mesajlarım</h2>
        <p className="mt-1 text-sm text-slate-500">
          İlanlarla ilgili konuşmaları görüntüle, bildir, engelle veya sil.
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1">
        <button
          onClick={() => {
            setTab("active");
            setSelectedConversation(null);
          }}
          className={
            "rounded-full px-4 py-2 text-xs font-black " +
            (tab === "active" ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
          }
        >
          Gelen kutusu
        </button>

        <button
          onClick={() => {
            setTab("deleted");
            setSelectedConversation(null);
          }}
          className={
            "rounded-full px-4 py-2 text-xs font-black " +
            (tab === "deleted" ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
          }
        >
          Silinmiş mesajlar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          {visibleConversations.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedConversation(message)}
              className={
                "block w-full border-b border-slate-100 p-4 text-left last:border-b-0 hover:bg-slate-50 " +
                (activeConversation?.id === message.id ? "bg-slate-50" : "")
              }
            >
              <div className="flex gap-3">
                <UserAvatarBubble user={message} />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="truncate font-black text-slate-900">{message.user}</span>

                    {message.unread && (
                      <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[11px] font-black text-white">
                        Yeni
                      </span>
                    )}

                    {message.deleted && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">
                        Silindi
                      </span>
                    )}

                    <span className="text-xs text-slate-500">{message.date}</span>
                  </div>

                  <div className="line-clamp-1 text-sm font-black text-slate-700">
                    {message.title}
                  </div>

                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{message.last}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="min-h-[360px] rounded-[28px] border border-slate-200 bg-white p-4">
          {activeConversation ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatarBubble user={activeConversation} size="lg" />

                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900">
                      {activeConversation.user}
                    </div>

                    <div className="line-clamp-1 text-base font-black text-slate-800">
                      {activeConversation.title}
                    </div>

                    <div className="text-xs text-slate-500">{activeConversation.date}</div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                    <Flag size={13} className="mr-1 inline" /> Şikayet et
                  </button>

                  <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
                    Engelle
                  </button>

                  <button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                    <Trash2 size={13} className="mr-1 inline" /> Sil
                  </button>
                </div>
              </div>

              <div className="grid flex-1 content-start gap-3">
                {activeConversation.messages.map((item, index) => {
                  const mine = item.from === "sen";

                  return (
                    <div
                      key={index}
                      className={
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm " +
                        (mine ? "ml-auto bg-cyan-950 text-white" : "bg-slate-100 text-slate-700")
                      }
                    >
                      <div className="mb-1 text-[11px] font-black opacity-70">
                        {item.from} · {item.time}
                      </div>

                      <div>{item.body}</div>
                    </div>
                  );
                })}
              </div>

              {tab !== "deleted" ? (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Mesaj yaz..."
                  />

                  <button className="rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">
                    Gönder
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  Bu konuşma silinmiş mesajlar içinde görünüyor. İstersen ileride “geri al”
                  aksiyonu da eklenebilir.
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-300" size={36} />
                Bir konuşma seçerek mesajları burada görüntüleyebilirsin.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
