import openpyxl, json, re, sys
path, cat, origin, out = sys.argv[1:5]
kind = sys.argv[5] if len(sys.argv) > 5 else 'fish'
ws=openpyxl.load_workbook(path, data_only=True).worksheets[0]
rows=list(ws.iter_rows(values_only=True)); H=[str(h or '') for h in rows[0]]
def col(*names):
    for n in names:
        for i,h in enumerate(H):
            if h.lower().startswith(n.lower()): return i
    return None
C = dict(name=col('Türün'), latin=col('Latince'), desc=col('Tanıtım'), diff=col('Zorluk'), boy=col('Yetişkin Boy'), tmin=col('Sıcaklık Min'), tmax=col('Sıcaklık Maks'), ph=col('pH'), tank=col('Min. Akvaryum'), huy=col('Huy'), food=col('Beslenme'), breed=col('Üreme'), tags=col('Kısa Etiket'), kw=col('Otomatik'), rare=col("Türkiye'de Nadir"))
def q(s): return "'" + str(s).replace("'", "''") + "'"
vals=[]; seen=set()
for r in rows[1:]:
    g = lambda k: r[C[k]] if C.get(k) is not None else None
    if not g('name'): continue
    name, latin = str(g('name')).strip(), str(g('latin')).strip()
    slug = re.sub(r'[^a-z0-9]+','-', latin.lower()).strip('-')
    if slug in seen:
        slug = slug + '-' + re.sub(r'[^a-z0-9]+','-', name.lower()).strip('-'); latin = latin + " '" + name + "'"
    seen.add(slug)
    huy = str(g('huy') or ''); tank = g('tank') or 0; h = huy.lower()
    diff = str(g('diff') or '').strip().capitalize()
    if diff not in ('Kolay','Orta','Zor'):
        if tank >= 400 or 'çok agresif' in h or 'avcı' in h: diff='Zor'
        elif (h.startswith('barışçıl') or h.startswith('görece barışçıl') or h.startswith('görece sakin')) and tank < 400: diff='Kolay'
        else: diff='Orta'
    fmt = lambda x: (str(int(x)) if float(x).is_integer() else str(x).replace('.', ',')) if isinstance(x,(int,float)) else str(x)
    facts = []
    if g('boy') is not None: facts.append(["Yetişkin boy", fmt(g('boy'))+" cm"])
    if g('tmin') is not None: facts.append(["Sıcaklık", fmt(g('tmin'))+"–"+fmt(g('tmax'))+" °C"])
    if g('ph'): facts.append(["pH", str(g('ph')).replace('-', '–')])
    if tank: facts.append(["Min. akvaryum", fmt(tank)+" L"])
    if huy: facts.append(["Huy", huy])
    if g('food'): facts.append(["Beslenme", g('food')])
    if g('breed'): facts.append(["Üreme", g('breed')])
    facts.append(["Köken", origin])
    if g('tags'): facts.append(["Özellikler", g('tags')])
    keys = [k.strip().replace('İ','i').replace('I','ı').lower() for k in str(g('kw') or '').split(',') if k.strip()]
    nl = name.replace('İ','i').replace('I','ı').lower()
    if nl not in keys: keys.insert(0, nl)
    keyarr = "array[" + ",".join(q(k) for k in keys) + "]::text[]"
    temp = (huy[0].upper()+huy[1:]) if huy else None
    vals.append(f"({q(slug)},{q(name)},{q(latin)},{q(cat)},{q(kind)},{q(diff)},{q(temp) if temp else 'null'},{q(g('desc') or '')},{q(json.dumps(facts, ensure_ascii=False))}::jsonb,{keyarr},{'true' if str(g('rare')).strip().lower()=='evet' else 'false'},'published')")
    print(slug, diff, g('rare'))
sql = "insert into public.species (slug,name,latin,category_id,kind,difficulty,temperament,description,facts,keywords,is_rare,status) values\n" + ",\n".join(vals) + "\non conflict (slug) do nothing returning slug;"
open(out,'w').write(sql); print(len(vals), "rare:", sum("true,'published'" in v for v in vals))
