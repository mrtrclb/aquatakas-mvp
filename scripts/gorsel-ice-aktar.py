#!/usr/bin/env python3
"""Toplu görsel içe aktarma.

Kullanım:  python3 scripts/gorsel-ice-aktar.py <görsel-klasörü> [cikti.sql]

Klasördeki dosyalar şu adlarla gelir (bkz. aquagram_gorsel_listesi.xlsx):
  15_1.jpg, 15_2.webp ...   → 15 numaralı tür
  M61_1.png, M61_2.jpg ...  → 61 numaralı makale
Numara → slug eşlemesi scripts/gorsel-numaralari.json dosyasındadır.

Her görsel EXIF yönüne göre döndürülür, uzun kenarı en fazla 1600 px olacak şekilde
küçültülür, meta verisi atılır ve webp olarak public/media/tur|makale/<slug>-<sıra>.webp
yoluna yazılır. GitHub Pages bunları https://aquagram.com.tr/media/... adresinden sunar.
Çıktı SQL'i ilgili satırların images (türler) / cover_url + images (makaleler) alanlarını,
o tür/makale için klasördeki TÜM görsellerle (sıra numarasına göre) günceller.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://aquagram.com.tr"
MAX_EDGE = 1600
QUALITY = 80
NAME = re.compile(r"^(M?)(\d+)_(\d+)\.(jpe?g|png|webp|avif)$", re.I)


def main():
    src = Path(sys.argv[1])
    out_sql = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    nums = json.loads((ROOT / "scripts/gorsel-numaralari.json").read_text())
    found = {"tur": {}, "makale": {}}
    skipped = []
    key_of = {}
    for file in sorted(p for p in src.rglob("*") if p.is_file()):
        m = NAME.match(file.name)
        if not m:
            skipped.append((file.name, "ad biçimi uymuyor"))
            continue
        kind = "makale" if m.group(1) else "tur"
        key = ("M" if m.group(1) else "") + str(int(m.group(2)))
        slug = nums[kind].get(key)
        if not slug:
            skipped.append((file.name, "numara listede yok"))
            continue
        found[kind].setdefault(slug, []).append((int(m.group(3)), file))
        key_of[(kind, slug)] = key

    sql = []
    for kind, items in found.items():
        folder = ROOT / "public/media" / kind
        folder.mkdir(parents=True, exist_ok=True)
        for slug, files in items.items():
            urls = []
            for order, file in sorted(files):
                with Image.open(file) as im:
                    im = ImageOps.exif_transpose(im)
                    alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
                    im = im.convert("RGBA" if alpha else "RGB")
                    im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
                    target = folder / f"{slug}-{order}.webp"
                    im.save(target, "WEBP", quality=QUALITY, method=6)
                urls.append(f"{SITE}/media/{kind}/{slug}-{order}.webp")
            arr = "array[" + ",".join("'" + u + "'" for u in urls) + "]::text[]"
            moved = nums.get("formlar", {}).get(key_of[(kind, slug)]) if kind == "tur" else None
            if moved:
                sql.append(f"update public.species_forms set images = {arr} where name = '{moved[1]}' and species_id = (select id from public.species where slug = '{moved[0]}');")
            elif kind == "tur":
                sql.append(f"update public.species set images = {arr} where slug = '{slug}';")
            else:
                sql.append(f"update public.articles set cover_url = '{urls[0]}', images = {arr} where slug = '{slug}';")

    text = "\n".join(sql) + "\n"
    if out_sql:
        out_sql.write_text(text)
    print(f"türler: {len(found['tur'])}, makaleler: {len(found['makale'])}, görsel: {sum(len(v) for d in found.values() for v in d.values())}")
    for name, why in skipped:
        print(f"ATLANDI: {name} ({why})")


if __name__ == "__main__":
    main()
