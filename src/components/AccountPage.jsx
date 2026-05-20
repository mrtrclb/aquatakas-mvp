import React, { useState } from "react";
import {
  Mail,
  Phone,
  ShieldCheck,
  X,
  Smartphone,
  KeyRound
} from "lucide-react";

function VerificationRow({ icon, title, value, verified, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-left text-sm transition hover:bg-slate-100"
    >
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
        {verified ? "Doğrulandı" : "Doğrula"}
      </span>
    </button>
  );
}

function SocialInput({ icon, placeholder, defaultValue = "" }) {
  return (
    <label className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-6 text-xs font-black text-slate-400">{icon}</span>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none"
      />
    </label>
  );
}

function VerificationModal({ type, onClose }) {
  const isEmail = type === "email";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h3 className="text-xl font-black">
              {isEmail ? "E-posta doğrulama" : "Telefon doğrulama"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isEmail
                ? "E-posta adresine gönderilen 6 haneli kodu girerek hesabını doğrulayabilirsin."
                : "Telefon numarana gönderilen SMS kodunu girerek hesabını doğrulayabilirsin."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">
              {isEmail ? "E-posta adresi" : "Telefon numarası"}
            </span>

            <input
              defaultValue={isEmail ? "murat@example.com" : "05xx xxx xx xx"}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"
            />
          </label>

          <button className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            Doğrulama kodu gönder
          </button>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-black text-slate-500">
              Doğrulama kodu
            </span>

            <input
              placeholder="6 haneli kod"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-black tracking-[0.35em] outline-none"
            />
          </label>

          <div className="mt-4 rounded-2xl bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900">
            MVP aşamasında bu işlem temsilidir. Canlı sürümde kod gönderimi, süre sınırı,
            yeniden gönderme limiti ve yanlış kod deneme sınırı eklenmelidir.
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900"
          >
            Doğrulamayı tamamla
          </button>
        </div>
      </div>
    </div>
  );
}

function TwoFactorModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h3 className="text-xl font-black">2FA kurulumu</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Bir doğrulama uygulaması kullanarak hesabına ekstra güvenlik katmanı ekle.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[180px_1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="grid aspect-square place-items-center rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="grid h-28 w-28 grid-cols-5 grid-rows-5 gap-1">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span
                    key={index}
                    className={
                      "rounded-sm " +
                      ([0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index)
                        ? "bg-cyan-950"
                        : "bg-slate-200")
                    }
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs font-black text-slate-500">
              Temsili QR kod
            </div>
          </div>

          <div>
            <ol className="grid gap-3 text-sm leading-6 text-slate-600">
              <li className="rounded-2xl bg-slate-50 p-3">
                <strong className="text-slate-900">1.</strong> Google Authenticator,
                Microsoft Authenticator veya benzeri bir uygulama aç.
              </li>

              <li className="rounded-2xl bg-slate-50 p-3">
                <strong className="text-slate-900">2.</strong> QR kodu tara veya manuel
                kurulum anahtarını gir.
              </li>

              <li className="rounded-2xl bg-slate-50 p-3">
                <strong className="text-slate-900">3.</strong> Uygulamada oluşan 6 haneli
                kodu aşağıya yaz.
              </li>
            </ol>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-black text-slate-500">Manuel kurulum anahtarı</div>
              <div className="mt-1 rounded-xl bg-white px-3 py-2 font-mono text-xs font-black text-slate-700 ring-1 ring-slate-200">
                HOBI-CIDEN-2FA-DEMO-2026
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-black text-slate-500">
                Uygulamadaki 6 haneli kod
              </span>

              <input
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-black tracking-[0.35em] outline-none"
              />
            </label>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900"
            >
              2FA’yı etkinleştir
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          Canlı sürümde yedek kurtarma kodları, cihaz hatırlama seçeneği ve 2FA kapatma
          işlemi için yeniden parola doğrulaması eklenmelidir.
        </div>
      </div>
    </div>
  );
}

export default function AccountPage({ user }) {
  const [verificationModal, setVerificationModal] = useState(null);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);

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
            Telefon, e-posta ve iki aşamalı doğrulama tamamlandığında hesabın daha güvenli görünür.
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

              <VerificationRow
                icon={<Mail size={16} />}
                title="E-posta adresi"
                value="murat@example.com"
                verified
                onClick={() => setVerificationModal("email")}
              />

              <VerificationRow
                icon={<Phone size={16} />}
                title="Telefon numarası"
                value="05xx xxx xx xx"
                verified
                onClick={() => setVerificationModal("phone")}
              />

              <button
                type="button"
                onClick={() => setTwoFactorOpen(true)}
                className="mt-3 w-full rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-left transition hover:bg-cyan-100"
              >
                <div className="flex items-start gap-2">
                  <Smartphone size={17} className="mt-0.5 text-cyan-950" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900">
                        Doğrulama uygulaması ile 2FA
                      </div>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                        Kapalı
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Authenticator uygulaması kullanarak hesabına ikinci güvenlik adımı ekle.
                    </p>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                <KeyRound size={15} className="mt-0.5 shrink-0 text-slate-400" />
                E-posta, telefon ve 2FA doğrulamaları ileride güven rozeti ve ilan güven puanı için kullanılabilir.
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-black">Sosyal hesaplar</h3>
              <SocialInput icon="IG" placeholder="Instagram kullanıcı adı" defaultValue={user.socials?.instagram || ""} />
              <SocialInput icon="FB" placeholder="Facebook profil linki" defaultValue={user.socials?.facebook || ""} />
              <SocialInput icon="X" placeholder="Twitter / X kullanıcı adı" defaultValue={user.socials?.x || ""} />
              <SocialInput icon="WEB" placeholder="Web sitesi" />
              <SocialInput icon="YT" placeholder="YouTube kanalı" />
            </div>
          </div>
        </div>
      </div>

      {verificationModal && (
        <VerificationModal
          type={verificationModal}
          onClose={() => setVerificationModal(null)}
        />
      )}

      {twoFactorOpen && (
        <TwoFactorModal onClose={() => setTwoFactorOpen(false)} />
      )}
    </div>
  );
}
