#!/usr/bin/env python3
"""scripts/katalog/gorseller.json: [{"url": "...", "out": "urun/eheim-classic-350-1"}]
Her görsel indirilir, EXIF yönüne göre döndürülür, uzun kenarı en fazla 1200 px olacak şekilde
küçültülür, şeffaf arka plan beyaza oturtulur ve public/media/<out>.webp olarak yazılır.
Var olan dosyalar atlanır. Sonuç scripts/katalog/indirme-raporu.json dosyasına yazılır."""
import io
import json
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
LIST = ROOT / "scripts/katalog/gorseller.json"
REPORT = ROOT / "scripts/katalog/indirme-raporu.json"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*"})
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read()


def main():
    items = json.loads(LIST.read_text())
    report = {"ok": [], "skipped": [], "failed": []}
    for item in items:
        out = ROOT / "public/media" / (item["out"] + ".webp")
        if out.exists():
            report["skipped"].append(item["out"])
            continue
        urls = item["url"] if isinstance(item["url"], list) else [item["url"]]
        try:
            data, last = None, None
            for url in urls:
                try:
                    data = fetch(url)
                    break
                except Exception as err:  # noqa: BLE001
                    last = err
            if data is None:
                raise last
            with Image.open(io.BytesIO(data)) as im:
                im = ImageOps.exif_transpose(im)
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGBA")
                    bg = Image.new("RGB", im.size, "white")
                    bg.paste(im, mask=im.split()[-1])
                    im = bg
                else:
                    im = im.convert("RGB")
                im.thumbnail((1200, 1200), Image.LANCZOS)
                out.parent.mkdir(parents=True, exist_ok=True)
                im.save(out, "WEBP", quality=82, method=6)
            report["ok"].append(item["out"])
        except Exception as err:  # noqa: BLE001
            report["failed"].append({"out": item["out"], "url": item["url"], "error": str(err)[:200]})
        time.sleep(0.4)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(len(report["ok"]), "indirildi,", len(report["skipped"]), "zaten vardı,", len(report["failed"]), "başarısız")


if __name__ == "__main__":
    main()
