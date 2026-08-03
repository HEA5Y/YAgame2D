/**
 * Класс Worker
 * Сущность работника на фабрике. Отвечает за анимацию и логику усиления линии.
 */
class Worker {
    /**
     * @param {string} id ID работника
     * @param {string} lineId ID линии, на которой он работает
     */
    constructor(id, lineId) {
        this.id = id;
        this.lineId = lineId;
        
        // Позиция для рендера на экране конвейера
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        // Параметры анимации
        this.animTimer = 0;
        this.speed = 100; // пикселей в секунду
        this.state = 'working'; // 'walking', 'working', 'resting'
    }

    /**
     * Установка целевой точки передвижения работника
     */
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.state = 'walking';
    }

    update(dt) {
        if (this.state === 'walking') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 2) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.state = 'working';
            } else {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        } else if (this.state === 'working') {
            // Анимация работы (покачивание)
            this.animTimer += dt * 5;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Временная визуализация работника (круг с эмоцией)
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }
}