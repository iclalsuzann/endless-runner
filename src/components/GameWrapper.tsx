// components/GameWrapper.tsx
'use client'; // Bu satır çok önemli, sadece client'ta çalışır

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import Main from '@/game/scenes/Main';

const GameWrapper = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return; // Oyun zaten varsa tekrar başlatma

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth, // window burada güvenle kullanılabilir
      height: window.innerHeight,
      parent: 'phaser-game', // HTML div id'si
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 1700, x: 0 },
          debug: false,
        },
      },
      scene: [Main], // Senin Main scene'in
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Component kapandığında oyunu temizle (cleanup)
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="phaser-game" style={{ width: '100vw', height: '100vh' }} />;
};

export default GameWrapper;