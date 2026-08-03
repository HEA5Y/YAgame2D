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
        const seconds = this.timeManager.getOfflineSeconds();
        if (seconds <= 0) return;

        // Получаем общее производство в секунду (из FactoryManager или заглушка)
        let totalPerSecond = new BigNumber(0);
        if (this.factoryManager && typeof this.factoryManager.getTotalProductionPerSecond === 'function') {
            totalPerSecond = this.factoryManager.getTotalProductionPerSecond();
        } else {
            // Заглушка: 100 монет в секунду, если нет FactoryManager
            totalPerSecond = new BigNumber(100);
        }

        const offlineIncome = totalPerSecond.multiply(seconds);
        // Применяем множитель оффлайн (50% от онлайна)
        const multiplier = GameConfig.ECONOMY.OFFLINE_PRODUCTION_PERCENT;
        const finalIncome = offlineIncome.multiply(multiplier);

        // Добавляем игроку
        this.economyManager.addCurrency(GameConfig.CURRENCY.COINS, finalIncome, 'offline');

        // Показать уведомление
        gameEventBus.emit('offline_income_collected', {
            amount: finalIncome,
            seconds: seconds
        });

        // Показать всплывающее окно с оффлайн-доходом (через UIManager)
        const ui = window.gameInstance.managers.ui;
        if (ui && typeof ui.showOfflinePopup === 'function') {
            ui.showOfflinePopup(finalIncome, seconds);
        } else {
            // Просто уведомление
            gameEventBus.emit('show_notification', {
                text: `За время отсутствия вы заработали ${finalIncome.format()} монет!`,
                icon: '💰'
            });
        }

        // Сбрасываем оффлайн-время
        this.timeManager.clearOfflineSeconds();

        Logger.info('OfflineManager', `Оффлайн-доход: ${finalIncome.format()} монет за ${seconds} сек.`);
    }
}