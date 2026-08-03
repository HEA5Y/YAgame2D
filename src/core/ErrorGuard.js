/**
 * ErrorGuard - Глобальная система защиты от ошибок
 * Перехватывает все критические сбои, предотвращает "белый экран"
 * и выводит понятное сообщение пользователю.
 */
class ErrorGuard {
    static init() {
        // Перехват глобальных ошибок
        window.onerror = (msg, url, line, col, error) => {
            console.error('🛑 GLOBAL ERROR CAUGHT:', error || msg);
            this.showFatalScreen(msg, error);
            return true; // Предотвращаем стандартное поведение браузера
        };

        // Перехват необработанных Promise rejection
        window.onunhandledrejection = (event) => {
            console.error('🛑 UNHANDLED PROMISE REJECTION:', event.reason);
            this.showFatalScreen('Ошибка асинхронной операции', event.reason);
            event.preventDefault();
        };

        console.log('✅ ErrorGuard initialized');
    }

    static showFatalScreen(message, errorObj) {
        if (document.getElementById('fatal-error-screen')) return;

        const overlay = document.createElement('div');
        overlay.id = 'fatal-error-screen';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.95); z-index: 99999;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            color: #fff; font-family: sans-serif; text-align: center; padding: 20px;
        `;

        const title = document.createElement('h1');
        title.textContent = '⚠️ Произошла критическая ошибка';
        title.style.color = '#ff4444';
        title.style.marginBottom = '20px';

        const desc = document.createElement('p');
        desc.textContent = message || 'Неизвестная ошибка';
        desc.style.fontSize = '18px';
        desc.style.marginBottom = '10px';
        desc.style.maxWidth = '600px';

        const techDetails = document.createElement('pre');
        techDetails.style.cssText = `
            background: #222; padding: 15px; border-radius: 5px;
            font-size: 12px; color: #0f0; overflow: auto; max-width: 80%;
            max-height: 200px; text-align: left; margin-top: 20px;
        `;
        techDetails.textContent = errorObj ? (errorObj.stack || errorObj.toString()) : 'No stack trace';

        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = '🔄 Попробовать снова';
        reloadBtn.style.cssText = `
            margin-top: 30px; padding: 15px 30px; font-size: 18px;
            background: #4CAF50; color: white; border: none; border-radius: 5px;
            cursor: pointer; transition: background 0.3s;
        `;
        reloadBtn.onmouseover = () => reloadBtn.style.background = '#45a049';
        reloadBtn.onmouseout = () => reloadBtn.style.background = '#4CAF50';
        reloadBtn.onclick = () => window.location.reload();

        overlay.appendChild(title);
        overlay.appendChild(desc);
        overlay.appendChild(techDetails);
        overlay.appendChild(reloadBtn);

        // Удаляем лоадер если есть
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';

        document.body.appendChild(overlay);
    }

    static safeExecute(fn, context, ...args) {
        try {
            return fn.apply(context, args);
        } catch (e) {
            console.error('❌ SafeExecute failed:', e);
            throw e; // Пробрасываем дальше, чтобы перехватил window.onerror
        }
    }

    static safeGet(obj, path, defaultValue = null) {
        try {
            return path.split('.').reduce((prev, curr) => prev ? prev[curr] : undefined, obj) ?? defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
}

// Авто-инициализация при загрузке скрипта
ErrorGuard.init();
