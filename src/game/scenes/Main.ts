import * as Phaser from "phaser";

type Obstacle = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export default class Main extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private bg!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
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

  private readonly PLAYER_SCALE = 3.5;
  private readonly OBSTACLE_SCALE = 0.45;
  private readonly GROUND_H = 64;
  private readonly GROUND_PAD = 15;
  private groundTop = 0;

  private readonly GRAVITY_Y = 1400;
  private readonly JUMP_VY = -1200;

  // spritesheet frame ölçüsü
  private readonly FRAME_W = 64;
  private readonly FRAME_H = 64;

  constructor() {
    super("Main");
  }

  preload() {
    this.load.image("background", "/sprites/background.png");
    this.load.image("obstacle", "/sprites/obstacle.png");

    this.load.spritesheet("player", "/sprites/player.png", {
      frameWidth: this.FRAME_W,
      frameHeight: this.FRAME_H,
    });
  }

  private ensureGroundTexture() {
    if (!this.textures.exists("ground_texture")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x181818);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x303030);
      g.fillRect(0, 0, 32, 2);
      g.fillRect(10, 10, 4, 4);
      g.fillRect(24, 20, 4, 4);
      g.generateTexture("ground_texture", 32, 32);
      g.destroy();
    }
  }

  private placePlayerOnGround() {
    // Manuel +6 ayarını kaldırdık, fizik motoruna güveniyoruz.
    // Sadece biraz havadan başlatıyoruz ki collider onu yakalasın.
    this.player.y = this.groundTop - 10; 

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.player.x, this.player.y);
  }

  private fitPlayerBodyToFrame() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const frameW = this.FRAME_W;
    const frameH = this.FRAME_H;

    const targetW = frameW * 0.4;
    const targetH = frameH * 0.7;

    // ✨ AYAR: Karakterin PNG'sinde ayakların altında boşluk varsa bu sayıyı artır.
    // Scale 3.5 olduğu için buradaki 1 piksel dünyada 3.5 piksele denk gelir.
    // Yaklaşık 1.5 veya 2 ideal olacaktır.
    const emptySpaceAtBottom = 17; 

    body.setSize(targetW, targetH);
    
    // Y Offset hesabına "- emptySpaceAtBottom" ekledik.
    // Bu, hitbox'ı yukarı çeker, görseli aşağı salar.
    body.setOffset(
        (frameW - targetW) / 2, 
        frameH - targetH - emptySpaceAtBottom 
    );
  }

  create() {
    this.ensureGroundTexture();

    const saved = localStorage.getItem("endless_best");
    this.best = saved ? Number(saved) : 0;

    this.score = 0;
    this.started = false;
    this.isDead = false;
    this.speed = 300;
    this.spawnTimer = 0;

    const w = this.scale.width;
    const h = this.scale.height;

    this.physics.world.gravity.y = this.GRAVITY_Y;

    this.bg = this.add
      .tileSprite(0, 0, w, h, "background")
      .setOrigin(0, 0)
      .setDepth(-1);

    this.groundTop = h - this.GROUND_H;
    this.ground = this.add
      .tileSprite(0, this.groundTop, w, this.GROUND_H, "ground_texture")
      .setOrigin(0, 0)
      .setDepth(5);

    this.physics.add.existing(this.ground, true);
    this.groundBody = this.ground.body as Phaser.Physics.Arcade.StaticBody;
    this.groundBody.updateFromGameObject();

    // --- PLAYER ---
    this.player = this.physics.add.sprite(100, 0, "player", 24);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setGravityY(this.GRAVITY_Y);

    // ✅ Body ayarı: frame'e göre
    this.fitPlayerBodyToFrame();

    // ✅ zemine oturt
    this.placePlayerOnGround();

    // --- ANIMS ---
    this.createPlayerAnims();

    this.physics.add.collider(this.player, this.ground);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, (p, o) =>
      this.handleHit(p, o)
    );

    this.startText = this.add
      .text(w / 2, h / 2 - 50, "SPACE to Start", {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.scoreText = this.add
      .text(20, 20, `Score: 0`, { fontSize: "20px", color: "#fff" })
      .setDepth(20);

    this.jumpKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.restartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      const nw = gameSize.width;
      const nh = gameSize.height;

      this.groundTop = nh - this.GROUND_H;
      this.ground.y = this.groundTop;
      this.ground.width = nw;
      this.groundBody.updateFromGameObject();

      if (!this.started) this.placePlayerOnGround();

      this.bg.setSize(nw, nh);
      this.startText.setPosition(nw / 2, nh / 2 - 50);
    });

    // Debug: animasyon çalışıyor mu
    this.player.play("run", true);
  }

  private createPlayerAnims() {
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("player", { start: 24, end: 29 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    if (!this.anims.exists("jump")) {
      this.anims.create({
        key: "jump",
        frames: [{ key: "player", frame: 74 }],
        frameRate: 1,
      });
    }

    if (!this.anims.exists("dead")) {
      this.anims.create({
        key: "dead",
        frames: this.anims.generateFrameNumbers("player", { start: 48, end: 50 }),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private handleHit(_p: any, _o: any) {
    if (this.isDead) return;
    this.die();
  }

  private spawnObstacle() {
    if (this.isDead) return;

    const x = this.scale.width + 100;
    const fixedY = this.groundTop + this.GROUND_PAD + 16;

    const ob = this.physics.add.image(x, 0, "obstacle") as Obstacle;
    ob.setOrigin(0.5, 1);
    ob.setScale(this.OBSTACLE_SCALE);
    ob.setPosition(x, fixedY);
    ob.setImmovable(true);
    ob.setVelocityX(-this.speed);
    
    // --- 🛠️ YENİ KOD: Hitbox Ayarı ---
    const body = ob.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    // Engelin orijinal genişlik ve yüksekliğini al
    const w = ob.width;
    const h = ob.height;

    // Kutuyu görselin %60'ı kadar küçült (Yanlardan ve üstten kırp)
    // Bu sayede karakter engele "sürtünse" bile ölmeyecek, tam çarpması gerekecek.
    const shrinkX = 0.6; 
    const shrinkY = 0.6;

    body.setSize(w * shrinkX, h * shrinkY);

    // Kutuyu görselin ortasına hizala (Offset)
    body.setOffset(
        (w - (w * shrinkX)) / 2,  // X'i ortala
        (h - (h * shrinkY))       // Y'yi aşağı hizala (görselin dibine)
    );
    // ----------------------------------

    this.obstacles.add(ob);
  }

  private die() {
    if (this.isDead) return;

    this.isDead = true;
    this.physics.pause();

    this.player.setTint(0xff0000);
    this.startText.setText("Game Over\nTry Again").setVisible(true);

    if (this.player.anims.exists("dead")) this.player.play("dead");

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem("endless_best", String(this.best));
    }
  }

  private startGameIfNeeded() {
    if (this.started) return;
    this.started = true;
    this.startText.setVisible(false);

    if (this.player.anims.exists("run")) this.player.play("run", true);
  }

  private jump() {
    if (this.isDead) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (body.blocked.down || body.touching.down) {
      this.startGameIfNeeded();

      this.player.setVelocityY(this.JUMP_VY);

      if (this.player.anims.exists("jump")) this.player.play("jump");
    }
  }

  update(_time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      if (this.isDead) this.scene.restart();
      else this.jump();
    }

    if (this.started && !this.isDead) {
      this.bg.tilePositionX += this.speed * (delta / 1000) * 0.5;
      this.ground.tilePositionX += this.speed * (delta / 1000);

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      
      // ✅ BURADAKİ DEĞİŞİKLİĞE DİKKAT EDİN
      if (body.blocked.down || body.touching.down) {
        // ❌ SİLİNDİ: this.player.y = this.groundTop; 
        // (Bırakın fizik motoru karakteri zeminin üzerinde tutsun)

        if (
            this.started &&
            this.player.anims.exists("run") &&
            this.player.anims.currentAnim?.key !== "run"
        ) {
            this.player.play("run", true);
        }
      }
    }

    if (!this.started || this.isDead) return;

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
