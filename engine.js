class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.player = null;
        this.keys = {};
        this.touchControls = {
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false
        };
        this.gameTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        this.score = 0;
        this.wave = 1;
        this.difficulty = 1;
        this.spawnRate = 3000; // ms between enemy spawns
        this.lastSpawnTime = 0;
        this.enemiesPerWave = 5;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.waveDelay = 5000; // ms between waves
        this.waveStartTime = 0;
        this.betweenWaves = false;
        this.cloudSpawnRate = 5000;
        this.lastCloudTime = 0;
        
        this.setupEventListeners();
        this.resizeCanvas();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if(e.key === ' ' && this.isRunning) e.preventDefault();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
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
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
            
            // Show HUD
            document.getElementById('hud').classList.remove('hidden');
        }
    }
    
    stop() {
        this.isRunning = false;
        // Hide HUD
        document.getElementById('hud').classList.add('hidden');
    }
    
    restart() {
        this.entities = [];
        this.score = 0;
        this.wave = 1;
        this.difficulty = 1;
        this.lastSpawnTime = 0;
        this.enemiesPerWave = 5;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.betweenWaves = false;
        
        // Update UI
        document.getElementById('score').textContent = this.score;
        document.getElementById('wave').textContent = `Wave ${this.wave}`;
        document.getElementById('health-bar').style.width = '100%';
        
        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');
        
        // Create player
        this.createPlayer();
        
        // Start the game
        this.start();
    }
    
    createPlayer() {
        this.player = {
            type: 'player',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 40,
            height: 40,
            speed: 0,
            maxSpeed: 5,
            acceleration: 0.1,
            deceleration: 0.05,
            rotation: 0,
            rotationSpeed: 3,
            health: 100,
            maxHealth: 100,
            lastShootTime: 0,
            shootDelay: 300,
            sprite: new Image(),
            isDead: false
        };
        
        this.player.sprite.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 5L15 20H25L20 5Z" fill="#D1D5DB"/>
            <rect x="17" y="19" width="6" height="15" fill="#D1D5DB"/>
            <path d="M11 23L3 28L3 34L17 29L11 23Z" fill="#D1D5DB"/>
            <path d="M29 23L37 28L37 34L23 29L29 23Z" fill="#D1D5DB"/>
        </svg>
        `);
        
        this.entities.push(this.player);
    }
    
    createEnemy() {
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y;
        
        switch(side) {
            case 0: // top
                x = Math.random() * this.canvas.width;
                y = -50;
                break;
            case 1: // right
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 50;
                break;
            case 3: // left
                x = -50;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        const enemy = {
            type: 'enemy',
            x: x,
            y: y,
            width: 35,
            height: 35,
            speed: 1 + Math.random() * this.difficulty * 0.5,
            rotation: 0,
            rotationSpeed: 1,
            health: 3 * this.difficulty,
            lastShootTime: 0,
            shootDelay: 2000 - this.difficulty * 100,
            sprite: new Image(),
            score: 100 * this.difficulty
        };
        
        enemy.sprite.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5 5L13 18H22L17.5 5Z" fill="#F87171"/>
            <rect x="15" y="18" width="5" height="12" fill="#F87171"/>
            <path d="M10 21L3 25L3 30L15 25L10 21Z" fill="#F87171"/>
            <path d="M25 21L32 25L32 30L20 25L25 21Z" fill="#F87171"/>
        </svg>
        `);
        
        this.entities.push(enemy);
        this.enemiesSpawned++;
    }
    
    createBullet(entity, isEnemy = false) {
        const bulletSpeed = 10;
        const radians = entity.rotation * Math.PI / 180;
        
        const bullet = {
            type: 'bullet',
            x: entity.x + Math.sin(radians) * entity.height,
            y: entity.y - Math.cos(radians) * entity.height,
            width: 5,
            height: 10,
            speed: bulletSpeed,
            rotation: entity.rotation,
            isEnemy: isEnemy,
            damage: isEnemy ? 5 : 1,
            sprite: new Image()
        };
        
        bullet.sprite.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="5" height="10" rx="2.5" fill="${isEnemy ? '#F87171' : '#FFFFFF'}"/>
        </svg>
        `);
        
        this.entities.push(bullet);
        
        // Play sound
        this.playSound(isEnemy ? 'enemyShoot' : 'playerShoot');
    }
    
    createCloud() {
        const type = Math.floor(Math.random() * 2) + 1;
        const scale = 0.5 + Math.random() * 1.5;
        
        const cloud = {
            type: 'cloud',
            x: this.canvas.width + 100,
            y: Math.random() * (this.canvas.height / 2),
            width: 100 * scale,
            height: 60 * scale,
            speed: 0.5 + Math.random() * 0.5,
            sprite: new Image()
        };
        
        cloud.sprite.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${type === 1 ? 
            '<ellipse cx="20" cy="30" rx="20" ry="15" fill="rgba(255,255,255,0.1)"/>' +
            '<ellipse cx="50" cy="20" rx="25" ry="20" fill="rgba(255,255,255,0.1)"/>' +
            '<ellipse cx="70" cy="35" rx="20" ry="15" fill="rgba(255,255,255,0.1)"/>' :
            '<ellipse cx="30" cy="20" rx="30" ry="20" fill="rgba(255,255,255,0.1)"/>' +
            '<ellipse cx="60" cy="30" rx="25" ry="20" fill="rgba(255,255,255,0.1)"/>' +
            '<ellipse cx="80" cy="15" rx="15" ry="15" fill="rgba(255,255,255,0.1)"/>'}
        </svg>
        `);
        
        // Insert at beginning of array so clouds are behind everything
        this.entities.unshift(cloud);
    }
    
    createExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.classList.add('explosion');
        explosion.style.left = `${x - 25}px`;
        explosion.style.top = `${y - 25}px`;
        
        explosion.innerHTML = `
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="25" fill="#EC4899" fill-opacity="0.6"/>
            <circle cx="25" cy="25" r="15" fill="#F97316"/>
            <circle cx="25" cy="25" r="5" fill="#FBBF24"/>
        </svg>
        `;
        
        document.getElementById('game-container').appendChild(explosion);
        
        // Remove explosion element after animation
        setTimeout(() => {
            explosion.remove();
        }, 500);
        
        // Play explosion sound
        this.playSound('explosion');
    }
    
    playSound(type) {
        // Would implement actual audio, but using simple audio context for this example
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'playerShoot':
                oscillator.type = 'square';
                oscillator.frequency.value = 440;
                gainNode.gain.value = 0.05;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 50);
                break;
            case 'enemyShoot':
                oscillator.type = 'square';
                oscillator.frequency.value = 220;
                gainNode.gain.value = 0.03;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 50);
                break;
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 100;
                gainNode.gain.value = 0.1;
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 500);
                break;
            case 'hit':
                oscillator.type = 'sine';
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.05;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 100);
                break;
        }
    }
    
    update() {
        // Update game time
        this.gameTime += this.deltaTime;
        
        // Update wave status
        if (this.betweenWaves) {
            if (this.gameTime - this.waveStartTime > this.waveDelay) {
                this.betweenWaves = false;
                this.wave++;
                this.difficulty = 1 + (this.wave * 0.2);
                this.enemiesPerWave = 5 + Math.floor(this.wave * 1.5);
                this.spawnRate = Math.max(1000, 3000 - this.wave * 200);
                this.enemiesSpawned = 0;
                this.enemiesDefeated = 0;
                document.getElementById('wave').textContent = `Wave ${this.wave}`;
            }
        }
        
        // Spawn enemies
        if (!this.betweenWaves && this.gameTime - this.lastSpawnTime > this.spawnRate && this.enemiesSpawned < this.enemiesPerWave) {
            this.createEnemy();
            this.lastSpawnTime = this.gameTime;
        }
        
        // Spawn clouds
        if (this.gameTime - this.lastCloudTime > this.cloudSpawnRate) {
            this.createCloud();
            this.lastCloudTime = this.gameTime;
        }
        
        // Update player
        if (this.player && !this.player.isDead) {
            // Handle keyboard input
            if (this.keys['w'] || this.keys['arrowup'] || this.touchControls.up) {
                this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + this.player.acceleration);
            } else if (this.keys['s'] || this.keys['arrowdown'] || this.touchControls.down) {
                this.player.speed = Math.max(0, this.player.speed - this.player.deceleration * 2);
            } else {
                this.player.speed = Math.max(0, this.player.speed - this.player.deceleration);
            }
            
            if (this.keys['a'] || this.keys['arrowleft'] || this.touchControls.left) {
                this.player.rotation -= this.player.rotationSpeed;
            }
            if (this.keys['d'] || this.keys['arrowright'] || this.touchControls.right) {
                this.player.rotation += this.player.rotationSpeed;
            }
            
            // Convert rotation to radians for movement calculation
            const radians = this.player.rotation * Math.PI / 180;
            
            // Update player position
            this.player.x += Math.sin(radians) * this.player.speed;
            this.player.y -= Math.cos(radians) * this.player.speed;
            
            // Keep player within bounds
            this.player.x = Math.max(this.player.width / 2, Math.min(this.canvas.width - this.player.width / 2, this.player.x));
            this.player.y = Math.max(this.player.height / 2, Math.min(this.canvas.height - this.player.height / 2, this.player.y));
            
            // Player shooting
            if ((this.keys[' '] || this.touchControls.fire) && this.gameTime - this.player.lastShootTime > this.player.shootDelay) {
                this.createBullet(this.player);
                this.player.lastShootTime = this.gameTime;
            }
        }
        
        // Update all entities
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            
            switch(entity.type) {
                case 'enemy':
                    // Basic AI: Move towards player
                    if (this.player && !this.player.isDead) {
                        // Calculate angle to player
                        const dx = this.player.x - entity.x;
                        const dy = this.player.y - entity.y;
                        const targetAngle = Math.atan2(dx, -dy) * 180 / Math.PI;
                        
                        // Gradually rotate towards player
                        let angleDiff = targetAngle - entity.rotation;
                        
                        // Normalize angle difference to -180 to 180
                        while (angleDiff > 180) angleDiff -= 360;
                        while (angleDiff < -180) angleDiff += 360;
                        
                        if (Math.abs(angleDiff) < entity.rotationSpeed) {
                            entity.rotation = targetAngle;
                        } else if (angleDiff > 0) {
                            entity.rotation += entity.rotationSpeed;
                        } else {
                            entity.rotation -= entity.rotationSpeed;
                        }
                        
                        // Move forward
                        const radians = entity.rotation * Math.PI / 180;
                        entity.x += Math.sin(radians) * entity.speed;
                        entity.y -= Math.cos(radians) * entity.speed;
                        
                        // Shoot at player
                        if (this.gameTime - entity.lastShootTime > entity.shootDelay) {
                            this.createBullet(entity, true);
                            entity.lastShootTime = this.gameTime;
                        }
                    }
                    break;
                    
                case 'bullet':
                    // Move bullet
                    const radians = entity.rotation * Math.PI / 180;
                    entity.x += Math.sin(radians) * entity.speed;
                    entity.y -= Math.cos(radians) * entity.speed;
                    
                    // Remove bullets that go off screen
                    if (entity.x < -entity.width || entity.x > this.canvas.width + entity.width ||
                        entity.y < -entity.height || entity.y > this.canvas.height + entity.height) {
                        this.entities.splice(i, 1);
                        i--;
                        continue;
                    }
                    
                    // Check for collisions
                    for (let j = 0; j < this.entities.length; j++) {
                        const target = this.entities[j];
                        
                        // Skip itself and entities of the same side (player/enemy)
                        if (i === j || (entity.isEnemy && target.type === 'enemy') || (!entity.isEnemy && target.type === 'player')) {
                            continue;
                        }
                        
                        // Skip non-hittable entities
                        if (target.type !== 'player' && target.type !== 'enemy') {
                            continue;
                        }
                        
                        // Simple collision detection
                        if (this.checkCollision(entity, target)) {
                            // Damage target
                            if (target.health) {
                                target.health -= entity.damage;
                                
                                // Play hit sound
                                this.playSound('hit');
                                
                                // Check if target is destroyed
                                if (target.health <= 0) {
                                    if (target.type === 'enemy') {
                                        // Add score
                                        this.score += target.score;
                                        document.getElementById('score').textContent = this.score;
                                        
                                        // Create explosion
                                        this.createExplosion(target.x, target.y);
                                        
                                        // Remove enemy
                                        this.entities.splice(j, 1);
                                        this.enemiesDefeated++;
                                        
                                        // Check if wave is complete
                                        if (this.enemiesDefeated >= this.enemiesPerWave) {
                                            this.betweenWaves = true;
                                            this.waveStartTime = this.gameTime;
                                        }
                                        
                                        if (j < i) i--;
                                        j--;
                                    } else if (target.type === 'player') {
                                        // Player is dead
                                        target.isDead = true;
                                        
                                        // Create explosion
                                        this.createExplosion(target.x, target.y);
                                        
                                        // Game over
                                        setTimeout(() => {
                                            this.gameOver();
                                        }, 1000);
                                    }
                                } else if (target.type === 'player') {
                                    // Update health bar
                                    const healthPercent = (target.health / target.maxHealth) * 100;
                                    document.getElementById('health-bar').style.width = `${healthPercent}%`;
                                }
                            }
                            
                            // Remove bullet
                            this.entities.splice(i, 1);
                            i--;
                            break;
                        }
                    }
                    break;
                    
                case 'cloud':
                    // Move cloud from right to left
                    entity.x -= entity.speed;
                    
                    // Remove clouds that go off screen
                    if (entity.x < -entity.width) {
                        this.entities.splice(i, 1);
                        i--;
                    }
                    break;
            }
        }
    }
    
    checkCollision(a, b) {
        return !(
            a.x + a.width / 2 < b.x - b.width / 2 ||
            a.x - a.width / 2 > b.x + b.width / 2 ||
            a.y + a.height / 2 < b.y - b.height / 2 ||
            a.y - a.height / 2 > b.y + b.height / 2
        );
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render stars
        this.renderStars();
        
        // Render all entities
        for (const entity of this.entities) {
            this.ctx.save();
            
            // Translate to entity position and rotate
            this.ctx.translate(entity.x, entity.y);
            this.ctx.rotate(entity.rotation * Math.PI / 180);
            
            // Draw entity
            if (entity.sprite && entity.sprite.complete) {
                this.ctx.drawImage(
                    entity.sprite,
                    -entity.width / 2,
                    -entity.height / 2,
                    entity.width,
                    entity.height
                );
            } else {
                // Fallback shape if sprite is not loaded
                this.ctx.fillStyle = entity.type === 'player' ? 'white' : 
                                    entity.type === 'enemy' ? 'red' : 
                                    entity.type === 'bullet' ? (entity.isEnemy ? 'red' : 'white') : 
                                    'rgba(255, 255, 255, 0.1)';
                this.ctx.fillRect(
                    -entity.width / 2,
                    -entity.height / 2,
                    entity.width,
                    entity.height
                );
            }
            
            this.ctx.restore();
        }
    }
    
    renderStars() {
        // Create a starfield effect
        const numStars = 100;
        const starSize = 1;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        
        for (let i = 0; i < numStars; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.ctx.fillRect(x, y, starSize, starSize);
        }
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
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
