import React from "react";

// Türk bayrağı (çizim): Windows bayrak emojisini göstermediği için emoji yerine kullanılır
export function TrFlag({ className = "" }) {
  return (
    <svg viewBox="0 0 30 20" aria-label="Türkiye" role="img" className={"inline-block h-[0.8em] w-[1.2em] shrink-0 rounded-[2px] align-[-0.08em] " + className}>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="10.5" cy="10" r="5" fill="#fff" />
      <circle cx="11.75" cy="10" r="4" fill="#E30A17" />
      <polygon points="13.70,10.00 15.39,9.41 15.43,7.62 16.51,9.05 18.22,8.53 17.20,10.00 18.22,11.47 16.51,10.95 15.43,12.38 15.39,10.59" fill="#fff" />
    </svg>
  );
}

// Kategori simgesi: Türkiye kategorisinde çizilmiş bayrak, diğerlerinde emoji
export function CategoryEmoji({ category, className = "" }) {
  if (category && category.id === "turkiye") return <TrFlag className={className} />;
  return <>{category ? category.emoji : ""}</>;
}
