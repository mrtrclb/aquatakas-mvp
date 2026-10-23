// Bildirim sesi: kısa, yumuşak iki notalı "ding" (Web Audio ile üretilir; ses dosyası yok).
// Tarayıcılar sesi ancak kullanıcı sayfaya en az bir kez dokunduktan sonra çalar.
// Tercih bu cihazda saklanır (varsayılan: açık).

const KEY = "aq_notif_sound";
let ctx = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch (err) {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch (err) {
    /* depolama kapalı */
  }
}

export function playNotificationSound(force = false) {
  if (!force && !soundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = ctx || new Ctx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    // İki kısa nota (E6 → A6), hafif yankılı sönüş
    [[1318.5, 0], [1760, 0.11]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.45);
    });
  } catch (err) {
    /* ses çalınamadı */
  }
}
