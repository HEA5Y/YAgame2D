/**
 * main.js
 * Точка входа в приложение. Запускает инициализацию всех систем.
 */

async function bootstrap() {
    try {
        Logger.info('main', 'Начинаем инициализацию приложения...');

        // Yandex SDK уже создан глобально в YandexSDKManager.js
        if (window.yandexSDK && typeof window.yandexSDK.initialize === 'function') {
            await window.yandexSDK.initialize();
            Logger.info('main', 'Yandex SDK готов.');
        }

        // Регистрация всех менеджеров в реестре
        if (typeof ManagersInitializer !== 'undefined' && ManagersInitializer.init) {
            ManagersInitializer.init();
            Logger.info('main', 'Базовые менеджеры зарегистрированы.');
        }
        
        // Инициализация менеджеров с зависимостями (FactoryManager и др.)
        if (typeof ManagersInitializer !== 'undefined' && ManagersInitializer.initDependentManagers) {
            ManagersInitializer.initDependentManagers();
            Logger.info('main', 'Зависимые менеджеры инициализированы.');
        }

        // Создание и старт игры (только если ещё не запущена)
        if (!window.gameInstance) {
            const game = new Game();
            await game.init();
        } else {
            Logger.info('main', 'Игра уже инициализирована, пропускаем повторный запуск.');
        }

        Logger.info('main', 'Игра успешно запущена!');

    } catch (error) {
        if (typeof Logger !== 'undefined' && Logger.error) {
            Logger.error('main', 'Критическая ошибка при старте игры:', error);
        } else {
            console.error('Критическая ошибка при старте игры:', error);
        }
    }
}

// Запускаем весь процесс только после того, как DOM-дерево будет готово
window.addEventListener('DOMContentLoaded', () => {
    bootstrap();
});