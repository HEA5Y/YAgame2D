import { Logger } from './utils/Logger.js';
import { ErrorGuard } from './core/ErrorGuard.js';
import { YandexSDKManager } from './sdk/YandexSDKManager.js';
import { ManagersInitializer } from './core/ManagersInitializer.js';
import { Game } from './core/Game.js'; // Или Engine.js, в зависимости от того, кто у тебя стартует цикл

async function bootstrap() {
    try {
        // 1. Инициализируем глобальный перехватчик ошибок (если он нужен на старте)
        if (typeof ErrorGuard !== 'undefined' && ErrorGuard.init) {
            ErrorGuard.init();
        }
        
        Logger.info('Начинаем инициализацию приложения...');

        // 2. Инициализация Yandex SDK (Решение Проблем №1, №3)
        // Важно: мы дожидаемся (await) полной загрузки SDK перед тем, как идти дальше
        window.yandexSDK = new YandexSDKManager();
        await window.yandexSDK.initialize();
        Logger.info('Yandex SDK готов.');

        // 3. Инициализация всех менеджеров (Решение Проблемы №2)
        // Теперь внутри ManagersInitializer.js переменная window.yandexSDK точно существует
        await ManagersInitializer.init();
        Logger.info('Менеджеры инициализированы.');

        // 4. Создание и старт основного класса игры
        const game = new Game();
        
        // В зависимости от того, как написан твой Game.js:
        if (typeof game.initialize === 'function') {
            await game.initialize();
        }
        
        if (typeof game.start === 'function') {
            game.start();
        }

        Logger.info('Игра успешно запущена!');

    } catch (error) {
        // Если что-то упадет на этапе инициализации, игра не зависнет молча
        if (Logger && Logger.error) {
            Logger.error('Критическая ошибка при старте игры:', error);
        } else {
            console.error('Критическая ошибка при старте игры:', error);
        }
    }
}

// Запускаем весь процесс только после того, как DOM-дерево будет готово
window.addEventListener('DOMContentLoaded', () => {
    bootstrap();
});