/**
 * Класс Game - Рефакторинг
 * Центральный фасад приложения с использованием ManagerRegistry
 * Поэтапная инициализация, устранение жёстких зависимостей
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        this.engine = new Engine(this);
        this.registry = null;
        this.handleResize = this.handleResize.bind(this);
    }

    async bootstrap() {
        try {
            await this._initSDK();
            await this._createManagers();
            await this._loadResources();
            this._registerEvents();
            await this._loadSave();
            this._processOffline();
            this._startGame();
        } catch (error) {
            Logger.error('Game', 'Критическая ошибка:', error);
            this._handleFatalError(error);
        }
    }

    async _initSDK() {
        this.updateLoadingProgress(10, 'Подключение Yandex SDK...');
        await yandexSDK.initialize();
        Logger.info('Game', 'Yandex SDK инициализирован');
    }

    async _createManagers() {
        this.updateLoadingProgress(30, 'Инициализация подсистем...');
        // Менеджеры уже зарегистрированы в ManagersInitializer.init()
        this.registry = window.ManagerRegistry;
        await this.registry.initializeAll();
        window.gameRegistry = this.registry;
        Logger.info('Game', `Инициализировано ${this.registry.count()} менеджеров`);
    }

    async _loadResources() {
        this.updateLoadingProgress(60, 'Загрузка ассетов...');
        const assetManager = this.registry.get('asset');
        if (assetManager && typeof assetManager.loadAll === 'function') {
            await assetManager.loadAll();
        }
        Logger.info('Game', 'Ресурсы загружены');
    }

    _registerEvents() {
        this.updateLoadingProgress(95, 'Подготовка сцен...');
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
        this._subscribeToEvents();
        Logger.info('Game', 'События зарегистрированы');
    }

    async _loadSave() {
        const saveManager = this.registry.get('save');
        await saveManager.loadGame();
        Logger.info('Game', 'Сохранения загружены');
    }

    _processOffline() {
        const offlineManager = this.registry.get('offline');
        offlineManager.processOfflineIncome();
        Logger.info('Game', 'Оффлайн-доход обработан');
    }

    _startGame() {
        this.updateLoadingProgress(100, 'Готово!');
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 500);
        
        Logger.info('Game', 'Запуск игрового движка');
        const sceneManager = this.registry.get('scene');
        sceneManager.changeScene('BootScene');
        this.engine.start();
        gameEventBus.emit(GameConfig.EVENTS.ENGINE_INIT_COMPLETE);
        
        this._initUI();
        yandexSDK.gameReady();
        
        if (GameConfig.YANDEX_GAMES.ANALYTICS_ENABLED) {
            yandexSDK.logEvent('GameStarted', {
                timestamp: Date.now(),
                version: GameConfig.GAME.VERSION
            });
        }
    }

    _initUI() {
        const uiManager = this.registry.get('ui');
        uiManager.createNotificationContainer();
        
        const dailyManager = this.registry.get('daily');
        if (dailyManager && dailyManager.isRewardAvailable()) {
            setTimeout(() => uiManager.showDailyRewardPopup(), 1000);
        }
        
        const saveManager = this.registry.get('save');
        const saveData = saveManager.collectSaveData();
        if (!saveData.factory || Object.keys(saveData.factory).length === 0) {
            setTimeout(() => this._showTutorial(), 2000);
        }
    }

    _showTutorial() {
        const uiManager = this.registry.get('ui');
        const steps = [
            { text: '👋 Добро пожаловать в Brainrot Factory!', icon: '🏭', duration: 3000 },
            { text: '💰 Кликай по линиям чтобы собрать ресурсы', icon: '👆', duration: 4000 },
            { text: '⬆️ Улучшай линии для увеличения производства', icon: '📈', duration: 4000 },
            { text: '🎁 Забирай бесплатные сундуки каждые 10 минут!', icon: '🎁', duration: 3000 },
            { text: '🚀 Поехали!', icon: '⭐', duration: 2000 }
        ];
        
        let i = 0;
        const next = () => {
            if (i < steps.length) {
                uiManager.showNotification(steps[i].text, steps[i].icon);
                i++;
                setTimeout(next, steps[i-1].duration);
            }
        };
        next();
    }

    _subscribeToEvents() {
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, (data) => {
            if (data.delta && data.delta.isGreaterThan(0)) {
                const ui = this.registry.get('ui');
                if (ui && data.delta.isGreaterThan(100)) {
                    ui.showNotification(`+${data.delta.format()} ${data.currency}`, '💰');
                }
            }
        });

        gameEventBus.on(GameConfig.EVENTS.ACHIEVEMENT_UNLOCKED, (data) => {
            const ui = this.registry.get('ui');
            const juice = this.registry.get('juice');
            if (ui) ui.showNotification(`🏆 Достижение: ${data.name}`, '🏆');
            if (juice) {
                juice.triggerScreenShake(10);
                juice.spawnConfetti(window.innerWidth / 2, window.innerHeight / 2);
            }
            if (GameConfig.YANDEX_GAMES.ANALYTICS_ENABLED) {
                yandexSDK.logEvent('AchievementUnlocked', { achievementName: data.name });
            }
        });

        gameEventBus.on(GameConfig.EVENTS.QUEST_COMPLETED, (data) => {
            const ui = this.registry.get('ui');
            if (ui) ui.showNotification(`✅ Квест выполнен: ${data.description}`, '✅');
        });
        
        gameEventBus.on(GameConfig.EVENTS.RARE_ITEM_OBTAINED, (data) => {
            const ui = this.registry.get('ui');
            const juice = this.registry.get('juice');
            if (ui) ui.showRareItemPopup(data.item, data.rarity);
            if (juice) {
                juice.triggerScreenShake(15);
                juice.spawnFireworks(window.innerWidth / 2, window.innerHeight / 2);
            }
        });

        gameEventBus.on('show_notification', (data) => {
            const ui = this.registry.get('ui');
            if (ui) ui.showNotification(data.text, data.icon);
        });
        
        gameEventBus.on('factory_upgraded', (data) => {
            if (GameConfig.YANDEX_GAMES.ANALYTICS_ENABLED) {
                yandexSDK.logEvent('FactoryUpgrade', {
                    lineId: data.lineId,
                    level: data.level,
                    cost: data.cost.toString()
                });
            }
        });
        
        gameEventBus.on(GameConfig.EVENTS.PRESTIGE_ACTIVATED, (data) => {
            if (GameConfig.YANDEX_GAMES.ANALYTICS_ENABLED) {
                yandexSDK.logEvent('Prestige', {
                    brainCellsEarned: data.brainCells.toString(),
                    totalPrestiges: data.totalPrestiges
                });
            }
        });
        
        gameEventBus.on('ad_watched', (data) => {
            if (GameConfig.YANDEX_GAMES.ANALYTICS_ENABLED) {
                yandexSDK.logEvent('WatchAd', {
                    adType: data.adType,
                    reward: data.reward
                });
            }
        });
    }

    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        const container = document.getElementById('game-container');
        const targetRatio = GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH / GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT;
        const containerRatio = container.clientWidth / container.clientHeight;

        let displayWidth, displayHeight;
        if (containerRatio < targetRatio) {
            displayWidth = container.clientWidth;
            displayHeight = container.clientWidth / targetRatio;
        } else {
            displayHeight = container.clientHeight;
            displayWidth = container.clientHeight * targetRatio;
        }

        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;

        this.ctx.setTransform(
            (displayWidth * dpr) / GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH,
            0,
            0,
            (displayHeight * dpr) / GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT,
            0,
            0
        );

        gameEventBus.emit(GameConfig.EVENTS.RESIZE, {
            width: GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH,
            height: GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT,
            scale: dpr
        });
    }

    updateLoadingProgress(percent, text) {
        const fill = document.getElementById('loader-bar-fill');
        const textElement = document.getElementById('loader-text');
        if (fill) fill.style.width = `${percent}%`;
        if (textElement) textElement.innerText = `${text} ${Math.floor(percent)}%`;
    }

    update(dt) {
        if (this.registry) this.registry.updateAll(dt);
    }

    render() {
        this.ctx.fillStyle = '#0d0f12';
        this.ctx.fillRect(0, 0, GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH, GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT);
        if (this.registry) this.registry.renderAll(this.ctx);
    }
    
    handleCanvasClick(event) {
        if (!this.registry) return false;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const clickX = (event.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
        const clickY = (event.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);
        
        const factoryManager = this.registry.get('factory');
        if (factoryManager && factoryManager.handleClick(clickX, clickY)) {
            return true;
        }
        
        const chestManager = this.registry.get('chest');
        if (chestManager && chestManager.handleClick(clickX, clickY)) {
            return true;
        }
        
        return false;
    }
    
    _handleFatalError(error) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="color: #ff0055; font-size: 24px; text-align: center; padding: 40px;">
                    <h2>😱 Ошибка загрузки!</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 15px 30px; font-size: 18px; background: #ff0055; color: white; border: none; border-radius: 10px; cursor: pointer;">
                        🔄 Перезагрузить
                    </button>
                </div>
            `;
            loadingScreen.style.opacity = '1';
        }
    }
}
