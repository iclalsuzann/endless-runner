import * as Phaser from "phaser";
import Boot from "./scenes/Boot";
import Main from "./scenes/Main";

export function startGame(parent: HTMLDivElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 900,
    height: 500,
    backgroundColor: "#0b1020",
    
    // 🔥 ÖNEMLİ: Pixel Art (Piksel Sanatı) Ayarı
    // Bunu 'true' yapmazsan karakter ve engeller bulanık görünür.
    // 'true' yapınca tarayıcı yumuşatmayı kapatır, görüntü keskinleşir.
    pixelArt: true, 

    physics: {
      default: "arcade",
      arcade: { 
        gravity: { x: 0, y: 1200 }, // Yerçekimi
        debug: false // Kutuları gizlemek için false yaptık
      },
    },
    scene: [Boot, Main],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  return game;
}

export function stopGame(game: Phaser.Game) {
  // Phaser bazen canvas cleanup’ta takılabiliyor; destroy ile kapat.
  game.destroy(true);
}