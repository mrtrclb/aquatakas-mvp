// Yüklemeden önce görsel ve video sıkıştırma (tarayıcıda; desteklenmezse dosya olduğu gibi gider)

export const IMAGE_QUALITY = 0.78;

async function encode(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Görseli en uzun kenarı maxSide olacak şekilde küçültür ve WebP'ye çevirir.
// Tarayıcı WebP üretemiyorsa (eski Safari) JPEG'e düşer. Sonuç asıldan büyükse aslı kullanılır.
export async function compressImage(file, maxSide = 1600, quality = IMAGE_QUALITY) {
  try {
    if (!file || file.type === "image/gif") return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    let blob = await encode(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", quality);
    if (!blob) return file;
    if (scale === 1 && blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

export function extForType(type) {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  return "jpg";
}

const VIDEO_SHORT_SIDE = 720;
const VIDEO_BITRATE = 2_000_000;
const AUDIO_BITRATE = 96_000;
const VIDEO_SKIP_BYTES = 3 * 1024 * 1024;

// Videoyu kısa kenarı 720 px, yaklaşık 2 Mbps H.264 + AAC MP4'e çevirir (WebCodecs).
// Desteklenmeyen tarayıcıda, ses ya da görüntü izi korunamıyorsa veya sonuç büyürse aslı döner.
export async function compressVideo(blob, onProgress) {
  try {
    if (!blob || blob.size < VIDEO_SKIP_BYTES) return blob;
    if (typeof window === "undefined" || typeof window.VideoEncoder === "undefined") return blob;
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return blob;
    const w = track.displayWidth;
    const h = track.displayHeight;
    const video = { codec: "avc", bitrate: VIDEO_BITRATE, forceTranscode: true };
    if (Math.min(w, h) > VIDEO_SHORT_SIDE) {
      if (w <= h) video.width = VIDEO_SHORT_SIDE;
      else video.height = VIDEO_SHORT_SIDE;
    }
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    // AAC kodlayıcısı yoksa (ör. Linux Chromium, Firefox) ses izi yeniden kodlanmadan aynen aktarılır
    const audio = (await mb.canEncodeAudio("aac")) ? { codec: "aac", bitrate: AUDIO_BITRATE } : {};
    const conversion = await mb.Conversion.init({ input, output, video, audio, showWarnings: false });
    if (!conversion.isValid || conversion.discardedTracks.length) return blob;
    if (onProgress) conversion.onProgress = (p) => onProgress(p);
    await conversion.execute();
    const out = new Blob([output.target.buffer], { type: "video/mp4" });
    return out.size > 0 && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}
