import React from "react";
import { Mail, Phone, ShieldCheck } from "lucide-react";

function VerificationRow({ icon, title, value, verified }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <div>
          <div className="font-black">{title}</div>
          <div className="text-xs text-slate-500">{value}</div>
        </div>
      </div>

      <span
        className={
          "rounded-full px-2.5 py-1 text-xs font-black " +
          (verified ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500")
        }
      >
        {verified ? "Doğrulandı" : "Bekliyor"}
      </span>
    </div>
  );
}

function SocialInput({ icon, placeholder }) {
  return (
    <label className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-6 text-xs font-black text-slate-400">{icon}</span>
      <input placeholder={placeholder} className="w-full bg-transparent text-sm outline-none" />
    </label>
  );
}

export default function AccountPage({ user }) {
  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Hesabım</h2>
        <p className="mt-1 text-sm text-slate-500">
          Profil bilgilerini, doğrulama durumunu ve sosyal hesaplarını yönet.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4">
          <div className="grid place-items-center rounded-[24px] bg-slate-50 p-5 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-cyan-950 text-2xl font-black text-white">
              HH
            </div>

            <button className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              Profil resmi ekle
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
            <div className="mb-1 flex items-center gap-2 font-black">
              <ShieldCheck size={17} /> Güven profili
            </div>
            Telefon ve e-posta doğrulaması tamamlandığında kullanıcı adının yanında mavi tik görünür.
          </div>

          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100">
            Hesabımı sil
          </button>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-lg font-black">Profil bilgileri</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">Kullanıcı adı</span>
                <input
                  defaultValue={user.username}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">Şehir</span>
                <input
                  defaultValue={user.city}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-black text-slate-500">Hakkında</span>
                <textarea
                  rows={4}
                  defaultValue={user.bio}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>

            <button className="mt-4 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">
              Bilgileri kaydet
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-black">Doğrulama</h3>
              <VerificationRow icon={<Mail size={16} />} title="E-posta adresi" value="murat@example.com" verified />
              <VerificationRow icon={<Phone size={16} />} title="Telefon numarası" value="05xx xxx xx xx" verified />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-black">Sosyal hesaplar</h3>
              <SocialInput icon="IG" placeholder="Instagram kullanıcı adı" />
              <SocialInput icon="FB" placeholder="Facebook profil linki" />
              <SocialInput icon="X" placeholder="Twitter / X kullanıcı adı" />
              <SocialInput icon="WEB" placeholder="Web sitesi" />
              <SocialInput icon="YT" placeholder="YouTube kanalı" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
