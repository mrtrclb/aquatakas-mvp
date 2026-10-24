#!/usr/bin/env python3
"""Katalog verisi → görsel listesi ve SQL.

  python3 scripts/katalog-sql.py liste   → scripts/katalog/gorseller.json (CI bunu indirir)
  python3 scripts/katalog-sql.py sql <çıktı.sql>
      → markalar ve ürünler için upsert SQL'i; yalnızca public/media altında gerçekten bulunan
        görseller yazılır (indirilemeyenler atlanır).
Kaynak: scripts/katalog/katalog.json
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts/katalog/katalog.json"
SITE = "https://aquagram.com.tr/media/"


def q(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def arr(values):
    return "array[" + ",".join(q(v) for v in values) + "]::text[]" if values else "'{}'::text[]"


def jsonb(value):
    return q(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def image_list(data):
    items = []
    for brand in data["brands"]:
        if brand.get("logo"):
            items.append({"url": brand["logo"], "out": "marka/" + brand["slug"]})
    for product in data["products"]:
        for i, url in enumerate(product.get("images", []), 1):
            items.append({"url": url, "out": "urun/" + product["slug"] + "-" + str(i)})
    return items


def existing(out):
    return (ROOT / "public/media" / (out + ".webp")).exists()


def build_sql(data):
    lines = ["-- Aquagram: katalog verisi (scripts/katalog/katalog.json'dan üretildi)"]
    for b in data["brands"]:
        logo = SITE + "marka/" + b["slug"] + ".webp" if b.get("logo") and existing("marka/" + b["slug"]) else None
        lines.append(
            "insert into public.brands (slug, name, logo_url, description, country, website, distributor, keywords, status) values ("
            + ", ".join([q(b["slug"]), q(b["name"]), q(logo), q(b.get("description", "")), q(b.get("country")), q(b.get("website")),
                         jsonb(b.get("distributor", {})), arr(b.get("keywords", [])), "'published'"])
            + ") on conflict (slug) do update set name = excluded.name, logo_url = coalesce(excluded.logo_url, public.brands.logo_url), description = excluded.description,"
            + " country = excluded.country, website = excluded.website, distributor = case when public.brands.distributor = '{}'::jsonb then excluded.distributor else public.brands.distributor end, keywords = excluded.keywords;"
        )
    for p in data["products"]:
        imgs = [SITE + "urun/" + p["slug"] + "-" + str(i) + ".webp" for i in range(1, len(p.get("images", [])) + 1) if existing("urun/" + p["slug"] + "-" + str(i))]
        lines.append(
            "insert into public.products (slug, brand_id, category_id, name, model_code, description, facts, keywords, images, videos, status) values ("
            + ", ".join([q(p["slug"]), "(select id from public.brands where slug = " + q(p["brand"]) + ")", q(p["category"]), q(p["name"]), q(p.get("model") or None),
                         q(p.get("description", "")), jsonb(p.get("facts", [])), arr(p.get("keywords", [])), arr(imgs), jsonb(p.get("videos", [])), "'published'"])
            + ") on conflict (slug) do update set brand_id = excluded.brand_id, category_id = excluded.category_id, name = excluded.name, model_code = excluded.model_code,"
            + " description = excluded.description, facts = excluded.facts, keywords = excluded.keywords, images = excluded.images, videos = excluded.videos;"
        )
    return "\n".join(lines) + "\n"


def main():
    data = json.loads(SRC.read_text())
    if sys.argv[1] == "liste":
        out = ROOT / "scripts/katalog/gorseller.json"
        out.write_text(json.dumps(image_list(data), ensure_ascii=False, indent=1))
        print(len(image_list(data)), "görsel listelendi")
    else:
        Path(sys.argv[2]).write_text(build_sql(data))
        print("SQL yazıldı:", sys.argv[2])


if __name__ == "__main__":
    main()
