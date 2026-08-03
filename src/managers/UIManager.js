/**
 * Класс UIManager
 * Управляет всеми элементами интерфейса (HUD, верхняя панель валют, окна улучшений, попапы).
 * Оптимизирован: использует пул объектов для плавающего текста и безопасные обработчики событий.
 */
class UIManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer'); //[cite: 44]
        this.popupLayer = document.getElementById('popup-layer'); //[cite: 44]
        
        this.elements = {}; //[cite: 44]
        this.activePopups = []; //[cite: 44]

        // Инициализация пула объектов для плавающего текста (минимизирует работу GC)
        this.floatingTextPool = [];
        this.poolSize = 40;
        this.initFloatingTextPool();

        this.initHUD(); //[cite: 44]

        // Подписываемся на события изменения баланса для мгновенного обновления интерфейса
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, this.updateCurrencyDisplay, this); //[cite: 44]
    }

    /**
     * Выделение памяти под фиксированный пул DOM-элементов плавающего текста
     */
    initFloatingTextPool() {
        for (let i = 0; i < this.poolSize; i++) {
            const el = document.createElement('div');
            el.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 10000;
                text-shadow: 0 0 10px rgba(0,0,0,0.8);
                font-family: Arial, sans-serif;
                font-weight: bold;
                font-size: 28px;
                opacity: 0;
                display: none;
                will-change: transform, opacity;
            `;
            document.body.appendChild(el);
            this.floatingTextPool.push({ el, active: false });
        }
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
        `; //[cite: 44]
        
        this.uiLayer.insertAdjacentHTML('beforeend', hudHTML); //[cite: 44]
        
        this.elements.coinsText = document.getElementById('hud-coins'); //[cite: 44]
        this.elements.gemsText = document.getElementById('hud-gems'); //[cite: 44]
    }

    /**
     * Обновление отображения валют на экране при их изменении
     */
    updateCurrencyDisplay(data) {
        if (data.currency === GameConfig.CURRENCY.COINS && this.elements.coinsText) {
            this.elements.coinsText.innerText = data.newValue.format(); //[cite: 44]
        } else if (data.currency === GameConfig.CURRENCY.GEMS && this.elements.gemsText) {
            this.elements.gemsText.innerText = data.newValue.format(); //[cite: 44]
        }
    }

    /**
     * Открытие модального окна / попапа с плавной анимацией
     */
    showPopup(title, htmlContent) {
        const popupId = `popup_${Date.now()}`; //[cite: 44]
        this.showCustomPopup(title, htmlContent, popupId);
    }

    /**
     * Показать кастомный попап с указанным ID
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
        `; //[cite: 44]

        this.popupLayer.insertAdjacentHTML('beforeend', popupHTML); //[cite: 44]
        const popupElement = document.getElementById(popupId); //[cite: 44]
        
        requestAnimationFrame(() => {
            popupElement.style.opacity = '1'; //[cite: 44]
        });

        const closeBtn = popupElement.querySelector('.popup-close-btn'); //[cite: 44]
        closeBtn.addEventListener('click', () => {
            this.closePopup(popupId); //[cite: 44]
        });

        this.activePopups.push(popupId); //[cite: 44]
        gameEventBus.emit(GameConfig.EVENTS.POPUP_OPEN, { id: popupId }); //[cite: 44]
    }

    closePopup(popupId) {
        const popupElement = document.getElementById(popupId); //[cite: 44]
        if (!popupElement) return;

        popupElement.style.opacity = '0'; //[cite: 44]
        setTimeout(() => {
            popupElement.remove(); //[cite: 44]
            this.activePopups = this.activePopups.filter(id => id !== popupId); //[cite: 44]
            gameEventBus.emit(GameConfig.EVENTS.POPUP_CLOSE, { id: popupId }); //[cite: 44]
        }, 250); //[cite: 44]
    }

    /**
     * Создать контейнер для уведомлений
     */
    createNotificationContainer() {
        if (this.notificationContainer) return; //[cite: 44]
        const container = document.createElement('div');
        container.id = 'notification-container'; //[cite: 44]
        container.style.cssText = `
            position: absolute; bottom: 140px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 400px; pointer-events: none; z-index: 999;
            display: flex; flex-direction: column; align-items: center; gap: 8px;
        `; //[cite: 44]
        this.uiLayer.appendChild(container); //[cite: 44]
        this.notificationContainer = container; //[cite: 44]
    }

    /**
     * Показать всплывающее уведомление
     */
    showNotification(text, icon = '⭐', duration = 2000) {
        if (!this.notificationContainer) this.createNotificationContainer(); //[cite: 44]
        const el = document.createElement('div');
        el.style.cssText = `
            background: rgba(0,0,0,0.85); color: #fff; padding: 10px 20px;
            border-radius: 12px; border-left: 4px solid #ff0055;
            font-size: 16px; font-family: Arial, sans-serif;
            transform: translateY(20px); opacity: 0;
            transition: all 0.4s ease-out; text-align: center;
            max-width: 100%; box-sizing: border-box;
        `; //[cite: 44]
        el.innerHTML = `${icon} ${text}`; //[cite: 44]
        this.notificationContainer.appendChild(el); //[cite: 44]
        
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(0)'; //[cite: 44]
            el.style.opacity = '1'; //[cite: 44]
        });
        
        setTimeout(() => {
            el.style.transform = 'translateY(-20px)'; //[cite: 44]
            el.style.opacity = '0'; //[cite: 44]
            setTimeout(() => el.remove(), 400); //[cite: 44]
        }, duration); //[cite: 44]
    }

    /**
     * Высокопроизводительный плавающий текст с использованием пула объектов
     */
    spawnFloatingText(x, y, text, color = '#ffdd44') {
        const canvas = document.getElementById('game-canvas'); //[cite: 44]
        const rect = canvas.getBoundingClientRect(); //[cite: 44]
        const dpi = window.devicePixelRatio || 1; //[cite: 44]
        const canvasWidth = canvas.width / dpi; //[cite: 44]
        const canvasHeight = canvas.height / dpi; //[cite: 44]
        const scaleX = rect.width / canvasWidth; //[cite: 44]
        const scaleY = rect.height / canvasHeight; //[cite: 44]
        const absX = rect.left + x * scaleX; //[cite: 44]
        const absY = rect.top + y * scaleY; //[cite: 44]

        // Извлекаем неактивный элемент из пула
        const poolItem = this.floatingTextPool.find(item => !item.active);
        if (!poolItem) return; 

        poolItem.active = true;
        const el = poolItem.el;

        // Полный сброс стилей перед реактивацией
        el.textContent = text; //[cite: 44]
        el.style.color = color; //[cite: 44]
        el.style.left = `${absX}px`; //[cite: 44]
        el.style.top = `${absY}px`; //[cite: 44]
        el.style.transition = 'none';
        el.style.transform = 'translateY(0)';
        el.style.opacity = '0';
        el.style.display = 'block';

        requestAnimationFrame(() => {
            el.style.transition = 'all 1s ease-out'; //[cite: 44]
            el.style.transform = 'translateY(-100px)'; //[cite: 44]
            el.style.opacity = '1'; //[cite: 44]
        });

        setTimeout(() => {
            el.style.opacity = '0'; //[cite: 44]
            setTimeout(() => {
                el.style.display = 'none';
                poolItem.active = false; // Возврат в пул
            }, 1000); //[cite: 44]
        }, 1200); //[cite: 44]
    }

    /**
     * Показать оффлайн-доход в отдельном попапе с безопасным слушателем
     */
    showOfflinePopup(amount, seconds) {
        const hours = Math.floor(seconds / 3600); //[cite: 44]
        const minutes = Math.floor((seconds % 3600) / 60); //[cite: 44]
        const timeStr = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`; //[cite: 44]
        
        const popupId = 'offline-popup';
        const content = `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 48px;">⏳</div>
                <p style="font-size: 20px; color: #ffdd44;">${amount.format()} монет</p>
                <p style="color: #aaa;">за ${timeStr} отсутствия</p>
                <button id="btn-close-offline" class="ui-interactive" style="background: #ff0055; border: none; color: #fff; padding: 12px 30px; border-radius: 30px; font-size: 18px; margin-top: 10px; cursor: pointer;">Супер!</button>
            </div>
        `; //[cite: 44]
        
        this.showCustomPopup('Добро пожаловать!', content, popupId); //[cite: 44]

        // Безопасное назначение события без инлайн-атрибутов
        setTimeout(() => {
            const btn = document.getElementById('btn-close-offline');
            if (btn) {
                btn.addEventListener('click', () => this.closePopup(popupId));
            }
        }, 0);
    }
}