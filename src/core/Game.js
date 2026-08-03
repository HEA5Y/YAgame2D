/**
 * Game.js
 * Главный класс-оркестратор. Инициализирует менеджеры, 
 * управляет защищенной загрузкой ресурсов, отображением контейнера и игровым циклом.
 */
class Game {
    constructor() {
        window.gameInstance = this;
        
        this.isRunning = false;
        this.managers = {};
    }

    /**
     * Главный метод инициализации игры
     */
    async init() {
        Logger.info('Game', 'Инициализация игровых систем...');

        try {
            // 1. Создание и регистрация менеджеров (через ManagersInitializer или напрямую)
            // Если у вас используется ManagersInitializer, он инициализирует всё автоматически.
            // Ниже приведена безопасная инициализация основных систем:
            
            this.saveManager = new SaveManager();
            this.economyManager = new EconomyManager(this.saveManager);
            this.timeManager = new TimeManager(this.saveManager);
            this.factoryManager = new FactoryManager(this.saveManager, this.economyManager);
            this.upgradeManager = new UpgradeManager(this.saveManager, this.economyManager);
            this.uiManager = new UIManager();

            this.managers = {
                save: this.saveManager,
                economy: this.economyManager,
                time: this.timeManager,
                factory: this.factoryManager,
                upgrades: this.upgradeManager,
                ui: this.uiManager
            };

            // 2. Загрузка файла сохранения из localStorage
            const hasSave = this.saveManager.load ? this.saveManager.load() : false;

            // 3. Загрузка ресурсов с защитным таймаутом (максимум 3 секунды)
            await this.loadResourcesWithTimeout(3000);

            // 4. Расчет оффлайн-прогресса
            if (hasSave && this.timeManager.calculateOfflineProgress) {
                const offlineSeconds = this.timeManager.calculateOfflineProgress();
                if (offlineSeconds > 10 && this.factoryManager.processOfflineIncome) {
                    const earned = this.factoryManager.processOfflineIncome(offlineSeconds);
                    if (earned && typeof earned.isGreaterThan === 'function' && earned.isGreaterThan(0)) {
                        if (this.uiManager.showOfflinePopup) {
                            this.uiManager.showOfflinePopup(earned, offlineSeconds);
                        }
                    }
                }
            }

            // 5. Плавное скрытие экрана загрузки и ПОКАЗ игрового контейнера
            this.showGameInterface();

            // 6. Запуск главного игрокового цикла (Game Loop)
            this.startLoop();

            Logger.info('Game', 'Игра успешно запущена!');
        } catch (error) {
            Logger.error('Game', 'Критическая ошибка при инициализации: ' + (error.message || error));
            console.error(error);
            
            // Даже при ошибке принудительно показываем игру, чтобы избежать серого экрана
            this.showGameInterface();
            this.startLoop();
        }
    }

    /**
     * Обертка над загрузкой с таймаутом
     */
    async loadResourcesWithTimeout(timeoutMs) {
        return Promise.race([
            this.loadAssets(),
            new Promise((resolve) => setTimeout(() => {
                Logger.warn('Game', 'Таймаут загрузки ресурсов исчерпан. Принудительный пропуск.');
                resolve();
            }, timeoutMs))
        ]);
    }

    /**
     * Метод загрузки графики, звуков и т.д.
     */
    async loadAssets() {
        return new Promise((resolve) => {
            // Если у вас есть AssetManager, можно вызвать его здесь. 
            // Имитируем короткую асинхронную готовность:
            setTimeout(resolve, 200);
        });
    }

    /**
     * Убирает загрузчик и делает #game-container видимым
     */
    showGameInterface() {
        // Показываем основной контейнер игры (убираем display: none)
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }

        // Плавное скрытие экрана загрузки
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
                loader.remove();
            }, 400);
        }
    }

    /**
     * Запуск главного игрового цикла
     */
    startLoop() {
        if (this.isRunning) return;
        this.isRunning = true;

        let lastFrameTime = performance.now();

        const loop = (currentTime) => {
            if (!this.isRunning) return;

            const dt = (currentTime - lastFrameTime) / 1000;
            lastFrameTime = currentTime;

            // Ограничиваем dt, чтобы игра не "скакала" при сворачивании вкладки
            const safeDt = dt > 0.1 ? 0.1 : dt;

            // Обновляем менеджеры, у которых есть метод update
            if (this.factoryManager && typeof this.factoryManager.update === 'function') {
                this.factoryManager.update(safeDt);
            }
            if (window.tweenManager && typeof window.tweenManager.update === 'function') {
                window.tweenManager.update(safeDt);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}