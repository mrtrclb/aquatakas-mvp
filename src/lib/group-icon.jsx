import React, { useState } from "react";

// Grup simgesi: yüklenmiş görsel varsa onu, yoksa (ya da görsel açılmazsa) emojiyi gösterir.
// Kutunun boyutu ve rengi çağıran yerde verilir; görsel kutuyu tamamen doldurur.
export function GroupIcon({ group, inline = false }) {
  const [broken, setBroken] = useState(false);
  if (group && group.icon && !broken) {
    return (
      <img
        src={group.icon}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className={inline ? "inline-block h-[1.15em] w-[1.15em] shrink-0 rounded-[5px] object-cover align-[-0.2em]" : "h-full w-full object-cover"}
      />
    );
  }
  return <>{(group && group.emoji) || "💧"}</>;
}
