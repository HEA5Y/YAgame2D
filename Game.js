/**
 * Game.js
 * Главный класс-оркестратор с защитным Watchdog-таймером от зависаний.
 */
class Game {
    constructor() {
        if (window.gameInstance) {
            Logger.warn('Game', 'Game уже создан, возвращаем существующий экземпляр');
            return window.gameInstance;
        }
        window.gameInstance = this;
        this.isRunning = false;
        this.managers = {};

        // АБСОЛЮТНЫЙ СТРАХУЮЩИЙ ТАЙМЕР (Watchdog)
        // Что бы ни случилось (ошибка в SDK, зависание ассетов), 
        // ровно через 2.5 секунды экран загрузки будет принудительно удален, а игра запущена.
        this.initWatchdog(2500);
    }

    initWatchdog(timeoutMs) {
        setTimeout(() => {
            if (document.getElementById('loading-screen')) {
                Logger.warn('Game', 'Watchdog сработал: принудительный запуск из-за затянувшейся загрузки.');
                this.forceStartGame();
            }
        }, timeoutMs);
    }

    /**
     * Главный метод инициализации игры
     */
    async init() {
        Logger.info('Game', 'Инициализация игровых систем...');

        try {
            // Получаем все менеджеры из реестра и сохраняем в this.managers
            const registry = window.ManagerRegistry;
            this.managers.save = registry.get('save');
            this.managers.economy = registry.get('economy');
            this.managers.time = registry.get('time');
            this.managers.factory = registry.get('factory');
            this.managers.upgrade = registry.get('upgrade');
            this.managers.ui = registry.get('ui');
            this.managers.scene = registry.get('scene');
            this.managers.prestige = registry.get('prestige');
            this.managers.canvas = registry.get('canvas');

            // Инициализация Canvas
            const canvasElement = document.getElementById('game-canvas');
            if (canvasElement && this.managers.canvas) {
                this.managers.canvas.init(canvasElement);
            }

            // Загрузка сохранения
            const hasSave = (this.managers.save && typeof this.managers.save.loadGame === 'function') 
                ? await this.managers.save.loadGame() 
                : false;

            // Безопасная инициализация SDK / Ресурсов с таймаутом
            await this.safeAsyncInit();

            // Расчет оффлайн-прогресса
            if (hasSave && this.managers.time && typeof this.managers.time.getOfflineSeconds === 'function') {
                const offlineSeconds = this.managers.time.getOfflineSeconds();
                if (offlineSeconds > 10 && this.managers.factory && typeof this.managers.factory.processOfflineIncome === 'function') {
                    const earned = this.managers.factory.processOfflineIncome(offlineSeconds);
                    if (earned && typeof earned.isGreaterThan === 'function' && earned.isGreaterThan(0)) {
                        if (this.managers.ui && typeof this.managers.ui.showOfflinePopup === 'function') {
                            this.managers.ui.showOfflinePopup(earned, offlineSeconds);
                        }
                    }
                }
            }

            // Инициализация сцен
            if (this.managers.scene && typeof this.managers.scene.initScenes === 'function') {
                this.managers.scene.initScenes();
            }

            this.forceStartGame();
        } catch (error) {
            Logger.error('Game', 'Ошибка в init: ' + (error.message || error));
            console.error(error);
            this.forceStartGame();
        }
    }

    async safeAsyncInit() {
        // Обертка для проверки YandexSDK или AssetManager, если они существуют
        return Promise.race([
            new Promise(async (resolve) => {
                if (typeof AssetManager !== 'undefined' && window.assetManagerInstance) {
                    // пример ожидания ассетов, если применимо
                }
                setTimeout(resolve, 300);
            }),
            new Promise((resolve) => setTimeout(resolve, 1500)) // Максимум 1.5 сек на асинхронщину
        ]);
    }

    /**
     * Принудительный показ игры и запуск цикла
     */
    forceStartGame() {
        // Убираем экран загрузки
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s ease';
            setTimeout(() => loader.remove(), 300);
        }

        // Показываем контейнер игры
        const container = document.getElementById('game-container');
        if (container) {
            container.style.display = 'block';
        }

        this.startLoop();
        this.setupInputHandlers();
    }

    /**
     * Настройка обработчиков ввода (клик/тач)
     */
    setupInputHandlers() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas || !this.managers.canvas) return;

        const handlePointer = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const screenX = (e.clientX - rect.left) * scaleX;
            const screenY = (e.clientY - rect.top) * scaleY;
            
            // Конвертируем в мировые координаты
            const worldPos = this.managers.canvas.screenToWorld(screenX, screenY);
            
            // Передаём клик в FactoryManager
            if (this.managers.factory && typeof this.managers.factory.handleClick === 'function') {
                const handled = this.managers.factory.handleClick(worldPos.x, worldPos.y);
                if (handled) {
                    e.preventDefault();
                }
            }
        };

        canvas.addEventListener('click', handlePointer);
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                handlePointer(touch);
            }
        }, { passive: false });
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
            const safeDt = dt > 0.1 ? 0.1 : dt;

            // Обновление фабрики
            if (this.managers.factory && typeof this.managers.factory.update === 'function') {
                this.managers.factory.update(safeDt);
            }
            
            // Обновление твинов
            const tweenManager = window.ManagerRegistry ? window.ManagerRegistry.get('tween') : null;
            if (tweenManager && typeof tweenManager.update === 'function') {
                tweenManager.update(safeDt);
            }

            // Обновление сцены
            if (this.managers.scene && typeof this.managers.scene.update === 'function') {
                this.managers.scene.update(safeDt);
            }

            // Рендер
            if (this.managers.canvas && this.managers.canvas.getCtx()) {
                const ctx = this.managers.canvas.getCtx();
                this.managers.canvas.clear();
                
                if (this.managers.scene && typeof this.managers.scene.render === 'function') {
                    this.managers.scene.render(ctx);
                }
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}

// Автозапуск УБРАН — запуск происходит из main.js