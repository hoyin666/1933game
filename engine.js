class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.isRunning = false;
        this.lastTime = 0;
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

    gameOver() {
        this.stop();
        
        // Update final score
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-wave').textContent = this.wave;
        
        // Show game over screen
        document.getElementById('game-over').classList.remove('hidden');
    }
}
