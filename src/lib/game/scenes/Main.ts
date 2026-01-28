import * as Phaser from "phaser";

type Obstacle = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export default class Main extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  
  // 🔥 YENİ: Arka Plan Değişkeni
  private bg!: Phaser.GameObjects.TileSprite;

  private ground!: Phaser.GameObjects.Rectangle;
  private groundBody!: Phaser.Physics.Arcade.StaticBody;

  private obstacles!: Phaser.Physics.Arcade.Group;
  private spawnTimer = 0;

  private speed = 300;
  private score = 0;
  private best = 0;

  private started = false;
  private isDead = false;

  private jumpKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private startText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  // --- AYARLAR ---
  private readonly PLAYER_SCALE = 2.5; 
  private readonly OBSTACLE_SCALE = 0.45; 
  private readonly GROUND_H = 64; 
  private readonly GROUND_PAD = 16; 

  private groundTop = 0;

  constructor() {
    super("Main");
  }

  create() {
    // Debug modunu açmak istersen yorumu kaldır:
    // this.physics.world.createDebugGraphic();

    const saved = localStorage.getItem("endless_best");
    this.best = saved ? Number(saved) : 0;
    this.score = 0;
    this.started = false;
    this.isDead = false;
    this.speed = 300;
    this.spawnTimer = 0;

    const w = this.scale.width;
    const h = this.scale.height;

    // --- ARKA PLAN (BACKGROUND) ---
    this.bg = this.add.tileSprite(0, 0, w, h, "background")
      .setOrigin(0, 0)
      .setDepth(-1);

    // --- 🎨 PROGRAMATİK ZEMİN DOKUSU OLUŞTURMA ---
    // Resim dosyan olmadığı için burada geçici bir doku yaratıyoruz.
    // --- 🎨 PROGRAMATİK ZEMİN DOKUSU OLUŞTURMA ---
    if (!this.textures.exists("ground_texture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // 1. ZEMİN ANA RENGİ (Burayı değiştirdik)
        // 0x181818 -> Çok koyu gri
        g.fillStyle(0x181818); 
        g.fillRect(0, 0, 32, 32);
        
        // 2. DETAYLAR (Noktalar/Çizgiler)
        // 0x303030 -> Ana renkten biraz daha açık gri olsun ki hareket belli olsun
        g.fillStyle(0x303030); 
        g.fillRect(0, 0, 32, 2); // Üst çizgi
        g.fillRect(10, 10, 4, 4); // Nokta 1
        g.fillRect(24, 20, 4, 4); // Nokta 2
        
        g.generateTexture("ground_texture", 32, 32);
    }

    // --- 1. ZEMİN (TileSprite Olarak) ---
    this.groundTop = h - this.GROUND_H;
    
    // Rectangle yerine TileSprite kullanıyoruz ki kayabilsin
    this.ground = this.add.tileSprite(0, this.groundTop, w, this.GROUND_H, "ground_texture")
      .setOrigin(0, 0)
      .setDepth(5); // Oyuncunun arkasında, arkaplanın önünde

    this.physics.add.existing(this.ground, true);
    this.groundBody = this.ground.body as Phaser.Physics.Arcade.StaticBody;
    this.groundBody.updateFromGameObject();

    // --- 2. OYUNCU (PLAYER) ---
    // Oyuncuyu havadan başlatıyoruz (groundTop - 100) ki fiziğin oturduğunu görelim
    this.player = this.physics.add.sprite(100, this.groundTop - 100, "player", 0);
    this.player.setOrigin(0.5, 1); 
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Hitbox Ayarları
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const pW = this.player.width;
    const pH = this.player.height;

    // Hitbox boyutları
    const targetBodyWidth = pW * 0.4;
    const targetBodyHeight = pH * 0.7;

    pBody.setSize(targetBodyWidth, targetBodyHeight);

    // Hitbox Offset Ayarı (Zemine tam basması için)
    // -20 değerini görseline göre artırıp azaltabilirsin.
    pBody.setOffset(
        (pW - targetBodyWidth) / 2, 
        (pH - targetBodyHeight) - 20 
    );

    // --- 3. DİĞERLERİ ---
    this.createPlayerAnims();
    this.physics.add.collider(this.player, this.ground);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    
    // Çarpışma (Overlap) Mantığı
    this.physics.add.overlap(this.player, this.obstacles, (p, o) => {
      if (this.isDead) return;

      const pb = (p as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
      const ob = (o as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;

      const ix = Math.max(pb.x, ob.x);
      const iy = Math.max(pb.y, ob.y);
      const ax = Math.min(pb.right, ob.right);
      const ay = Math.min(pb.bottom, ob.bottom);

      const iw = ax - ix;
      const ih = ay - iy;

      if (iw <= 0 || ih <= 0) return;

      const minOverlapArea = 120; 
      const overlapArea = iw * ih;

      if (overlapArea >= minOverlapArea) this.die();
    });

    // UI - Arayüz
    this.startText = this.add.text(w/2, h/2 - 50, "SPACE to Start", { fontSize: "32px", color: "#fff" }).setOrigin(0.5).setDepth(20);
    this.scoreText = this.add.text(20, 20, `Score: 0`, { fontSize: "20px", color: "#fff" }).setDepth(20);

    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Resize Event (Ekran boyutu değişirse)
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
        const nw = gameSize.width;
        const nh = gameSize.height;
        
        this.groundTop = nh - this.GROUND_H;
        this.ground.y = this.groundTop;
        
        // TileSprite olduğu için setSize veya width kullanabiliriz
        this.ground.width = nw; 
        
        this.groundBody.updateFromGameObject();
        
        // Eğer oyun başlamadıysa oyuncuyu da hizala
        if(!this.started) {
            this.player.y = this.groundTop; 
        }

        this.bg.setSize(nw, nh);
    });
  }

  private spawnObstacle() {
    if (this.isDead) return;

    const x = this.scale.width + 100;

    const EXTRA_SINK = 16;
    const fixedY = this.groundTop + this.GROUND_PAD + EXTRA_SINK;

    // Önce yarat, origin + scale ayarla, EN SON y’yi ver
    const ob = this.physics.add.image(x, 0, "obstacle") as Obstacle;

    ob.setOrigin(0.5, 1);
    ob.setScale(this.OBSTACLE_SCALE);
    ob.setPosition(x, fixedY);

    ob.setImmovable(true);
    ob.setVelocityX(-this.speed);

    const body = ob.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;      // ✅ doğru yöntem
    // (İstersen) body.setAllowGravity(false); // bazı Phaser sürümlerinde var, body üstünde


    // Hepsini display ölçülerinden hesapla (scale ile uyumlu)
    const dw = ob.displayWidth;
    const dh = ob.displayHeight;

    body.setSize(dw * 0.5, dh * 0.8);
    body.setOffset((dw - dw * 0.5) / 2, dh * 0.2);

    this.obstacles.add(ob);
  }


  private createPlayerAnims() {
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("player", { start: 25, end: 28 }), 
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "jump",
      frames: [{ key: "player", frame: 14 }], 
      frameRate: 1,
    });

    this.anims.create({
      key: "dead",
      frames: this.anims.generateFrameNumbers("player", { start: 74, end: 77 }),
      frameRate: 15, 
      repeat: 0,    
      hideOnComplete: false 
    });
  }

  private die() {
    if (this.isDead) return;
    this.isDead = true;

    this.physics.pause();
    this.player.clearTint();
    this.player.play("dead");
    this.startText.setText("Game Over\nPress R").setVisible(true);

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem("endless_best", String(this.best));
    }
  }
  
  private jump() {
    if (this.isDead) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
        if (!this.started) {
            this.started = true;
            this.startText.setVisible(false);
            this.player.anims.play("run", true);
        }
        this.player.setVelocityY(-650);
        this.player.anims.play("jump", true);
    }
  }

  update(time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
        if (this.isDead) this.scene.restart();
        else this.jump();
    }
    
    // --- 🔥 YENİ: Arka Plan Kaydırma Mantığı ---
    if (this.started && !this.isDead) {
        // Hızla orantılı kaydırıyoruz.
        // * 0.5 diyerek engellerden daha yavaş akmasını sağlıyoruz (Derinlik hissi)
        this.bg.tilePositionX += this.speed * (delta / 1000) * 0.5;
    }

    if (!this.started || this.isDead) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
        if (this.player.anims.currentAnim?.key !== "run") this.player.anims.play("run", true);
    }

    this.speed += delta * 0.02;
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = Phaser.Math.Between(1200, 2500);
    }
    this.obstacles.getChildren().forEach((c) => {
        const o = c as Obstacle;
        o.setVelocityX(-this.speed);
        if (o.x < -100) {
            o.destroy();
            this.score++;
            this.scoreText.setText(`Score: ${this.score}`);
        }
    });
  }
}