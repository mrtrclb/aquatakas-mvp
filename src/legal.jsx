import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { CONTACT_EMAIL, LEGAL_DOCS, LEGAL_PATHS, LEGAL_VERSION } from "./lib/legal-docs.js";

export { CONTACT_EMAIL, LEGAL_DOCS, LEGAL_PATHS, LEGAL_VERSION };

/* Metin penceresi: zorunlu okumada en alta kaydırmadan onay düğmesi açılmaz */
export function LegalModal({ docKey, mustRead = false, onAccept, onClose }) {
  const doc = LEGAL_DOCS[docKey];
  const [atBottom, setAtBottom] = useState(!mustRead);
  const body = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // İçerik kısa ve kaydırma gerekmiyorsa düğme baştan açık olsun
  useEffect(() => {
    const node = body.current;
    if (node && node.scrollHeight <= node.clientHeight + 8) setAtBottom(true);
  }, [docKey]);

  function onScroll(event) {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) setAtBottom(true);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-label={doc.title} className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">{doc.title}</h2>
            <p className="text-xs text-slate-400">Sürüm: {new Date(LEGAL_VERSION).toLocaleDateString("tr-TR")}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" title="Pencereyi kapat" aria-label="Pencereyi kapat"><X size={18} /></button>
        </div>
        <div ref={body} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700">
          {doc.sections.map(([heading, paragraphs]) => (
            <section key={heading} className="mb-4">
              <h3 className="mb-1.5 font-black text-slate-900">{heading}</h3>
              {paragraphs.map((text) => <p key={text.slice(0, 40)} className="mb-2">{text}</p>)}
            </section>
          ))}
        </div>
        {onAccept && (
          <div className="border-t border-slate-100 px-5 py-3">
            {!atBottom && (
              <p className="mb-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-400"><ChevronDown size={14} /> Onaylamak için metni sonuna kadar oku</p>
            )}
            <button
              onClick={onAccept}
              disabled={!atBottom}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40"
            >
              <Check size={16} /> {doc.accept}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LegalBody({ docKey }) {
  const doc = LEGAL_DOCS[docKey];
  return (
    <div className="max-h-[55vh] overflow-y-auto pr-1 text-sm leading-relaxed text-slate-600">
      {doc.sections.map(([heading, paragraphs]) => (
        <section key={heading} className="mb-3">
          <h4 className="mb-1 font-black text-slate-800">{heading}</h4>
          {paragraphs.map((text) => <p key={text.slice(0, 40)} className="mb-1.5">{text}</p>)}
        </section>
      ))}
    </div>
  );
}
