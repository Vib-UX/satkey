"use client";

import { useEffect, useState } from "react";

export function TimeRemaining({ endsAt }: { endsAt: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setText("Ended");
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (d > 0) setText(`${d}d ${h}h left`);
      else if (h > 0) setText(`${h}h ${m}m left`);
      else setText(`${m}m left`);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!text) return null;

  return (
    <span className="text-xs font-medium text-zinc-400">{text}</span>
  );
}
