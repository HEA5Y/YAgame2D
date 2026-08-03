/**
 * ErrorGuard - Глобальная защита от падений игры
 */

class ErrorGuard {
    constructor() {
        this.hasCriticalError = false;
        this._attachGlobalHandlers();
    }

    /**
     * Показать экран критической ошибки
     */
    showCriticalError(error) {
        if (this.hasCriticalError) return;
        this.hasCriticalError = true;

        console.error('[ErrorGuard] Критическая ошибка:', error);

        const overlay = document.createElement('div');
        overlay.id = 'critical-error-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 99999;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            color: white; font-family: sans-serif; text-align: center;
            padding: 20px; box-sizing: border-box;
        `;

        const title = document.createElement('h1');
        title.textContent = '😱 Ошибка загрузки!';
        title.style.color = '#ff4444';
        title.style.marginBottom = '20px';

        const msg = document.createElement('div');
        msg.textContent = error.message || 'Неизвестная ошибка';
        msg.style.fontSize = '18px';
        msg.style.marginBottom = '10px';
        msg.style.maxWidth = '600px';

        const stack = document.createElement('pre');
        stack.textContent = error.stack || 'Нет стека вызовов';
        stack.style.cssText = `
            background: #222; padding: 15px; border-radius: 8px;
            font-size: 12px; overflow: auto; max-width: 100%;
            max-height: 200px; text-align: left; color: #ff8888;
        `;

        const btn = document.createElement('button');
        btn.textContent = '🔄 Перезагрузить';
        btn.style.cssText = `
            margin-top: 20px; padding: 15px 30px; font-size: 18px;
            background: #4caf50; color: white; border: none;
            border-radius: 8px; cursor: pointer;
        `;
        btn.onclick = () => location.reload();

        overlay.appendChild(title);
        overlay.appendChild(msg);
        overlay.appendChild(stack);
        overlay.appendChild(btn);
        document.body.appendChild(overlay);
    }

    /**
     * Алиас для совместимости
     */
    handleCriticalError(error) {
        this.showCriticalError(error);
    }

    _attachGlobalHandlers() {
        // ИСПРАВЛЕНО: используем addEventListener вместо прямого присваивания window.onerror
        // чтобы не перезаписывать обработчики других библиотек (Yandex SDK и т.д.)
        window.addEventListener('error', (event) => {
            const { message, filename, lineno, colno, error } = event;
            if (!this.hasCriticalError) {
                console.error(`[Global Error] ${message} (${filename}:${lineno}:${colno})`);
            }
            // Не вызываем event.preventDefault(), позволяем другим обработчикам сработать
            return false;
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Unhandled Rejection]', event.reason);
            // Можно раскомментировать, если нужно падение на любых промисах
            // this.showCriticalError(event.reason);
        });
    }
}

// Экспортируем в глобальную область
window.ErrorGuard = new ErrorGuard();