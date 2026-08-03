/**
 * Класс ParticleManager
 * Система частиц для визуальных эффектов. Использует ObjectPoolManager для zero-GC.
 * Интегрируется в игровой цикл через пулы (update + render).
 */
class ParticleManager {
    /**
     * @param {ObjectPoolManager} poolManager
     */
    constructor(poolManager) {
        this.pool = poolManager;
        this.initPool();
    }

    initPool() {
        if (!this.pool) {
            Logger.error('ParticleManager', 'ObjectPoolManager не передан!');
            return;
        }
        
        this.pool.createPool('particle', () => new Particle(), 100);
        Logger.info('ParticleManager', 'Пул частиц создан (стартовый размер: 100)');
    }

    /**
     * Эмиттить партиклы
     * @param {number} x
     * @param {number} y
     * @param {Object} config
     */
    emit(x, y, config = {}) {
        if (!this.pool) return;

        const count = config.count || 10;
        const colors = config.colors || ['#ff0055', '#ff5500', '#ffffff'];
        const minSpeed = config.minSpeed || 50;
        const maxSpeed = config.maxSpeed || 200;
        const minLife = config.minLife || 0.5;
        const maxLife = config.maxLife || 1.5;
        const gravity = config.gravity || 100;
        const spread = config.spread || Math.PI * 2;
        const angle = config.angle !== undefined ? config.angle : -Math.PI / 2;

        for (let i = 0; i < count; i++) {
            const p = this.pool.spawn('particle');
            if (!p) continue;

            const particleAngle = angle + (Math.random() - 0.5) * spread;
            const speed = MathUtils.randomRange(minSpeed, maxSpeed);

            p.reset(
                x,
                y,
                Math.cos(particleAngle) * speed,
                Math.sin(particleAngle) * speed,
                MathUtils.randomRange(minLife, maxLife),
                MathUtils.randomElement(colors),
                MathUtils.randomRange(2, 6),
                gravity,
                config.shape || 'circle'
            );
        }
    }

    /**
     * Готовые пресеты эффектов
     */
    burst(x, y, color = '#ff0055') {
        this.emit(x, y, { count: 15, colors: [color, '#ffffff'], minSpeed: 80, maxSpeed: 250, gravity: 150 });
    }

    spark(x, y) {
        this.emit(x, y, { count: 8, colors: ['#ffff00', '#ffaa00'], minSpeed: 30, maxSpeed: 100, gravity: 50, minLife: 0.3, maxLife: 0.8 });
    }

    smoke(x, y) {
        this.emit(x, y, { count: 5, colors: ['#555555', '#777777', '#999999'], minSpeed: 20, maxSpeed: 60, gravity: -30, minLife: 1, maxLife: 2.5, spread: 0.5 });
    }

    stars(x, y) {
        this.emit(x, y, { count: 20, colors: ['#ffd700', '#ffec8b', '#ffffff'], minSpeed: 100, maxSpeed: 300, gravity: 80, shape: 'star' });
    }
}

/**
 * Класс Particle
 * Отдельная частица. Поддерживает интерфейс пула (reset, update, render).
 */
class Particle {
    constructor() {
        this.isActive = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.color = '#ffffff';
        this.size = 4;
        this.gravity = 0;
        this.shape = 'circle';
        this.alpha = 1;
        this.rotation = 0;
        this.rotSpeed = 0;
    }

    reset(x, y, vx, vy, life, color, size, gravity, shape) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.gravity = gravity;
        this.shape = shape;
        this.alpha = 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 4;
    }

    /**
     * @param {number} dt
     * @returns {boolean} true если частица "умерла"
     */
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) return true;

        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;

        // Fade out
        this.alpha = this.life / this.maxLife;

        return false;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size * this.alpha, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.shape === 'star') {
            this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
        }

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}