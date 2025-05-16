window.GameEngine = class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.particles = [];
        this.powerups = [];
        this.player = null;
        // 初始化所有可能的按鍵狀態
        this.keys = {
            'w': false,
            's': false,
            'a': false,
            'd': false,
            ' ': false
        };
        this.touchControls = {
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false,
            switchWeapon: false
        };

        // Game state
        this.gameTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        
        // Scoring system
        this.score = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.comboTimeout = 2000; // ms to maintain combo
        this.highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        
        // Wave system
        this.wave = 1;
        this.difficulty = 1;
        this.spawnRate = 4000;       // 降低生成频率
        this.lastSpawnTime = 0;
        this.enemiesPerWave = 4;     // 每波敵人數量減少
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.waveDelay = 8000;       // 增加波次間休息時間
        this.waveStartTime = 0;
        this.betweenWaves = false;
        
        // Visual effects
        this.cloudSpawnRate = 5000;
        this.lastCloudTime = 0;
        this.backgrounds = [];
        this.backgroundSpeed = 0.5;
        
        // Achievement system
        this.achievements = {
            firstKill: { earned: false, name: 'First Blood', description: 'Get your first kill' },
            combo10: { earned: false, name: 'Combo Master', description: 'Achieve a 10x combo' },
            wave5: { earned: false, name: 'Survivor', description: 'Reach wave 5' },
            score1000: { earned: false, name: 'Point Hoarder', description: 'Score 1000 points' },
            killBoss: { earned: false, name: 'Boss Slayer', description: 'Defeat a boss' }
        };
        
        this.setupEventListeners();
        this.resizeCanvas();
    }
    
    createWeapon(type) {
        const weapons = {
            default: {
                name: 'Machine Gun',
                damage: 10,
                fireRate: 200,
                spread: 0.1,
                projectileSpeed: 10,
                projectileSize: 3,
                color: '#fff'
            },
            shotgun: {
                name: 'Shotgun',
                damage: 8,
                fireRate: 800,
                spread: 0.3,
                projectileCount: 5,
                projectileSpeed: 8,
                projectileSize: 2,
                color: '#ff0'
            },
            laser: {
                name: 'Laser',
                damage: 25,
                fireRate: 500,
                spread: 0,
                projectileSpeed: 15,
                projectileSize: 4,
                color: '#f0f'
            },
            missile: {
                name: 'Missile',
                damage: 50,
                fireRate: 1000,
                spread: 0.05,
                projectileSpeed: 6,
                projectileSize: 6,
                color: '#f00',
                homing: true
            }
        };
        return weapons[type] || weapons.default;
    }

    setupEventListeners() {
        // 防止默認的按鍵行為
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            // 處理方向鍵
            if (key === 'arrowup') this.keys['w'] = true;
            else if (key === 'arrowdown') this.keys['s'] = true;
            else if (key === 'arrowleft') this.keys['a'] = true;
            else if (key === 'arrowright') this.keys['d'] = true;
            else this.keys[key] = true;

            // 防止空格滾動頁面
            if ((key === ' ' || 
                key === 'arrowup' || 
                key === 'arrowdown' || 
                key === 'w' || 
                key === 's') && 
                this.isRunning) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            // 處理方向鍵
            if (key === 'arrowup') this.keys['w'] = false;
            else if (key === 'arrowdown') this.keys['s'] = false;
            else if (key === 'arrowleft') this.keys['a'] = false;
            else if (key === 'arrowright') this.keys['d'] = false;
            else this.keys[key] = false;
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Simple touch controls - left half of screen turns left, right half turns right
            if (x < this.canvas.width / 2) {
                this.touchControls.left = true;
            } else {
                this.touchControls.right = true;
            }
            
            // Top half accelerates, bottom half shoots
            if (y < this.canvas.height / 2) {
                this.touchControls.up = true;
            } else {
                this.touchControls.fire = true;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.left = false;
            this.touchControls.right = false;
            this.touchControls.up = false;
            this.touchControls.fire = false;
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle(x, y, color, speed, life, size) {
        return {
            x, y,
            color,
            speed: speed || { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
            life: life || 1000,
            maxLife: life || 1000,
            size: size || 2
        };
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(this.createParticle(x, y, color));
        }
    }

    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime;
            if (particle.life <= 0) return false;

            particle.x += particle.speed.x;
            particle.y += particle.speed.y;
            particle.size *= 0.99;

            return true;
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / particle.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    createEnemy(type) {
        const enemies = {
            default: {
                health: 20,         // 降低生命值
                speed: 1.5,        // 降低速度
                size: 20,
                color: '#f00',
                points: 100,
                pattern: 'chase'
            },
            fast: {
                health: 15,         // 降低生命值
                speed: 3,          // 降低速度
                size: 15,
                color: '#ff0',
                points: 150,
                pattern: 'zigzag'
            },
            tank: {
                health: 80,         // 降低生命值
                speed: 0.8,        // 降低速度
                size: 30,
                color: '#0ff',
                points: 200,
                pattern: 'straight'
            },
            boss: {
                health: 300,        // 降低生命值
                speed: 1,          // 降低速度
                size: 40,
                color: '#f0f',
                points: 500,
                pattern: 'boss'
            }
        };
        
        const enemyType = enemies[type] || enemies.default;
        return {
            x: Math.random() * this.canvas.width,
            y: -50,
            ...enemyType,
            type: type,
            rotation: 0,
            lastShot: 0
        };
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime;
        
        // Update game state
        this.updateParticles(this.deltaTime);
        this.updatePowerups();
        this.updateBackground();
        this.update();
        
        // Check combo timeout
        if (this.combo > 0 && currentTime - this.lastKillTime > this.comboTimeout) {
            this.combo = 0;
        }
        
        // Update wave system
        if (!this.betweenWaves) {
            if (this.enemiesSpawned < this.enemiesPerWave && 
                currentTime - this.lastSpawnTime > this.spawnRate) {
                this.spawnEnemy();
                this.lastSpawnTime = currentTime;
            }
            
            if (this.enemiesDefeated >= this.enemiesPerWave) {
                this.betweenWaves = true;
                this.waveStartTime = currentTime;
                this.wave++;
                this.difficulty = 1 + (this.wave - 1) * 0.15;     // 降低難度增加速度
                this.enemiesPerWave = Math.floor(4 + this.wave);   // 每波敵人增加更慢
                this.spawnRate = Math.max(1000, 4000 - this.wave * 150);  // 降低生成频率
                this.enemiesSpawned = 0;
                this.enemiesDefeated = 0;
                
                // Spawn boss every 5 waves
                if (this.wave % 5 === 0) {
                    this.enemiesPerWave = 1;
                    this.spawnBoss = true;
                }
            }
        } else if (currentTime - this.waveStartTime > this.waveDelay) {
            this.betweenWaves = false;
        }
        
        // Draw everything
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.drawParticles();
        this.drawPowerups();
        this.draw();
        this.drawHUD();
        
        // Check achievements
        this.checkAchievements();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('start-screen').classList.add('hidden');
        }
    }

    stop() {
        this.isRunning = false;
    }

    restart() {
        // Reset game state
        this.entities = [];
        this.particles = [];
        this.powerups = [];
        this.score = 0;
        this.combo = 0;
        this.wave = 1;
        this.difficulty = 1;
        this.lastSpawnTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.betweenWaves = false;

        // Reset player
        if (this.player) {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
            this.player.rotation = 0;
            this.player.health = 150;
            this.player.shield = 50;
        }

        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');

        // Start game
        this.start();
    }
}

// Draw everything
this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
this.drawBackground();
this.drawParticles();
this.drawPowerups();
this.draw();
this.drawHUD();

// Check achievements
this.checkAchievements();

requestAnimationFrame(() => this.gameLoop());
}

start() {
if (!this.isRunning) {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
}
}

stop() {
this.isRunning = false;
}

restart() {
// Reset game state
this.entities = [];
this.particles = [];
this.powerups = [];
this.score = 0;
this.combo = 0;
this.wave = 1;
this.difficulty = 1;
this.lastSpawnTime = 0;
this.enemiesSpawned = 0;
this.enemiesDefeated = 0;
this.betweenWaves = false;

// Reset player
if (this.player) {
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.player.rotation = 0;
    this.player.health = 150;
    this.player.shield = 50;
}

// Hide game over screen
document.getElementById('game-over').classList.add('hidden');

// Start game
this.start();
}

gameOver() {
this.stop();

// Update final score
document.getElementById('final-score').textContent = this.score;
document.getElementById('final-wave').textContent = this.wave;

    // Show game over screen
    document.getElementById('game-over').classList.remove('hidden');
}

drawHUD() {
    // 确保 HUD 容器存在
    const hud = document.getElementById('hud');
    if (!hud) return;

    // 初始化或更新 HUD 元素
    const scoreElement = document.getElementById('score');
    const waveElement = document.getElementById('wave');
    const healthBar = document.getElementById('health-bar');
    const weaponInfo = document.getElementById('weapon-info');
    const highScoreElement = document.getElementById('high-score');

    // 检查每个元素是否存在
    if (scoreElement) {
        scoreElement.textContent = this.score;
    }
    if (waveElement) {
        waveElement.textContent = `Wave ${this.wave}`;
    }
    if (healthBar) {
        healthBar.style.width = `${(this.player.health / 150) * 100}%`;
    }
    if (weaponInfo) {
        weaponInfo.textContent = this.player.weapon.name;
    }
    if (highScoreElement) {
        highScoreElement.textContent = `High: ${localStorage.getItem('highScore') || 0}`;
    }
}
