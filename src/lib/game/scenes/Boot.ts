import * as Phaser from "phaser";

export default class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Karakter: 64x64 kareler halinde yükleniyor
    // Dosya yolunun (path) doğru olduğundan emin ol. 
    // Genelde "assets/sprites/..." veya "./sprites/..." olur.
    this.load.spritesheet("player", "sprites/character.png", {
      frameWidth: 64,
      frameHeight: 64,
      margin: 0,
      spacing: 0,
    });
    this.load.image("background", "sprites/background.png");
    this.load.image("obstacle", "sprites/obstacle.png");
  }

  create() {
    // UI sahnesini sildiğimiz için sadece Main'i başlatıyoruz
    this.scene.start("Main");
  }
}