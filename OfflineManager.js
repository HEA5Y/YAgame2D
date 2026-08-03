/**
 * OfflineManager.js
 * Обрабатывает оффлайн-доход и другие оффлайн-активности.
 */

class OfflineManager {
    /**
     * @param {TimeManager} timeManager
     * @param {EconomyManager} economyManager
     * @param {FactoryManager} factoryManager (может быть null)
     */
    constructor(timeManager, economyManager, factoryManager) {
        this.timeManager = timeManager;
        this.economyManager = economyManager;
        this.factoryManager = factoryManager;
    }

    /**
     * Вызывается при старте игры – обрабатывает оффлайн-доход
     */
    processOfflineIncome() {
        // Получаем timeManager из реестра если не передан напрямую
        const time = this.timeManager || (window.ManagerRegistry ? window.ManagerRegistry.get('time') : null);
        if (!time) {
            Logger.warn('OfflineManager', 'TimeManager не доступен');
            return;
        }

        const seconds = time.getOfflineSeconds();
        if (seconds <= 0) return;

        // Получаем FactoryManager из реестра если не передан напрямую
        const factory = this.factoryManager || (window.ManagerRegistry ? window.ManagerRegistry.get('factory') : null);
        
        // Получаем общее производство в секунду
        let totalPerSecond = new BigNumber(0);
        if (factory && typeof factory.getTotalProductionPerSecond === 'function') {
            totalPerSecond = factory.getTotalProductionPerSecond();
        } else {
            // Заглушка: 100 монет в секунду, если нет FactoryManager
            totalPerSecond = new BigNumber(100);
        }

        const offlineIncome = totalPerSecond.multiply(seconds);
        // Применяем множитель оффлайн (50% от онлайна)
        const multiplier = GameConfig.ECONOMY.OFFLINE_PRODUCTION_PERCENT;
        const finalIncome = offlineIncome.multiply(multiplier);

        // Получаем EconomyManager из реестра если не передан напрямую
        const econ = this.economyManager || (window.ManagerRegistry ? window.ManagerRegistry.get('economy') : null);
        if (!econ) {
            Logger.warn('OfflineManager', 'EconomyManager не доступен');
            return;
        }

        // Добавляем игроку
        econ.addCurrency(GameConfig.CURRENCY.COINS, finalIncome, 'offline');

        // Показать уведомление
        gameEventBus.emit('offline_income_collected', {
            amount: finalIncome,
            seconds: seconds
        });

        // Показать всплывающее окно с оффлайн-доходом (через UIManager из реестра)
        const ui = window.ManagerRegistry ? window.ManagerRegistry.get('ui') : null;
        if (ui && typeof ui.showOfflinePopup === 'function') {
            ui.showOfflinePopup(finalIncome, seconds);
        } else {
            // Просто уведомление
            gameEventBus.emit('show_notification', {
                text: `За время отсутствия вы заработали ${finalIncome.format()} монет!`,
                icon: '💰'
            });
        }

        // Сбрасываем оффлайн-время через TimeManager
        if (typeof time.clearOfflineSeconds === 'function') {
            time.clearOfflineSeconds();
        } else {
            // Fallback если метод недоступен
            time.offlineSeconds = 0;
        }

        Logger.info('OfflineManager', `Оффлайн-доход: ${finalIncome.format()} монет за ${seconds} сек.`);
    }
}