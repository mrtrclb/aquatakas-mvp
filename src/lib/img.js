// Görsel boyutlandırma yardımcıları (PageSpeed: gereğinden büyük görsel indirilmesin)
// Unsplash adreslerinde genişlik parametresiyle küçük sürümler istenir; diğer adresler olduğu gibi kalır.
const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

function withWidth(url, width) {
  if (/[?&]w=\d+/.test(url)) return url.replace(/([?&])w=\d+/, "$1w=" + width);
  return url + (url.includes("?") ? "&" : "?") + "w=" + width;
}

// <img {...imgProps(url, "(max-width: 640px) 100vw, 600px")} />
export function imgProps(url, sizes = "(max-width: 640px) 100vw, 600px", widths = [480, 800, 1200]) {
  if (!url || !UNSPLASH.test(url)) return { src: url };
  return {
    src: withWidth(url, widths[Math.min(1, widths.length - 1)]),
    srcSet: widths.map((width) => withWidth(url, width) + " " + width + "w").join(", "),
    sizes
  };
}
