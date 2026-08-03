/**
 * Game.js - Основной класс игры
 * Координирует работу всех менеджеров через ManagerRegistry
 */

class Game {
    constructor() {
        this.isRunning = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60; // Фиксированный шаг физики (60 FPS)
        
        // Ссылки на ключевые системы (получаем из реестра)
        this.canvasManager = null;
        this.timeManager = null;
        this.factoryManager = null;
        this.uiManager = null;
        this.saveManager = null;
        
        Logger.info('Game', 'Конструктор Game запущен');
    }

    /**
     * Инициализация игры
     */
    async init() {
        try {
            Logger.info('Game', 'Начало инициализации...');

            // 1. Получаем доступ к системам из реестра
            this.canvasManager = ManagerRegistry.get('CanvasManager');
            this.timeManager = ManagerRegistry.get('TimeManager');
            this.factoryManager = ManagerRegistry.get('FactoryManager');
            this.uiManager = ManagerRegistry.get('UIManager');
            this.saveManager = ManagerRegistry.get('SaveManager');
            this.economyManager = ManagerRegistry.get('EconomyManager');

            if (!this.canvasManager || !this.timeManager) {
                throw new Error('Критические менеджеры не найдены в реестре!');
            }

            // 2. Настраиваем Canvas
            this.canvasManager.init();
            
            // 3. Загружаем сохранение (если есть)
            if (this.saveManager) {
                await this.saveManager.load();
            }

            // 4. Инициализируем UI после загрузки данных
            if (this.uiManager) {
                this.uiManager.init();
                this.uiManager.updateResources();
            }

            // 5. Запускаем фабрику
            if (this.factoryManager) {
                this.factoryManager.init();
            }

            Logger.info('Game', 'Инициализация завершена успешно');
            return true;

        } catch (error) {
            Logger.error('Game', 'Ошибка инициализации:', error);
            ErrorGuard.showCriticalError(error);
            return false;
        }
    }

    /**
     * Запуск игрового цикла
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        Logger.info('Game', 'Игровой цикл запущен');
        
        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Основной игровой цикл
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Ограничиваем deltaTime, чтобы избежать скачков при переключении вкладок
        const safeDelta = Math.min(deltaTime, 0.1);

        try {
            // 1. Обновление логики (Update)
            this.update(safeDelta);

            // 2. Отрисовка (Render)
            this.render();

        } catch (error) {
            Logger.error('Game', 'Ошибка в игровом цикле:', error);
            // Не останавливаем игру полностью, чтобы игрок мог сохранить прогресс
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Логика игры
     */
    update(dt) {
        // Обновляем время
        if (this.timeManager) this.timeManager.update(dt);

        // Обновляем фабрику
        if (this.factoryManager) this.factoryManager.update(dt);

        // Обновляем другие активные системы через реестр
        const managers = ManagerRegistry.getAll();
        for (const key in managers) {
            const manager = managers[key];
            if (manager !== this.factoryManager && manager !== this.timeManager) {
                if (typeof manager.update === 'function') {
                    try {
                        manager.update(dt);
                    } catch (e) {
                        // Тихая ошибка для второстепенных менеджеров
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

        // Очистка и сброс трансформации
        this.canvasManager.resetTransform();
        ctx.clearRect(0, 0, this.canvasManager.width, this.canvasManager.height);

        // Рендер фона/мира
        if (this.factoryManager) {
            this.factoryManager.render(ctx);
        }

        // Рендер частиц и эффектов
        const particleManager = ManagerRegistry.get('ParticleManager');
        if (particleManager) particleManager.render(ctx);

        const juiceManager = ManagerRegistry.get('JuiceManager');
        if (juiceManager) juiceManager.render(ctx);
    }

    /**
     * Остановка игры
     */
    stop() {
        this.isRunning = false;
        Logger.info('Game', 'Игровой цикл остановлен');
    }
}

// Делаем класс глобально доступным
window.Game = Game;