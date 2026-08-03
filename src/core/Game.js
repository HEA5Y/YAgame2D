/**
 * Класс Game
 * Центральный фасад приложения. Управляет инициализацией и роутингом жизненного цикла.
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        this.engine = new Engine(this);
        this.managers = {};
        this.handleResize = this.handleResize.bind(this);

        // Делаем экземпляр доступным глобально для других менеджеров
        window.gameInstance = this;
    }

    async bootstrap() {
        Logger.info('Game', 'Начало загрузки Brainrot Factory Evolution...');
        this.updateLoadingProgress(10, 'Подключение Yandex SDK...');

        await yandexSDK.initialize();

        this.updateLoadingProgress(30, 'Инициализация подсистем...');

        // --- Инициализация менеджеров (порядок важен) ---
        this.managers.save = new SaveManager();
        this.managers.audio = new AudioManager();
        this.managers.time = new TimeManager();
        this.managers.economy = new EconomyManager(this.managers.save);
        this.managers.prestige = new PrestigeManager(this.managers.economy, this.managers.save);
        this.managers.resources = new ResourceManager();
        this.managers.pool = new ObjectPoolManager();
        this.managers.ui = new UIManager();
        this.managers.scene = new SceneManager(this);

        // Новые менеджеры
        this.managers.upgrade = new UpgradeManager(this.managers.save);
        this.managers.achievement = new AchievementManager(this.managers.save);
        this.managers.quest = new QuestManager(this.managers.save);
        this.managers.event = new EventManager();
        this.managers.offline = new OfflineManager(
            this.managers.time,
            this.managers.economy,
            this.managers.factory // пока null, позже будет FactoryManager
        );

        this.updateLoadingProgress(60, 'Загрузка ассетов...');

        await this.managers.resources.loadInitialAssets((progress) => {
            const mappedProgress = 60 + (progress * 0.3);
            this.updateLoadingProgress(mappedProgress, 'Загрузка ассетов...');
        });

        this.updateLoadingProgress(95, 'Подготовка сцен...');

        window.addEventListener('resize', this.handleResize);
        this.handleResize();

        // Загрузка сохранений и обработка оффлайн-дохода
        await this.managers.save.loadGame();
        this.managers.offline.processOfflineIncome();

        this.updateLoadingProgress(100, 'Готово!');

        yandexSDK.gameReady();

        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 500);

        Logger.info('Game', 'Запуск игрового движка');
        this.managers.scene.changeScene('BootScene');
        this.engine.start();
        
        gameEventBus.emit(GameConfig.EVENTS.ENGINE_INIT_COMPLETE);

        // --- Подписка на события для UI-уведомлений ---
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, (data) => {
            if (data.delta && data.delta.isGreaterThan(0)) {
                const ui = this.managers.ui;
                if (ui && data.delta.isGreaterThan(100)) {
                    ui.showNotification(`+${data.delta.format()} ${data.currency}`, '💰');
                }
            }
        });

        gameEventBus.on(GameConfig.EVENTS.ACHIEVEMENT_UNLOCKED, (data) => {
            this.managers.ui.showNotification(`🏆 Достижение: ${data.name}`, '🏆');
        });

        gameEventBus.on(GameConfig.EVENTS.QUEST_COMPLETED, (data) => {
            this.managers.ui.showNotification(`✅ Квест выполнен: ${data.description}`, '✅');
        });

        gameEventBus.on('show_notification', (data) => {
            this.managers.ui.showNotification(data.text, data.icon);
        });

        // Создаём контейнер для уведомлений
        this.managers.ui.createNotificationContainer();
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

        this.ctx.scale(
            (displayWidth * dpr) / GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH,
            (displayHeight * dpr) / GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT
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
        if (this.managers.time) this.managers.time.update(dt);
        if (this.managers.scene) this.managers.scene.update(dt);
        if (this.managers.pool) this.managers.pool.update(dt);
    }

    render() {
        this.ctx.fillStyle = '#0d0f12';
        this.ctx.fillRect(0, 0, GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH, GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT);
        if (this.managers.scene) this.managers.scene.render(this.ctx);
    }
}