/**
 * Класс Engine
 * Управляет главным игровым циклом. Отвечает за deltaTime и вызовы Update/Render.
 */
class Engine {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.isRunning = false;
        
        this.lastTime = 0;
        this.animationFrameId = null;

        // Привязываем контекст для requestAnimationFrame
        this.loop = this.loop.bind(this);
        
        // Обработка видимости вкладки браузера
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    start() {
        if (this.isRunning) return;
        
        Logger.info('Engine', 'Запуск игрового цикла');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
        
        gameEventBus.emit(GameConfig.EVENTS.GAME_RESUME);
    }

    stop() {
        if (!this.isRunning) return;
        
        Logger.info('Engine', 'Остановка игрового цикла');
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        gameEventBus.emit(GameConfig.EVENTS.GAME_PAUSE);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.stop();
        } else {
            this.start();
        }
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        // Вычисляем deltaTime в миллисекундах и секундах
        let deltaTimeMs = currentTime - this.lastTime;
        
        // Защита от "спирали смерти" (если вкладка зависла, deltaTime не будет слишком большим)
        if (deltaTimeMs > GameConfig.ENGINE.MAX_DELTA_TIME) {
            deltaTimeMs = GameConfig.ENGINE.MAX_DELTA_TIME;
        }
        
        const dt = deltaTimeMs / 1000; // dt в секундах для физики
        this.lastTime = currentTime;

        // Вызываем Update и Render у главного класса игры
        this.game.update(dt);
        this.game.render();

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    destroy() {
        this.stop();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}