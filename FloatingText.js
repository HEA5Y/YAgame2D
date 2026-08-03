/**
 * Класс FloatingText
 * Всплывающий текст для частиц и уведомлений. Поддерживает интерфейс пула.
 */
class FloatingText {
    constructor() {
        this.isActive = false;
        this.x = 0;
        this.y = 0;
        this.text = '';
        this.color = '#ffffff';
        this.life = 0;
        this.maxLife = 1.5;
        this.vy = -50; // Скорость подъема
        this.alpha = 1;
        this.scale = 1;
    }

    reset(x, y, text, color = '#ffffff', life = 1.5) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.vy = MathUtils.randomRange(-40, -80);
        this.alpha = 1;
        this.scale = 1;
    }

    /**
     * @param {number} dt
     * @returns {boolean} true если объект "умер"
     */
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) return true;

        this.y += this.vy * dt;
        this.vy *= 0.98; // Замедление
        
        // Fade out
        this.alpha = this.life / this.maxLife;
        this.scale = 1 + (1 - this.alpha) * 0.5;

        return false;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        ctx.fillStyle = this.color;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        
        ctx.restore();
    }
}
