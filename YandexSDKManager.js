/**
 * Класс YandexSDKManager
 * Полная интеграция Yandex Games SDK. Паттерн Singleton.
 */
class YandexSDKManager {
    constructor() {
        if (YandexSDKManager.instance) {
            return YandexSDKManager.instance;
        }
        
        this.ysdk = null;
        this.player = null;
        this.leaderboards = null;
        this.isInitialized = false;
        this.environment = 'local'; // 'local' или 'yandex'
        this.platform = 'desktop'; // 'desktop', 'mobile', 'tablet'
        
        YandexSDKManager.instance = this;
    }

    /**
     * Инициализация SDK
     */
    async initialize() {
        Logger.info('YandexSDKManager', 'Начало инициализации SDK...');
        
        if (typeof YaGames === 'undefined') {
            Logger.warn('YandexSDKManager', 'Yandex SDK не найден. Запуск в локальном режиме.');
            this.environment = 'local';
            this.isInitialized = true;
            gameEventBus.emit(GameConfig.EVENTS.SDK_READY);
            return;
        }

        try {
            this.ysdk = await YaGames.init();
            this.environment = 'yandex';
            this.platform = this.ysdk.deviceInfo.type;
            Logger.info('YandexSDKManager', `SDK успешно инициализирован. Платформа: ${this.platform}`);
            
            // Инициализация фичей
            await this.initPlayer();
            await this.initLeaderboards();
            
            this.isInitialized = true;
            gameEventBus.emit(GameConfig.EVENTS.SDK_READY);
        } catch (error) {
            Logger.error('YandexSDKManager', 'Ошибка инициализации SDK', error);
            // Fallback в локальный режим при ошибке сети/SDK
            this.environment = 'local';
            this.isInitialized = true;
            gameEventBus.emit(GameConfig.EVENTS.SDK_READY);
        }
    }

    /**
     * Loading API Яндекс Игр (Уведомление о готовности игры)
     */
    gameReady() {
        if (this.environment === 'yandex' && this.ysdk && this.ysdk.features.LoadingAPI) {
            this.ysdk.features.LoadingAPI.ready();
            Logger.info('YandexSDKManager', 'Loading API: Game Ready отправлен');
        }
    }

    /**
     * Инициализация объекта Игрока (Player) для облачных сохранений
     */
    async initPlayer() {
        try {
            this.player = await this.ysdk.getPlayer({ scopes: false });
            Logger.info('YandexSDKManager', 'Player API инициализирован');
        } catch (error) {
            Logger.warn('YandexSDKManager', 'Player API не доступен (возможно не авторизован)', error);
            this.player = null;
        }
    }

    /**
     * Инициализация Лидербордов
     */
    async initLeaderboards() {
        try {
            this.leaderboards = await this.ysdk.getLeaderboards();
            Logger.info('YandexSDKManager', 'Leaderboards API инициализирован');
        } catch (error) {
            Logger.warn('YandexSDKManager', 'Leaderboards API не доступен', error);
            this.leaderboards = null;
        }
    }

    /**
     * Показать Rewarded Video
     * @param {string} placement Место вызова рекламы (для аналитики)
     */
    showRewardedVideo(placement) {
        Logger.info('YandexSDKManager', `Запрос Rewarded Video: ${placement}`);
        
        if (this.environment === 'local') {
            Logger.info('YandexSDKManager', 'Локальный режим: эмуляция успешного просмотра Rewarded Video через 2 секунды');
            gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_SHOW);
            setTimeout(() => {
                gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_REWARD, placement);
                gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_CLOSE);
            }, 2000);
            return;
        }

        if (!this.ysdk) return;

        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    Logger.info('YandexSDKManager', 'Rewarded Video открыто');
                    gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_SHOW);
                },
                onRewarded: () => {
                    Logger.info('YandexSDKManager', 'Rewarded Video вознаграждение получено');
                    gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_REWARD, placement);
                },
                onClose: () => {
                    Logger.info('YandexSDKManager', 'Rewarded Video закрыто');
                    gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_CLOSE);
                },
                onError: (error) => {
                    Logger.error('YandexSDKManager', 'Ошибка Rewarded Video', error);
                    gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_ERROR, error);
                    gameEventBus.emit(GameConfig.EVENTS.AD_REWARDED_CLOSE);
                }
            }
        });
    }

    /**
     * Показать полноэкранную рекламу (Interstitial)
     */
    showFullscreenAdv() {
        Logger.info('YandexSDKManager', 'Запрос Interstitial');
        
        if (this.environment === 'local') {
            Logger.info('YandexSDKManager', 'Локальный режим: эмуляция Interstitial');
            gameEventBus.emit(GameConfig.EVENTS.AD_INTERSTITIAL_SHOW);
            setTimeout(() => {
                gameEventBus.emit(GameConfig.EVENTS.AD_INTERSTITIAL_CLOSE);
            }, 1000);
            return;
        }

        if (!this.ysdk) return;

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onOpen: () => {
                    Logger.info('YandexSDKManager', 'Interstitial открыто');
                    gameEventBus.emit(GameConfig.EVENTS.AD_INTERSTITIAL_SHOW);
                },
                onClose: (wasShown) => {
                    Logger.info('YandexSDKManager', `Interstitial закрыто. Была ли показана: ${wasShown}`);
                    gameEventBus.emit(GameConfig.EVENTS.AD_INTERSTITIAL_CLOSE, wasShown);
                },
                onError: (error) => {
                    Logger.error('YandexSDKManager', 'Ошибка Interstitial', error);
                    gameEventBus.emit(GameConfig.EVENTS.AD_INTERSTITIAL_CLOSE, false);
                }
            }
        });
    }

    /**
     * Загрузить данные из облака Яндекса
     */
    async loadCloudData() {
        if (this.environment === 'local' || !this.player) {
            return null;
        }

        try {
            const data = await this.player.getData();
            Logger.info('YandexSDKManager', 'Облачные данные загружены', data);
            return Object.keys(data).length > 0 ? data : null;
        } catch (error) {
            Logger.error('YandexSDKManager', 'Ошибка загрузки облачных данных', error);
            return null;
        }
    }

    /**
     * Сохранить данные в облако Яндекса
     * @param {Object} data Данные для сохранения
     */
    async saveCloudData(data) {
        if (this.environment === 'local' || !this.player) {
            return false;
        }

        try {
            await this.player.setData(data);
            Logger.info('YandexSDKManager', 'Данные успешно сохранены в облако');
            return true;
        } catch (error) {
            Logger.error('YandexSDKManager', 'Ошибка сохранения в облако', error);
            return false;
        }
    }

    /**
     * Отправить счет в лидерборд
     * @param {string} leaderboardName Название лидерборда
     * @param {number} score Очки
     */
    async setLeaderboardScore(leaderboardName, score) {
        if (this.environment === 'local' || !this.leaderboards) {
            return;
        }

        try {
            await this.leaderboards.setLeaderboardScore(leaderboardName, score);
            Logger.info('YandexSDKManager', `Счет ${score} отправлен в лидерборд ${leaderboardName}`);
        } catch (error) {
            Logger.error('YandexSDKManager', 'Ошибка отправки в лидерборд', error);
        }
    }

    getEnvironment() {
        return this.environment;
    }

    getPlatform() {
        return this.platform;
    }
}

// Глобальный экземпляр для доступа из других скриптов
window.yandexSDK = new YandexSDKManager();