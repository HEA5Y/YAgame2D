/**
 * main.js - Точка входа приложения
 * Инициализирует игру и обрабатывает события ввода
 */

window.addEventListener('load', () => {
    Logger.info('Main', 'Запуск Brainrot Factory Evolution...');
    
    // Создаем экземпляр игры
    const game = new Game();
    
    // Запускаем процесс инициализации
    game.bootstrap().then(() => {
        Logger.info('Main', 'Игра успешно инициализирована');
        
        // Обработка кликов по canvas (мышь)
        game.canvas.addEventListener('click', (e) => {
            game.handleCanvasClick(e);
        });
        
        // Обработка touch событий (мобильные устройства)
        game.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Обрабатываем все касания
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                game.handleCanvasClick({ 
                    clientX: touch.clientX, 
                    clientY: touch.clientY 
                });
            }
        }, { passive: false });
        
        // Обработка двойного тапа для зума (опционально)
        let lastTapTime = 0;
        game.canvas.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            if (currentTime - lastTapTime < 300) {
                // Двойной тап detected
                Logger.debug('Main', 'Двойной тап');
            }
            lastTapTime = currentTime;
        });
        
        // Предотвращение контекстного меню на мобильных
        game.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
    }).catch((error) => {
        Logger.error('Main', 'Ошибка при инициализации игры', error);
        
        // Показываем пользователю ошибку
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="color: #ff4444; text-align: center; padding: 20px;">
                    <h2>😕 Ошибка загрузки</h2>
                    <p>Произошла ошибка при запуске игры.</p>
                    <p style="font-size: 12px; color: #888;">${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: #ff0055;
                        border: none;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">Попробовать снова</button>
                </div>
            `;
        }
    });
    
    // Обработка изменения ориентации устройства
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            game.handleResize();
        }, 100);
    });
    
    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        game.handleResize();
    });
    
    // Сохранение при закрытии вкладки
    window.addEventListener('beforeunload', () => {
        if (game.managers && game.managers.save) {
            game.managers.save.forceSave();
        }
    });
    
    // Глобальная обработка ошибок
    window.addEventListener('error', (event) => {
        Logger.error('Global', `Глобальная ошибка: ${event.message}`, event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        Logger.error('Global', `Необработанное Promise отклонение: ${event.reason}`);
    });
});

// Service Worker регистрация для PWA (если доступен)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            Logger.info('Main', 'Service Worker зарегистрирован:', registration.scope);
        }).catch((error) => {
            Logger.debug('Main', 'Service Worker не поддерживается или ошибка регистрации');
        });
    });
}
