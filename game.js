// ============================================
// Run471K - Subway Surfers Style Game
// Ben 10 Character Edition
// ============================================

// গ্লোবাল ভেরিয়েবল
let player;
let obstacles;
let coins;
let score = 0;
let highScore = 0;
let scoreText;
let highScoreText;
let gameOver = false;
let gameSpeed = 6;
let currentLane = 1; // 0=বাম, 1=মাঝ, 2=ডান
let isMoving = false;
let scene;
let isJumping = false;
let playerOriginalY;

// ৩টা লেনের X পজিশন
const LANE_WIDTH = 120;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const CENTER_X = GAME_WIDTH / 2;

// Touch control ভেরিয়েবল
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// ============================================
// Game Configuration
// ============================================
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#2a2a3e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3
    }
};

const game = new Phaser.Game(config);

// ============================================
// PRELOAD - Assets লোড করা
// ============================================
function preload() {
    scene = this;
    
    // Ben 10 ক্যারেক্টার স্প্রাইটশিট লোড
    this.load.spritesheet('player', 'assets/player_spritesheet.png', {
        frameWidth: 416,
        frameHeight: 928,
        margin: 0,
        spacing: 0
    });
    this.load.on('loaderror', (file) => {
        console.error('Could not load game asset:', file.key, file.src);
    });
    
    // আপনার ক্যারেক্টার ইমেজ লোড করতে চাইলে নিচের লাইনটা আনকমেন্ট করুন
    // this.load.image('player', 'assets/character.png');
    
    // এখনকার জন্য placeholder texture তৈরি করছি (যদি spritesheet না থাকে)
    createPlaceholderTextures(this);
}

function createPlaceholderTextures(scene) {
    let g;
    
    // Obstacle placeholder (লাল বাধা)
    g = scene.add.graphics();
    g.fillStyle(0xff3333, 1);
    g.fillRoundedRect(0, 0, 80, 60, 8);
    g.fillStyle(0x880000, 1);
    g.fillRect(10, 10, 60, 10);
    g.fillRect(10, 40, 60, 10);
    g.generateTexture('obstacle', 80, 60);
    g.destroy();
    
    // Coin placeholder (সোনালী কয়েন)
    g = scene.add.graphics();
    g.fillStyle(0xffd700, 1);
    g.fillCircle(15, 15, 15);
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(15, 15, 10);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(15, 15, 5);
    g.generateTexture('coin', 30, 30);
    g.destroy();
    
    // Road texture (রাস্তা)
    g = scene.add.graphics();
    g.fillStyle(0x3a3a4e, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.generateTexture('road', GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
}

// ============================================
// CREATE - গেম শুরু
// ============================================
function create() {
    gameOver = false;
    gameSpeed = 6;
    score = 0;
    currentLane = 1;
    isMoving = false;
    isJumping = false;
    
    // রাস্তা ব্যাকগ্রাউন্ড
    this.add.image(CENTER_X, GAME_HEIGHT / 2, 'road');
    
    // লেনের দাগ
    for (let i = 0; i < 2; i++) {
        const x = CENTER_X + LANES[i] + LANE_WIDTH / 2;
        for (let j = 0; j < 10; j++) {
            const dash = this.add.rectangle(x, j * 80, 4, 40, 0xffffff, 0.5);
            this.tweens.add({
                targets: dash,
                y: GAME_HEIGHT + 80,
                duration: 2000 / (gameSpeed / 6),
                repeat: -1,
                onRepeat: () => { dash.y = -80; }
            });
        }
    }
    
    // সাইডের দেয়াল
    this.add.rectangle(30, GAME_HEIGHT / 2, 10, GAME_HEIGHT, 0x555577);
    this.add.rectangle(GAME_WIDTH - 30, GAME_HEIGHT / 2, 10, GAME_HEIGHT, 0x555577);
    
    // প্লেয়ার তৈরি
    playerOriginalY = GAME_HEIGHT - 120;
    player = this.physics.add.sprite(
        CENTER_X + LANES[currentLane], 
        playerOriginalY, 
        'player'
    );
    player.setScale(0.14);
    player.setFrame(1);
    player.setCollideWorldBounds(true);
    player.setDepth(10);
    
    // The sheet has one standing pose followed by three running poses.
    this.anims.create({
        key: 'idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1
    });
    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('player', { start: 1, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'jump',
        frames: [{ key: 'player', frame: 3 }],
        frameRate: 1
    });
    player.anims.play('run');
    
    // Obstacle ও Coin গ্রুপ
    obstacles = this.physics.add.group();
    coins = this.physics.add.group();
    
    // Collision detection
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    
    // Score টেক্সট
    scoreText = this.add.text(20, 20, 'Score: 0', {
        fontSize: '22px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setDepth(20);
    
    highScoreText = this.add.text(GAME_WIDTH - 20, 20, 'Best: 0', {
        fontSize: '18px',
        fill: '#ffd700',
        fontFamily: 'Arial'
    }).setOrigin(1, 0).setDepth(20);
    
    // Obstacle spawn টাইমার
    this.time.addEvent({
        delay: 1200,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });
    
    // Coin spawn টাইমার
    this.time.addEvent({
        delay: 800,
        callback: spawnCoinLine,
        callbackScope: this,
        loop: true
    });
    
    // কীবোর্ড কন্ট্রোল
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    
    // টাচ কন্ট্রোল (মোবাইলের জন্য)
    this.input.on('pointerdown', handleTouchStart);
    this.input.on('pointerup', handleTouchEnd);
}

// ============================================
// UPDATE - প্রতি ফ্রেমে চলবে
// ============================================
function update() {
    if (gameOver) return;
    
    // কীবোর্ড ইনপুট চেক
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || 
        Phaser.Input.Keyboard.JustDown(this.keyA)) {
        moveLeft();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || 
        Phaser.Input.Keyboard.JustDown(this.keyD)) {
        moveRight();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
        Phaser.Input.Keyboard.JustDown(this.keyW) ||
        Phaser.Input.Keyboard.JustDown(this.keyUp)) {
        jump();
    }
    
    // Obstacle গুলো নিচে নামানো
    obstacles.children.iterate(function(obstacle) {
        if (obstacle) {
            obstacle.y += gameSpeed;
            if (obstacle.y > GAME_HEIGHT + 100) {
                obstacle.destroy();
            }
        }
    });
    
    // Coin গুলো নিচে নামানো
    coins.children.iterate(function(coin) {
        if (coin) {
            coin.y += gameSpeed;
            coin.rotation += 0.1; // ঘোরানো ইফেক্ট
            if (coin.y > GAME_HEIGHT + 100) {
                coin.destroy();
            }
        }
    });
    
    // স্কোর বাড়ানো
    score += 1;
    scoreText.setText('Score: ' + Math.floor(score / 10));
    
    // প্রতি ১০০০ স্কোরে স্পীড বাড়ানো
    if (score > 0 && score % 1000 === 0) {
        gameSpeed += 0.5;
    }
}

// ============================================
// Movement Functions
// ============================================
function moveLeft() {
    if (currentLane > 0 && !isMoving && !gameOver && !isJumping) {
        currentLane--;
        isMoving = true;
        const targetX = CENTER_X + LANES[currentLane];
        
        scene.tweens.add({
            targets: player,
            x: targetX,
            duration: 150,
            ease: 'Power2',
            onComplete: () => { isMoving = false; }
        });
    }
}

function moveRight() {
    if (currentLane < 2 && !isMoving && !gameOver && !isJumping) {
        currentLane++;
        isMoving = true;
        const targetX = CENTER_X + LANES[currentLane];
        
        scene.tweens.add({
            targets: player,
            x: targetX,
            duration: 150,
            ease: 'Power2',
            onComplete: () => { isMoving = false; }
        });
    }
}

function jump() {
    if (!isJumping && !gameOver) {
        isJumping = true;
        
        // Jump animation play (যদি থাকে)
        try {
            player.anims.play('jump');
        } catch (e) {
            // No animation available
        }
        
        scene.tweens.add({
            targets: player,
            y: playerOriginalY - 120,
            duration: 300,
            ease: 'Power2.out',
            onComplete: () => {
                scene.tweens.add({
                    targets: player,
                    y: playerOriginalY,
                    duration: 300,
                    ease: 'Power2.in',
                    onComplete: () => {
                        isJumping = false;
                        if (!gameOver) {
                            try {
                                player.anims.play('run');
                            } catch (e) {
                                // No animation available
                            }
                        }
                    }
                });
            }
        });
    }
}

// ============================================
// Spawn Functions
// ============================================
function spawnObstacle() {
    if (gameOver) return;
    
    // ১-২টা লেনে obstacle তৈরি (৩টা একসাথে না, তাহলে পার করা যাবে না)
    const numObstacles = Phaser.Math.Between(1, 2);
    const usedLanes = [];
    
    for (let i = 0; i < numObstacles; i++) {
        let lane;
        do {
            lane = Phaser.Math.Between(0, 2);
        } while (usedLanes.includes(lane));
        usedLanes.push(lane);
        
        const x = CENTER_X + LANES[lane];
        const obstacle = obstacles.create(x, -60, 'obstacle');
        obstacle.setImmovable(true);
    }
}

function spawnCoinLine() {
    if (gameOver) return;
    
    // একটা লেনে ৩-৫টা কয়েন
    const lane = Phaser.Math.Between(0, 2);
    const x = CENTER_X + LANES[lane];
    const count = Phaser.Math.Between(3, 5);
    
    for (let i = 0; i < count; i++) {
        const coin = coins.create(x, -30 - (i * 50), 'coin');
    }
}

// ============================================
// Collision Functions
// ============================================
function collectCoin(playerSprite, coin) {
    coin.destroy();
    score += 100;
    
    // সংগ্রহ ইফেক্ট
    const text = scene.add.text(playerSprite.x, playerSprite.y - 30, '+100', {
        fontSize: '18px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    scene.tweens.add({
        targets: text,
        y: text.y - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => text.destroy()
    });
}

function hitObstacle(playerSprite, obstacle) {
    if (gameOver) return;
    
    gameOver = true;
    scene.physics.pause();
    
    // হাই স্কোর আপডেট
    const finalScore = Math.floor(score / 10);
    if (finalScore > highScore) {
        highScore = finalScore;
    }
    highScoreText.setText('Best: ' + highScore);
    
    // প্লেয়ার লাল হয়ে যাবে
    playerSprite.setTint(0xff0000);
    
    // Shake ইফেক্ট
    scene.cameras.main.shake(300, 0.01);
    
    // Game Over UI
    const overlay = scene.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    overlay.setDepth(30);
    
    const gameOverText = scene.add.text(CENTER_X, 250, 'GAME OVER', {
        fontSize: '48px',
        fill: '#ff3333',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 6
    }).setOrigin(0.5).setDepth(31);
    
    const finalScoreText = scene.add.text(CENTER_X, 320, 'Score: ' + finalScore, {
        fontSize: '28px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(31);
    
    const bestText = scene.add.text(CENTER_X, 360, 'Best: ' + highScore, {
        fontSize: '22px',
        fill: '#ffd700',
        fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(31);
    
    const restartText = scene.add.text(CENTER_X, 450, ' Tap to Restart', {
        fontSize: '24px',
        fill: '#00ffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(31);
    
    // Blink effect
    scene.tweens.add({
        targets: restartText,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    // Restart ইনপুট
    scene.time.delayedCall(800, () => {
        scene.input.once('pointerdown', () => {
            scene.scene.restart();
        });
        scene.input.keyboard.once('keydown', () => {
            scene.scene.restart();
        });
    });
}

// ============================================
// Touch Controls (মোবাইলের জন্য)
// ============================================
function handleTouchStart(pointer) {
    touchStartX = pointer.x;
    touchStartY = pointer.y;
    touchStartTime = Date.now();
}

function handleTouchEnd(pointer) {
    if (gameOver) return;
    
    const deltaX = pointer.x - touchStartX;
    const deltaY = pointer.y - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    // Swipe detection (দ্রুত এবং যথেষ্ট দূরত্বে)
    if (deltaTime < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe - Left/Right
            if (deltaX > 30) {
                moveRight();
            } else if (deltaX < -30) {
                moveLeft();
            }
        } else {
            // Vertical swipe
            if (deltaY < -30) {
                // উপরে swipe = jump
                jump();
            }
        }
    }
}