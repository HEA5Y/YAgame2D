/**
 * Класс UIManager
 * Управляет всеми элементами интерфейса (HUD, верхняя панель валют, окна улучшений, попапы).
 */
class UIManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer');
        this.popupLayer = document.getElementById('popup-layer');
        
        this.elements = {};
        this.activePopups = [];

        this.initHUD();

        // Подписываемся на события изменения баланса для мгновенного обновления интерфейса
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, this.updateCurrencyDisplay, this);
    }

    /**
     * Создание основного HUD (балансы монет и алмазов в верхней части экрана)
     */
    initHUD() {
        const hudHTML = `
            <div id="hud-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; box-sizing: border-box;">
                <!-- Верхняя панель ресурсов -->
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="ui-interactive" style="background: rgba(20, 25, 35, 0.9); border: 2px solid #2a3548; border-radius: 16px; padding: 8px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        <span style="font-size: 22px;">🪙</span>
                        <span id="hud-coins" style="color: #ffffff; font-family: Arial, sans-serif; font-weight: bold; font-size: 18px;">0</span>
                    </div>
                    <div class="ui-interactive" style="background: rgba(20, 25, 35, 0.9); border: 2px solid #2a3548; border-radius: 16px; padding: 8px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        <span style="font-size: 22px;">💎</span>
                        <span id="hud-gems" style="color: #00ffcc; font-family: Arial, sans-serif; font-weight: bold; font-size: 18px;">10</span>
                    </div>
                </div>

                <!-- Нижняя панель навигации по меню фабрики -->
                <div style="display: flex; justify-content: space-around; align-items: center; width: 100%; background: rgba(13, 15, 18, 0.95); border: 2px solid #2a3548; border-radius: 20px; padding: 12px; pointer-events: auto; box-shadow: 0 -4px 20px rgba(0,0,0,0.8);">
                    <button class="ui-nav-btn" data-target="factory" style="background: #ff0055; border: none; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">🏭 Завод</button>
                    <button class="ui-nav-btn" data-target="upgrades" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">⚡ Прокачка</button>
                    <button class="ui-nav-btn" data-target="research" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">🔬 Наука</button>
                    <button class="ui-nav-btn" data-target="collection" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">👽 Мемы</button>
                </div>
            </div>
        `;
        
        this.uiLayer.insertAdjacentHTML('beforeend', hudHTML);
        
        this.elements.coinsText = document.getElementById('hud-coins');
        this.elements.gemsText = document.getElementById('hud-gems');
    }

    /**
     * Обновление отображения валют на экране при их изменении
     */
    updateCurrencyDisplay(data) {
        if (data.currency === GameConfig.CURRENCY.COINS && this.elements.coinsText) {
            this.elements.coinsText.innerText = data.newValue.format();
        } else if (data.currency === GameConfig.CURRENCY.GEMS && this.elements.gemsText) {
            this.elements.gemsText.innerText = data.newValue.format();
        }
    }

    /**
     * Открытие модального окна / попапа с плавной анимацией
     * @param {string} title Заголовок окна
     * @param {string} htmlContent Внутренний HTML контент
     */
    showPopup(title, htmlContent) {
        const popupId = `popup_${Date.now()}`;
        const popupHTML = `
            <div id="${popupId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; transition: opacity 0.25s ease-out; pointer-events: auto;">
                <div style="width: 85%; max-width: 420px; background: #141923; border: 2px solid #ff0055; border-radius: 24px; padding: 24px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 10px 30px rgba(255,0,85,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="color: #ffffff; font-family: Arial, sans-serif; margin: 0; font-size: 22px;">${title}</h2>
                        <button class="popup-close-btn" data-id="${popupId}" style="background: #2a3548; border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-weight: bold; font-size: 16px; cursor: pointer;">✕</button>
                    </div>
                    <div style="color: #b0c0d0; font-family: Arial, sans-serif; font-size: 16px; max-height: 60vh; overflow-y: auto;">
                        ${htmlContent}
                    </div>
                </div>
            </div>
        `;

        this.popupLayer.insertAdjacentHTML('beforeend', popupHTML);
        const popupElement = document.getElementById(popupId);
        
        // Плавное появление
        requestAnimationFrame(() => {
            popupElement.style.opacity = '1';
        });

        // Обработка закрытия
        const closeBtn = popupElement.querySelector('.popup-close-btn');
        closeBtn.addEventListener('click', () => {
            this.closePopup(popupId);
        });

        this.activePopups.push(popupId);
        gameEventBus.emit(GameConfig.EVENTS.POPUP_OPEN, { id: popupId });
    }

    closePopup(popupId) {
        const popupElement = document.getElementById(popupId);
        if (!popupElement) return;

        popupElement.style.opacity = '0';
        setTimeout(() => {
            popupElement.remove();
            this.activePopups = this.activePopups.filter(id => id !== popupId);
            gameEventBus.emit(GameConfig.EVENTS.POPUP_CLOSE, { id: popupId });
        }, 250);
    }

    // Добавить в класс UIManager (после существующих методов)

    /**
     * Создать контейнер для уведомлений
     */
    createNotificationContainer() {
        if (this.notificationContainer) return;
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: absolute; bottom: 140px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 400px; pointer-events: none; z-index: 999;
            display: flex; flex-direction: column; align-items: center; gap: 8px;
        `;
        this.uiLayer.appendChild(container);
        this.notificationContainer = container;
    }

    /**
     * Показать всплывающее уведомление
     * @param {string} text
     * @param {string} icon
     * @param {number} duration
     */
    showNotification(text, icon = '⭐', duration = 2000) {
        if (!this.notificationContainer) this.createNotificationContainer();
        const el = document.createElement('div');
        el.style.cssText = `
            background: rgba(0,0,0,0.85); color: #fff; padding: 10px 20px;
            border-radius: 12px; border-left: 4px solid #ff0055;
            font-size: 16px; font-family: Arial, sans-serif;
            transform: translateY(20px); opacity: 0;
            transition: all 0.4s ease-out; text-align: center;
            max-width: 100%; box-sizing: border-box;
        `;
        el.innerHTML = `${icon} ${text}`;
        this.notificationContainer.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(0)';
            el.style.opacity = '1';
        });
        setTimeout(() => {
            el.style.transform = 'translateY(-20px)';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 400);
        }, duration);
    }

    /**
     * Плавающий текст (+100 монет)
     * @param {number} x - координата X (относительно canvas)
     * @param {number} y - координата Y
     * @param {string} text
     * @param {string} color
     */
    spawnFloatingText(x, y, text, color = '#ffdd44') {
        // Используем HTML элемент поверх canvas
        // Конвертируем координаты canvas в абсолютные
        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        const scaleX = rect.width / canvasWidth;
        const scaleY = rect.height / canvasHeight;
        const absX = rect.left + x * scaleX;
        const absY = rect.top + y * scaleY;

        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed; left: ${absX}px; top: ${absY}px;
            color: ${color}; font-weight: bold; font-size: 28px;
            pointer-events: none; z-index: 10000;
            text-shadow: 0 0 10px rgba(0,0,0,0.8);
            transition: all 1s ease-out;
            opacity: 0;
            font-family: Arial, sans-serif;
        `;
        el.textContent = text;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-100px)';
            el.style.opacity = '1';
        });
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 1000);
        }, 1200);
    }

    /**
     * Показать оффлайн-доход в отдельном попапе
     * @param {BigNumber} amount
     * @param {number} seconds
     */
    showOfflinePopup(amount, seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const timeStr = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
        const content = `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 48px;">⏳</div>
                <p style="font-size: 20px; color: #ffdd44;">${amount.format()} монет</p>
                <p style="color: #aaa;">за ${timeStr} отсутствия</p>
                <button class="ui-interactive" style="background: #ff0055; border: none; color: #fff; padding: 12px 30px; border-radius: 30px; font-size: 18px; margin-top: 10px; cursor: pointer;" onclick="window.gameInstance.managers.ui.closePopup('offline-popup')">Супер!</button>
            </div>
        `;
        this.showCustomPopup('Добро пожаловать!', content, 'offline-popup');
    }

    /**
     * Показать кастомный попап с указанным ID
     * @param {string} title
     * @param {string} htmlContent
     * @param {string} popupId
     */
    showCustomPopup(title, htmlContent, popupId) {
        const popupHTML = `
            <div id="${popupId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; transition: opacity 0.25s ease-out; pointer-events: auto;">
                <div style="width: 85%; max-width: 420px; background: #141923; border: 2px solid #ff0055; border-radius: 24px; padding: 24px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 10px 30px rgba(255,0,85,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="color: #ffffff; font-family: Arial, sans-serif; margin: 0; font-size: 22px;">${title}</h2>
                        <button class="popup-close-btn" data-id="${popupId}" style="background: #2a3548; border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-weight: bold; font-size: 16px; cursor: pointer;">✕</button>
                    </div>
                    <div style="color: #b0c0d0; font-family: Arial, sans-serif; font-size: 16px; max-height: 60vh; overflow-y: auto;">
                        ${htmlContent}
                    </div>
                </div>
            </div>
        `;
        this.popupLayer.insertAdjacentHTML('beforeend', popupHTML);
        const popupElement = document.getElementById(popupId);
        requestAnimationFrame(() => {
            popupElement.style.opacity = '1';
        });
        const closeBtn = popupElement.querySelector('.popup-close-btn');
        closeBtn.addEventListener('click', () => {
            this.closePopup(popupId);
        });
        this.activePopups.push(popupId);
        gameEventBus.emit(GameConfig.EVENTS.POPUP_OPEN, { id: popupId });
    }
}