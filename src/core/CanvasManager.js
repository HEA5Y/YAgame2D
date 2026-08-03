/**
 * CanvasManager - Управление canvas с правильной трансформацией
 * Решает проблему #1: накопительное масштабирование
 */
class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.scale = 1;
        this.dirty = true;
        
        // Кэшированные значения для производительности
        this._cachedWidth = 0;
        this._cachedHeight = 0;
        this._cachedScale = 1;
    }

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d', { 
            alpha: false, // Оптимизация: отключаем прозрачность canvas
            desynchronized: true // Оптимизация: уменьшаем задержку
        });
        
        this.setupResizeHandler();
        this.resize();
        
        Logger.info('CanvasManager', 'CanvasManager initialized');
    }

    setupResizeHandler() {
        // Используем debounce для предотвращения частых вызовов
        let resizeTimeout;
        
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100);
        };

        window.addEventListener('resize', debouncedResize, { passive: true });
        
        // Также слушаем событие orientationchange для мобильных
        window.addEventListener('orientationchange', debouncedResize, { passive: true });
    }

    resize() {
        if (!this.canvas) return;

        const parent = this.canvas.parentElement;
        if (!parent) return;

        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;

        // Вычисляем оптимальный scale для сохранения пропорций
        const logicalWidth = GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH;
        const logicalHeight = GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT;

        const scaleX = parentWidth / logicalWidth;
        const scaleY = parentHeight / logicalHeight;
        
        // Сохраняем пропорции, выбирая меньший scale
        this.scale = Math.min(scaleX, scaleY);
        
        // Ограничиваем scale мин/макс значениями
        this.scale = Math.max(GameConfig.ENGINE.MIN_SCALE, 
                             Math.min(GameConfig.ENGINE.MAX_SCALE, this.scale));

        // Устанавливаем размеры canvas
        this.canvas.width = parentWidth;
        this.canvas.height = parentHeight;
        
        this.width = parentWidth;
        this.height = parentHeight;
        
        // ВАЖНО: используем setTransform вместо accumulate scale
        // Это решает проблему накопительного масштабирования
        this.resetTransform();
        
        // Применяем новый transform
        this.ctx.setTransform(
            this.scale, 0,
            0, this.scale,
            (this.width - logicalWidth * this.scale) / 2,
            (this.height - logicalHeight * this.scale) / 2
        );

        // Обновляем кэш
        this._cachedWidth = this.width;
        this._cachedHeight = this.height;
        this._cachedScale = this.scale;

        this.dirty = true;

        Logger.debug('CanvasManager', `Canvas resized: ${this.width}x${this.height}, scale: ${this.scale.toFixed(2)}`);
        
        // Генерируем событие resize через EventBus
        if (window.gameInstance && window.gameInstance.eventBus) {
            window.gameInstance.eventBus.emit(GameConfig.EVENTS.RESIZE, {
                width: this.width,
                height: this.height,
                scale: this.scale
            });
        }
    }

    resetTransform() {
        // Сбрасываем все трансформации перед применением новых
        if (this.ctx) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }

    clear() {
        if (!this.ctx) return;
        
        // Очищаем весь canvas с учетом текущей трансформации
        this.resetTransform();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Восстанавливаем трансформацию
        this.ctx.setTransform(
            this.scale, 0,
            0, this.scale,
            (this.width - GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH * this.scale) / 2,
            (this.height - GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT * this.scale) / 2
        );
    }

    getCtx() {
        return this.ctx;
    }

    /**
     * Алиас для совместимости с Engine.js
     * @returns {CanvasRenderingContext2D}
     */
    getContext() {
        return this.ctx;
    }

    getWidth() {
        return this._cachedWidth;
    }

    getHeight() {
        return this._cachedHeight;
    }

    getScale() {
        return this._cachedScale;
    }

    screenToWorld(screenX, screenY) {
        // Конвертируем экранные координаты в мировые
        const offsetX = (this.width - GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH * this.scale) / 2;
        const offsetY = (this.height - GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT * this.scale) / 2;
        
        return {
            x: (screenX - offsetX) / this.scale,
            y: (screenY - offsetY) / this.scale
        };
    }

    worldToScreen(worldX, worldY) {
        // Конвертируем мировые координаты в экранные
        const offsetX = (this.width - GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH * this.scale) / 2;
        const offsetY = (this.height - GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT * this.scale) / 2;
        
        return {
            x: worldX * this.scale + offsetX,
            y: worldY * this.scale + offsetY
        };
    }

    destroy() {
        this.canvas = null;
        this.ctx = null;
        Logger.info('CanvasManager', 'CanvasManager destroyed');
    }
}

// Экспортируем глобально
window.CanvasManager = new CanvasManager();