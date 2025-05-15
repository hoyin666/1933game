window.addEventListener('load', () => {
    if (typeof GameEngine === 'undefined') {
        console.error('GameEngine not loaded');
        return;
    }
    const game = new GameEngine('game-canvas');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');

    // 初始化玩家
    game.player = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        speed: 4,           // 降低基礎速度
        speedBoost: 1.2,    // 增加加速效果
        rotation: 0,
        size: 25,          // 增大玩家飛機大小
        health: 150,       // 增加生命值
        shield: 50,        // 開始就有護盾
        weapon: game.createWeapon('default'),
        lastShot: 0,
        autoFire: true     // 自動射擊
    };

    // 遊戲更新邏輯
    game.update = function() {
        // 玩家移動
        // 永遠向前移動，但可以減速
        let speedMultiplier = this.player.speedBoost;
        if (this.keys['s'] || this.touchControls.down) {
            speedMultiplier *= 0.5;  // 按S減速
        }
        if (this.keys['w'] || this.touchControls.up) {
            speedMultiplier *= 1.5;  // 按W加速
        }
        
        // 基礎前進速度
        this.player.x += Math.cos(this.player.rotation) * this.player.speed * speedMultiplier;
        this.player.y += Math.sin(this.player.rotation) * this.player.speed * speedMultiplier;
        
        // 增加轉向速度
        if (this.keys['a'] || this.touchControls.left) {
            this.player.rotation -= 0.08;
        }
        if (this.keys['d'] || this.touchControls.right) {
            this.player.rotation += 0.08;
        }

        // 自動射擊
        if ((this.player.autoFire || this.keys[' '] || this.touchControls.fire) && 
            performance.now() - this.player.lastShot > this.player.weapon.fireRate) {
            this.player.lastShot = performance.now();
            
            if (this.player.weapon.projectileCount) {
                // 散彈槍邏輯
                for (let i = 0; i < this.player.weapon.projectileCount; i++) {
                    const spread = (Math.random() - 0.5) * this.player.weapon.spread;
                    this.entities.push({
                        type: 'projectile',
                        x: this.player.x,
                        y: this.player.y,
                        rotation: this.player.rotation + spread,
                        speed: this.player.weapon.projectileSpeed,
                        size: this.player.weapon.projectileSize,
                        color: this.player.weapon.color,
                        damage: this.player.weapon.damage
                    });
                }
            } else {
                // 一般射擊邏輯
                this.entities.push({
                    type: 'projectile',
                    x: this.player.x,
                    y: this.player.y,
                    rotation: this.player.rotation,
                    speed: this.player.weapon.projectileSpeed,
                    size: this.player.weapon.projectileSize,
                    color: this.player.weapon.color,
                    damage: this.player.weapon.damage,
                    homing: this.player.weapon.homing
                });
            }
        }

        // 更新實體
        this.entities = this.entities.filter(entity => {
            // 移動投射物
            if (entity.type === 'projectile') {
                if (entity.homing) {
                    // 導彈追蹤邏輯
                    const target = this.entities.find(e => e.type === 'enemy');
                    if (target) {
                        const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
                        entity.rotation = angle;
                    }
                }
                entity.x += Math.cos(entity.rotation) * entity.speed;
                entity.y += Math.sin(entity.rotation) * entity.speed;
                
                // 檢查碰撞
                const enemy = this.entities.find(e => 
                    e.type === 'enemy' && 
                    Math.hypot(e.x - entity.x, e.y - entity.y) < e.size + entity.size
                );
                
                if (enemy) {
                    enemy.health -= entity.damage;
                    this.createExplosion(entity.x, entity.y, entity.color);
                    
                    if (enemy.health <= 0) {
                        this.score += enemy.points * (1 + this.combo * 0.1);
                        this.combo++;
                        this.lastKillTime = performance.now();
                        this.enemiesDefeated++;
                        
                        // 掉落道具
                        if (Math.random() < 0.2) {
                            const types = ['health', 'shield', 'speed', 'weapon'];
                            this.powerups.push({
                                ...this.createPowerup(types[Math.floor(Math.random() * types.length)]),
                                x: enemy.x,
                                y: enemy.y
                            });
                        }
                        
                        return false;
                    }
                    return false;
                }
                
                // 移除出界的投射物
                return entity.x >= 0 && entity.x <= this.canvas.width &&
                       entity.y >= 0 && entity.y <= this.canvas.height;
            }
            
            // 敵人行為
            if (entity.type === 'enemy') {
                switch(entity.pattern) {
                    case 'chase':
                        const angle = Math.atan2(this.player.y - entity.y, this.player.x - entity.x);
                        entity.x += Math.cos(angle) * entity.speed;
                        entity.y += Math.sin(angle) * entity.speed;
                        break;
                    case 'zigzag':
                        entity.x += Math.cos(this.gameTime * 0.005) * entity.speed;
                        entity.y += entity.speed;
                        break;
                    case 'straight':
                        entity.y += entity.speed;
                        break;
                    case 'complex':
                        entity.x += Math.cos(this.gameTime * 0.002) * entity.speed * 2;
                        entity.y += Math.sin(this.gameTime * 0.002) * entity.speed;
                        if (Math.random() < 0.02) {
                            this.entities.push({
                                type: 'projectile',
                                x: entity.x,
                                y: entity.y,
                                rotation: Math.atan2(this.player.y - entity.y, this.player.x - entity.x),
                                speed: 5,
                                size: 5,
                                color: '#f00',
                                damage: 10
                            });
                        }
                        break;
                }
                
                // 檢查與玩家的碰撞
                if (Math.hypot(this.player.x - entity.x, this.player.y - entity.y) < this.player.size + entity.size) {
                    if (this.player.shield > 0) {
                        this.player.shield -= 10;
                        this.createExplosion(this.player.x, this.player.y, '#00f');
                    } else {
                        this.player.health -= 10;
                        this.createExplosion(this.player.x, this.player.y, '#f00');
                    }
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                    return false;
                }
                
                return entity.y < this.canvas.height + 100;
            }
            
            return true;
        });
    };

    // 遊戲渲染邏輯
    game.draw = function() {
        // 繪製玩家
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.rotation);
        
        // 飛機主體
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.moveTo(20, 0);
        this.ctx.lineTo(-10, -10);
        this.ctx.lineTo(-10, 10);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 如果有護盾，畫出護盾效果
        if (this.player.shield > 0) {
            this.ctx.strokeStyle = '#00f';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // 繪製實體
        this.entities.forEach(entity => {
            this.ctx.save();
            this.ctx.translate(entity.x, entity.y);
            
            if (entity.type === 'projectile') {
                this.ctx.fillStyle = entity.color;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (entity.type === 'enemy') {
                this.ctx.fillStyle = entity.color;
                this.ctx.beginPath();
                if (entity.isBoss) {
                    // Boss的特殊外觀
                    this.ctx.moveTo(0, -entity.size);
                    for (let i = 0; i < 8; i++) {
                        const angle = (i * Math.PI * 2) / 8;
                        const radius = i % 2 === 0 ? entity.size : entity.size * 0.6;
                        this.ctx.lineTo(
                            Math.cos(angle) * radius,
                            Math.sin(angle) * radius
                        );
                    }
                } else {
                    // 一般敵人的外觀
                    this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
                }
                this.ctx.fill();
                
                // 顯示血量條
                const healthWidth = entity.size * 2;
                const healthHeight = 4;
                this.ctx.fillStyle = '#600';
                this.ctx.fillRect(-healthWidth/2, -entity.size - 10, healthWidth, healthHeight);
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(
                    -healthWidth/2,
                    -entity.size - 10,
                    healthWidth * (entity.health / entity.maxHealth),
                    healthHeight
                );
            }
            
            this.ctx.restore();
        });
        
        // 繪製道具
        this.powerups.forEach(powerup => {
            this.ctx.save();
            this.ctx.translate(powerup.x, powerup.y);
            this.ctx.fillStyle = powerup.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, powerup.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    };

    // 生成敵人
    game.spawnEnemy = function() {
        const types = ['default', 'fast', 'tank'];
        const type = this.spawnBoss ? 'boss' : types[Math.floor(Math.random() * types.length)];
        const enemy = this.createEnemy(type);
        
        this.entities.push({
            type: 'enemy',
            x: Math.random() * this.canvas.width,
            y: -50,
            ...enemy,
            maxHealth: enemy.health
        });
        
        this.enemiesSpawned++;
        this.spawnBoss = false;
    };

    // 更新道具
    game.updatePowerups = function() {
        this.powerups = this.powerups.filter(powerup => {
            if (Math.hypot(this.player.x - powerup.x, this.player.y - powerup.y) < this.player.size + powerup.size) {
                powerup.effect(this.player);
                return false;
            }
            return true;
        });
    };

    // 檢查成就
    game.checkAchievements = function() {
        if (!this.achievements.firstKill.earned && this.score > 0) {
            this.achievements.firstKill.earned = true;
            this.createFloatingText('Achievement: First Blood!', this.canvas.width/2, 100, '#ff0');
        }
        if (!this.achievements.combo10.earned && this.combo >= 10) {
            this.achievements.combo10.earned = true;
            this.createFloatingText('Achievement: Combo Master!', this.canvas.width/2, 100, '#ff0');
        }
        if (!this.achievements.wave5.earned && this.wave >= 5) {
            this.achievements.wave5.earned = true;
            this.createFloatingText('Achievement: Survivor!', this.canvas.width/2, 100, '#ff0');
        }
        if (!this.achievements.score1000.earned && this.score >= 1000) {
            this.achievements.score1000.earned = true;
            this.createFloatingText('Achievement: Point Hoarder!', this.canvas.width/2, 100, '#ff0');
        }
    };

    // 遊戲結束
    game.gameOver = function() {
        this.stop();
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-wave').textContent = this.wave;
        gameOverScreen.classList.remove('hidden');
        
        // 更新高分榜
        this.highScores.push(this.score);
        this.highScores.sort((a, b) => b - a);
        this.highScores = this.highScores.slice(0, 5);
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
    };

    // 開始按鈕事件
    startButton.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        game.start();
    });

    // 重新開始按鈕事件
    restartButton.addEventListener('click', () => {
        window.location.reload();
    });
});

