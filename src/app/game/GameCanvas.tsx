"use client";

import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: any;

    (async () => {
      if (!hostRef.current) return;

      const mod = await import("@/lib/game"); // <-- sadece client'ta yüklenir
      game = mod.startGame(hostRef.current);
    })();

    return () => {
      if (game) {
        // stopGame'e bile gerek yok, direkt destroy yeter
        game.destroy(true);
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#0b1020",
      }}
    />
  );
}
