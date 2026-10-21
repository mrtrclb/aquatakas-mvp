import { useCallback, useEffect, useRef } from "react";

// Cloudflare Turnstile — giriş, kayıt ve şifre sıfırlamada bot koruması.
// Site anahtarı herkese açıktır; gizli anahtar yalnızca Supabase'de durur.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAFfP0aUxZVmg6wcO";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Widget yalnızca yetkili alan adında çalışır (yerel geliştirmede kapalı)
function captchaEnabled() {
  if (typeof window === "undefined" || !SITE_KEY) return false;
  return /(^|\.)aquagram\.com\.tr$/.test(window.location.hostname) || Boolean(window.__aqCaptchaInTests);
}

let loader = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("captcha_load")));
      script.onerror = () => {
        loader = null;
        reject(new Error("captcha_load"));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

// Kullanım: const captcha = useCaptcha();  <div ref={captcha.box} />
//           const token = await captcha.getToken();  … işlem sonrası captcha.reset()
export function useCaptcha() {
  const box = useRef(null);
  const widget = useRef(null);
  const token = useRef(null);
  const failed = useRef(false);
  const waiters = useRef([]);

  const settle = useCallback((value, error) => {
    const list = waiters.current;
    waiters.current = [];
    list.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(value)));
  }, []);

  useEffect(() => {
    if (!captchaEnabled()) return undefined;
    let dead = false;
    loadTurnstile()
      .then((ts) => {
        if (dead || !box.current) return;
        widget.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          language: "tr",
          appearance: "interaction-only", // çoğu kullanıcı hiçbir şey görmez
          callback: (value) => {
            failed.current = false;
            token.current = value;
            settle(value);
          },
          "expired-callback": () => {
            token.current = null;
            if (widget.current != null) ts.reset(widget.current);
          },
          "error-callback": () => {
            failed.current = true;
            settle(null, new Error("captcha_failed"));
            return true;
          }
        });
      })
      .catch(() => {
        failed.current = true;
        settle(null, new Error("captcha_load"));
      });
    return () => {
      dead = true;
      if (widget.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widget.current);
        } catch (err) {
          // zaten kaldırılmış
        }
      }
      widget.current = null;
    };
  }, [settle]);

  // Tek kullanımlık jeton: alındıktan sonra tüketilir
  const getToken = useCallback(() => {
    if (!captchaEnabled()) return Promise.resolve(undefined);
    if (token.current) {
      const value = token.current;
      token.current = null;
      return Promise.resolve(value);
    }
    if (failed.current) {
      failed.current = false;
      if (widget.current != null && window.turnstile) window.turnstile.reset(widget.current);
    }
    return new Promise((resolve, reject) => {
      const entry = {
        resolve: (value) => {
          clearTimeout(timer);
          token.current = null;
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      };
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((item) => item !== entry);
        reject(new Error("captcha_timeout"));
      }, 30000);
      waiters.current.push(entry);
    });
  }, []);

  // Her denemeden sonra yeni jeton üret
  const reset = useCallback(() => {
    token.current = null;
    if (widget.current != null && window.turnstile) {
      try {
        window.turnstile.reset(widget.current);
      } catch (err) {
        // yok say
      }
    }
  }, []);

  return { box, getToken, reset };
}
