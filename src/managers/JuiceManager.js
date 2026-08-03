/**
 * JuiceManager - Визуальные эффекты, сочность игры (Juice)
 */
class JuiceManager {
    constructor() {
        this.shakeIntensity = 0;
        this.flashOpacity = 0;
        this.flashColor = '#ffffff';
        this.confettiParticles = [];
        this.fireworksParticles = [];
        this.comboCount = 0;
        this.comboTimer = 0; // ← теперь в СЕКУНДАХ
        this.lastActionTime = 0;
        this.criticalChance = 0.1; // 10% шанс крита
        this.criticalMultiplier = 3;
        
        this.listeners = [];
    }

    init() {
        gameEventBus.on('trigger_shake', this.triggerShake.bind(this));
        gameEventBus.on('trigger_flash', this.triggerFlash.bind(this));
        gameEventBus.on('spawn_confetti', this.spawnConfetti.bind(this));
        gameEventBus.on('spawn_fireworks', this.spawnFireworks.bind(this));
        gameEventBus.on('action_performed', this.handleAction.bind(this));
        gameEventBus.on('production_complete', this.checkCritical.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    // Тряска экрана
    triggerShake(intensity = 5, duration = 0.3) { // ← duration теперь в секундах
        this.shakeIntensity = intensity;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000; // ← в секундах
            const progress = elapsed / duration;
            
            if (progress < 1) {
                this.shakeIntensity = intensity * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.shakeIntensity = 0;
            }
        };
        
        requestAnimationFrame(animate);
        this.notifyListeners();
    }

    // Вспышка экрана
    triggerFlash(color = '#ffffff', duration = 0.2) { // ← duration теперь в секундах
        this.flashOpacity = 0.8;
        this.flashColor = color;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000; // ← в секундах
            const progress = elapsed / duration;
            
            if (progress < 1) {
                this.flashOpacity = 0.8 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.flashOpacity = 0;
            }
        };
        
        requestAnimationFrame(animate);
        this.notifyListeners();
    }

    // Конфетти
    spawnConfetti(count = 50, originX = null, originY = null) {
        const colors = ['#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#4ade80', '#fbbf24', '#f97316'];
        
        for (let i = 0; i < count; i++) {
            const x = originX || window.innerWidth / 2;
            const y = originY || window.innerHeight / 2;
            
            this.confettiParticles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 800,
                vy: (Math.random() - 0.5) * 800 - 200,
                gravity: 400,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 720,
                size: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: Math.random() * 0.5 + 0.5
            });
        }
        
        this.notifyListeners();
    }

    // Фейерверк
    spawnFireworks(x = null, y = null) {
        const startX = x || window.innerWidth / 2 + (Math.random() - 0.5) * 400;
        const startY = y || window.innerHeight - 100;
        
        // Запуск ракеты
        const rocket = {
            x: startX,
            y: startY,
            vy: -800 - Math.random() * 200,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            exploded: false
        };
        
        this.fireworksParticles.push(rocket);
        
        // Анимация и взрыв обрабатываются в update
        this.notifyListeners();
    }

    // Обработка действий для комбо
    handleAction() {
        const now = Date.now();
        const timeDiff = (now - this.lastActionTime) / 1000; // ← в секундах
        
        if (timeDiff < 2.0) { // ← 2 секунды на комбо (было 2000 мс)
            this.comboCount++;
            this.comboTimer = 2.0; // ← в секундах
            
            if (this.comboCount >= 5) {
                gameEventBus.emit('combo_milestone', { count: this.comboCount });
                this.triggerFlash('#fbbf24', 0.1);
            }
            
            if (this.comboCount >= 10) {
                this.spawnConfetti(30);
                this.triggerShake(3, 0.2);
            }
        } else {
            this.comboCount = 1;
            this.comboTimer = 2.0;
        }
        
        this.lastActionTime = now;
        this.notifyListeners();
    }

    // Проверка на критическое производство
    checkCritical(baseAmount) {
        if (Math.random() < this.criticalChance) {
            const criticalAmount = Math.floor(baseAmount * this.criticalMultiplier);
            const bonus = criticalAmount - baseAmount;
            
            gameEventBus.emit('critical_production', { 
                base: baseAmount, 
                bonus: bonus, 
                multiplier: this.criticalMultiplier 
            });
            
            this.triggerFlash('#fbbf24', 0.15);
            this.triggerShake(4, 0.25);
            
            return criticalAmount;
        }
        return baseAmount;
    }

    update(deltaTime) {
        // Обновление таймера комбо
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime; // ← теперь оба в секундах
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.comboTimer = 0;
            }
        }

        // Обновление конфетти
        for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
            const p = this.confettiParticles[i];
            p.vy += p.gravity * deltaTime;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.rotation += p.rotationSpeed * deltaTime;
            p.life -= p.decay * deltaTime;
            
            if (p.life <= 0 || p.y > window.innerHeight) {
                this.confettiParticles.splice(i, 1);
            }
        }

        // Обновление фейерверков
        for (let i = this.fireworksParticles.length - 1; i >= 0; i--) {
            const fw = this.fireworksParticles[i];
            
            if (!fw.exploded) {
                fw.vy += 30 * deltaTime; // Гравитация
                fw.y += fw.vy * deltaTime;
                
                // Взрыв на пике
                if (fw.vy >= 0) {
                    fw.exploded = true;
                    this.explodeFirework(fw);
                    this.fireworksParticles.splice(i, 1);
                }
            }
        }
        
        this.notifyListeners();
    }

    explodeFirework(rocket) {
        const particleCount = 30 + Math.floor(Math.random() * 20);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 200 + Math.random() * 200;
            
            this.confettiParticles.push({
                x: rocket.x,
                y: rocket.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 300,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 360,
                size: Math.random() * 6 + 3,
                color: rocket.color,
                life: 1,
                decay: 0.8 + Math.random() * 0.4
            });
        }
        
        this.triggerShake(2, 0.15);
    }

    getComboInfo() {
        return {
            count: this.comboCount,
            timer: this.comboTimer,
            active: this.comboCount > 1
        };
    }

    getShakeOffset() {
        if (this.shakeIntensity <= 0) return { x: 0, y: 0 };
        
        return {
            x: (Math.random() - 0.5) * 2 * this.shakeIntensity,
            y: (Math.random() - 0.5) * 2 * this.shakeIntensity
        };
    }
}