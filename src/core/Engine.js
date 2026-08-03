/**
 * Engine.js - Движок игры
 * Управляет игровым циклом, рендерингом и состоянием приложения
 */

class Engine {
    constructor() {
        this.isRunning = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedStep = 1 / 60; // 60 FPS для логики
        this.maxFrameTime = 0.25; // Защита от лагов при переключении вкладок
        
        this.game = null;
        this.canvasManager = null;
        
        Logger.info('Engine', 'Движок создан');
    }

    /**
     * Инициализация движка
     */
    init(gameInstance) {
        this.game = gameInstance;
        this.canvasManager = ManagerRegistry.get('CanvasManager');
        
        if (!this.canvasManager) {
            throw new Error('Engine: CanvasManager не найден!');
        }
        
        this.canvasManager.init();
        Logger.info('Engine', 'Движок инициализирован');
    }

    /**
     * Запуск цикла
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        Logger.info('Engine', 'Цикл запущен');
        
        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Остановка цикла
     */
    stop() {
        this.isRunning = false;
        Logger.info('Engine', 'Цикл остановлен');
    }

    /**
     * Основной цикл
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Ограничение дельты времени
        if (deltaTime > this.maxFrameTime) {
            deltaTime = this.maxFrameTime;
        }

        try {
            // Накопление времени для фиксированного шага
            this.accumulator += deltaTime;

            while (this.accumulator >= this.fixedStep) {
                this.update(this.fixedStep);
                this.accumulator -= this.fixedStep;
            }

            // Рендер с интерполяцией (если нужно) или просто каждый кадр
            this.render();

        } catch (error) {
            Logger.error('Engine', 'Ошибка в цикле:', error);
            // Не прерываем цикл полностью, даем шанс на восстановление
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Обновление логики
     */
    update(dt) {
        if (!this.game) return;

        // Обновляем менеджеры через реестр
        const managers = ManagerRegistry.getAll();
        for (const key in managers) {
            const manager = managers[key];
            if (manager && typeof manager.update === 'function') {
                try {
                    manager.update(dt);
                } catch (e) {
                    // Логгируем ошибку конкретного менеджера, но не крашим игру
                    if (Math.random() < 0.01) { // Только 1% ошибок, чтобы не спамить
                        Logger.warn('Engine', `Ошибка в ${key}:`, e.message);
                    }
                }
            }
        }
    }

    /**
     * Отрисовка
     */
    render() {
        const ctx = this.canvasManager.getContext();
        if (!ctx) return;

        // Сброс трансформации перед кадром
        this.canvasManager.resetTransform();
        ctx.clearRect(0, 0, this.canvasManager.width, this.canvasManager.height);

        // Рендер сцены
        if (this.game && typeof this.game.render === 'function') {
            this.game.render(ctx);
        }
        
        // Рендер UI поверх канваса (если нужно)
        const uiManager = ManagerRegistry.get('UIManager');
        if (uiManager && typeof uiManager.renderOverlay === 'function') {
            uiManager.renderOverlay(ctx);
        }
    }
}

window.Engine = Engine;