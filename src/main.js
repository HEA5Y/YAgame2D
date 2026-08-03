/**
 * main.js - Точка входа в приложение
 * Запускает инициализацию после загрузки DOM
 */

document.addEventListener('DOMContentLoaded', async () => {
    Logger.info('Main', 'DOM загружен, старт приложения...');

    try {
        // 1. Показываем экран загрузки
        const loadingScreen = document.getElementById('loading-screen');
        const gameContainer = document.getElementById('game-container');
        const progressFill = document.querySelector('.progress-fill');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }

        // Эмуляция прогресса загрузки
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        }, 200);

        // 2. Инициализируем менеджеры (через ManagersInitializer)
        if (typeof ManagersInitializer !== 'undefined') {
            await ManagersInitializer.init();
            // Создаем зависимые менеджеры (Factory и т.д.)
            ManagersInitializer.initDependentManagers();
        } else {
            throw new Error('ManagersInitializer не найден! Проверьте порядок скриптов.');
        }

        // 3. Создаем экземпляр игры
        if (typeof Game === 'undefined') {
            throw new Error('Класс Game не найден!');
        }
        
        window.gameInstance = new Game();

        // 4. Инициализируем игру
        const success = await window.gameInstance.init();

        if (!success) {
            throw new Error('Инициализация игры вернула false');
        }

        // 5. Скрываем загрузку, показываем игру
        clearInterval(interval);
        if (progressFill) progressFill.style.width = '100%';
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (gameContainer) gameContainer.style.display = 'block';
                    
                    // 6. Запускаем цикл
                    window.gameInstance.start();
                    Logger.info('Main', 'Игра запущена успешно!');
                }, 500);
            } else {
                if (gameContainer) gameContainer.style.display = 'block';
                window.gameInstance.start();
            }
        }, 500);

    } catch (error) {
        Logger.error('Main', 'Критическая ошибка запуска:', error);
        
        // Останавливаем эмуляцию прогресса
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#ff4444';

        // Показываем ошибку через Guard
        if (typeof ErrorGuard !== 'undefined') {
            ErrorGuard.showCriticalError(error);
        } else {
            alert('Критическая ошибка: ' + error.message);
        }
    }
});

// Обработка видимости вкладки (пауза при сворачивании)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Logger.info('Main', 'Вкладка скрыта, игра на паузе');
        if (window.gameInstance) window.gameInstance.stop();
    } else {
        Logger.info('Main', 'Вкладка активна, возобновление');
        if (window.gameInstance) window.gameInstance.start();
    }
});