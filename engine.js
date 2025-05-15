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
    
    updateBackground() {
        // 背景更新邏輯（如果需要移動的背景）
        // 目前保持為空函數
    }
    
    drawBackground() {
        // 繪製簡單的星空背景
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updatePowerups() {
        // 道具更新邏輯
        // 目前保持為空函數
    }
    
    drawPowerups() {
        // 繪製道具
        // 目前保持為空函數
    }
    
    spawnEnemy() {
        // 隨機決定敵人類型
        let type = 'default';
        const rand = Math.random();
        
        if (this.wave >= 5 && this.spawnBoss) {
            type = 'boss';
            this.spawnBoss = false;
        } else if (rand < 0.15 * this.difficulty) {
            type = 'fast';
        } else if (rand < 0.25 * this.difficulty) {
            type = 'tank';
        }
        
        // 創建敵人并添加到實體列表
        const enemy = this.createEnemy(type);
        this.entities.push(enemy);
        this.enemiesSpawned++;
    }
    
    update() {
        // 更新玩家
        if (this.player && this.player.health > 0) {
            // 自動向前移動
            const speed = this.player.speed * (this.keys['w'] ? this.player.speedBoost : (this.keys['s'] ? 0.7 : 1));
            this.player.x += Math.cos(this.player.rotation) * speed;
            this.player.y += Math.sin(this.player.rotation) * speed;
            
            // 旋轉
            const rotationSpeed = 0.07; // 增加旋轉速度
            if (this.keys['a'] || this.keys['ArrowLeft']) {
                this.player.rotation -= rotationSpeed;
            }
            if (this.keys['d'] || this.keys['ArrowRight']) {
                this.player.rotation += rotationSpeed;
            }
            
            // 自動射擊
            if (this.player.autoFire) {
                const currentTime = performance.now();
                if (currentTime - this.player.lastShot > this.player.weapon.cooldown) {
                    // 發射子彈
                    const bulletSpeed = 10;
                    const bullet = {
                        x: this.player.x + Math.cos(this.player.rotation) * this.player.size,
                        y: this.player.y + Math.sin(this.player.rotation) * this.player.size,
                        speed: {
                            x: Math.cos(this.player.rotation) * bulletSpeed,
                            y: Math.sin(this.player.rotation) * bulletSpeed
                        },
                        damage: this.player.weapon.damage,
                        size: 5,
                        color: this.player.weapon.color,
                        fromPlayer: true
                    };
                    this.entities.push(bullet);
                    this.player.lastShot = currentTime;
                }
            }
            
            // 限制玩家不能超出畫面
            this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
            this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
        }
        
        // 更新所有實體
        this.entities = this.entities.filter(entity => {
            // 移動敵人
            if (entity.type) {
                // 根據模式移動敵人
                if (entity.pattern === 'chase' && this.player) {
                    const angle = Math.atan2(this.player.y - entity.y, this.player.x - entity.x);
                    entity.rotation = angle;
                    entity.x += Math.cos(angle) * entity.speed;
                    entity.y += Math.sin(angle) * entity.speed;
                } else if (entity.pattern === 'zigzag') {
                    entity.x += Math.cos(this.gameTime / 500) * 2;
                    entity.y += entity.speed;
                } else if (entity.pattern === 'straight') {
                    entity.y += entity.speed;
                } else if (entity.pattern === 'boss') {
                    // Boss移動模式
                    if (entity.y < 100) {
                        entity.y += entity.speed;
                    } else {
                        entity.x += Math.cos(this.gameTime / 1000) * 3;
                    }
                }
                
                // 當敵人超出畫面底部時移除
                if (entity.y > this.canvas.height + entity.size) {
                    return false;
                }
                
                // 敵人射擊
                if (this.player && Math.random() < 0.01 * this.difficulty) {
                    const angle = Math.atan2(this.player.y - entity.y, this.player.x - entity.x);
                    const bulletSpeed = 5;
                    const bullet = {
                        x: entity.x,
                        y: entity.y,
                        speed: {
                            x: Math.cos(angle) * bulletSpeed,
                            y: Math.sin(angle) * bulletSpeed
                        },
                        damage: 10,
                        size: 5,
                        color: entity.color,
                        fromEnemy: true
                    };
                    this.entities.push(bullet);
                }
            }
            
            // 移動子彈
            if (entity.speed && !entity.type) {
                entity.x += entity.speed.x;
                entity.y += entity.speed.y;
                
                // 檢查子彈是否超出畫面
                if (entity.x < 0 || entity.x > this.canvas.width ||
                    entity.y < 0 || entity.y > this.canvas.height) {
                    return false;
                }
                
                // 檢查碰撞
                if (entity.fromPlayer) {
                    // 玩家子彈與敵人碰撞
                    for (const enemy of this.entities) {
                        if (!enemy.type) continue; // 不是敵人則跳過
                        
                        const dx = entity.x - enemy.x;
                        const dy = entity.y - enemy.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < entity.size + enemy.size) {
                            // 碰撞，減少敵人生命值
                            enemy.health -= entity.damage;
                            
                            // 創建爆炸特效
                            this.createExplosion(entity.x, entity.y, entity.color);
                            
                            // 如果敵人生命值低於0，移除敵人
                            if (enemy.health <= 0) {
                                // 增加分數
                                this.score += enemy.points * (1 + this.combo * 0.1);
                                this.combo++;
                                this.lastKillTime = performance.now();
                                this.enemiesDefeated++;
                                
                                // 創建更大的爆炸
                                this.createExplosion(enemy.x, enemy.y, enemy.color);
                                
                                // 移除敵人
                                const enemyIndex = this.entities.indexOf(enemy);
                                if (enemyIndex !== -1) {
                                    this.entities.splice(enemyIndex, 1);
                                }
                            }
                            
                            // 移除子彈
                            return false;
                        }
                    }
                } else if (entity.fromEnemy && this.player) {
                    // 敵人子彈與玩家碰撞
                    const dx = entity.x - this.player.x;
                    const dy = entity.y - this.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < entity.size + this.player.size) {
                        // 碰撞，減少玩家生命值
                        if (this.player.shield > 0) {
                            this.player.shield -= entity.damage;
                            if (this.player.shield < 0) {
                                this.player.health += this.player.shield;
                                this.player.shield = 0;
                            }
                        } else {
                            this.player.health -= entity.damage;
                        }
                        
                        // 創建爆炸特效
                        this.createExplosion(entity.x, entity.y, '#fff');
                        
                        // 如果玩家生命值低於0，遊戲結束
                        if (this.player.health <= 0) {
                            this.gameOver();
                        }
                        
                        // 移除子彈
                        return false;
                    }
                }
            }
            
            return true;
        });
    }
    
    draw() {
        // 繪製玩家
        if (this.player && this.player.health > 0) {
            // 繪製玩家飛機
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(this.player.rotation);
            
            // 主身
            this.ctx.fillStyle = '#0af';
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.size, 0);
            this.ctx.lineTo(-this.player.size / 2, -this.player.size / 2);
            this.ctx.lineTo(-this.player.size / 2, this.player.size / 2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 機翼
            this.ctx.fillStyle = '#08f';
            this.ctx.beginPath();
            this.ctx.moveTo(-this.player.size / 2, -this.player.size / 1.2);
            this.ctx.lineTo(-this.player.size / 1.5, 0);
            this.ctx.lineTo(-this.player.size / 2, this.player.size / 1.2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 如果有護盾，繪製護盾光圈
            if (this.player.shield > 0) {
                this.ctx.strokeStyle = '#0ff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.player.size + 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
        
        // 繪製所有實體
        for (const entity of this.entities) {
            if (entity.type) {
                // 繪製敵人
                this.ctx.fillStyle = entity.color;
                this.ctx.beginPath();
                this.ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 繪製生命條
                const healthBarWidth = entity.size * 2;
                const healthPercent = entity.health / (entity.type === 'boss' ? 300 : entity.type === 'tank' ? 80 : entity.type === 'fast' ? 15 : 20);
                
                this.ctx.fillStyle = '#900';
                this.ctx.fillRect(entity.x - healthBarWidth / 2, entity.y - entity.size - 10, healthBarWidth, 5);
                
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(entity.x - healthBarWidth / 2, entity.y - entity.size - 10, healthBarWidth * healthPercent, 5);
            } else if (entity.speed) {
                // 繪製子彈
                this.ctx.fillStyle = entity.color;
                this.ctx.beginPath();
                this.ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawHUD() {
        // 繪製分數
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Press Start 2P", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, 20, 30);
        
        // 繪製生命條
        if (this.player) {
            // 更新頁面上的生命值與護盾值
            document.getElementById('health-value').textContent = this.player.health;
            document.getElementById('shield-value').textContent = this.player.shield;
            
            // 更新生命條與護盾條
            const healthBar = document.getElementById('health-bar');
            const shieldBar = document.getElementById('shield-bar');
            
            if (healthBar && shieldBar) {
                healthBar.style.width = `${(this.player.health / 150) * 100}%`;
                shieldBar.style.width = `${(this.player.shield / 50) * 100}%`;
            }
        }
        
        // 繪製波數
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`WAVE: ${this.wave}`, this.canvas.width - 20, 30);
        
        // 繪製連擊
        if (this.combo > 1) {
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#f90';
            this.ctx.fillText(`COMBO x${this.combo}`, this.canvas.width / 2, 30);
        }
        
        // 繪製波次提示
        if (this.betweenWaves) {
            const nextWaveIn = Math.ceil((this.waveDelay - (performance.now() - this.waveStartTime)) / 1000);
            
            this.ctx.textAlign = 'center';
            this.ctx.font = '30px "Press Start 2P", monospace';
            this.ctx.fillStyle = '#0ff';
            
            if (this.wave % 5 === 0) {
                this.ctx.fillText(`BOSS WAVE ${this.wave}`, this.canvas.width / 2, this.canvas.height / 2 - 50);
            } else {
                this.ctx.fillText(`WAVE ${this.wave}`, this.canvas.width / 2, this.canvas.height / 2 - 50);
            }
            
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.fillText(`Next wave in ${nextWaveIn}s`, this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    checkAchievements() {
        // 判斷應做的成就
        // 目前保持為空函數
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

    gameOver() {
        this.stop();
        
        // Update final score
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-wave').textContent = this.wave;
        
        // Show game over screen
        document.getElementById('game-over').classList.remove('hidden');
    }
}
