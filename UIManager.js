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
        this.floatingTextPool = [];
        this.poolSize = 40;
        this.initFloatingTextPool();
        this.initHUD();
        
        // Подписываемся на события изменения баланса
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, this.updateCurrencyDisplay, this);
    }

    initFloatingTextPool() {
        const container = this.uiLayer || document.body;
        for (let i = 0; i < this.poolSize; i++) {
            const el = document.createElement('div');
            el.style.cssText = `position: absolute; pointer-events: none; z-index: 10000; text-shadow: 0 0 10px rgba(0,0,0,0.8); font-family: Arial, sans-serif; font-weight: bold; font-size: 28px; opacity: 0; display: none;`;
            container.appendChild(el);
            this.floatingTextPool.push({ el, active: false });
        }
    }

    initHUD() {
        const hudHTML = `
            <div id="hud-container">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="ui-interactive" style="background: rgba(20, 25, 35, 0.9); border: 2px solid #2a3548; border-radius: 16px; padding: 8px 16px; display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 22px;">🪙</span>
                        <span id="hud-coins" style="color: #ffffff; font-family: Arial, sans-serif; font-weight: bold; font-size: 18px;">0</span>
                    </div>
                    <div class="ui-interactive" style="background: rgba(20, 25, 35, 0.9); border: 2px solid #2a3548; border-radius: 16px; padding: 8px 16px; display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 22px;">💎</span>
                        <span id="hud-gems" style="color: #00ffcc; font-family: Arial, sans-serif; font-weight: bold; font-size: 18px;">10</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: center; width: 100%; background: rgba(13, 15, 18, 0.95); border: 2px solid #2a3548; border-radius: 20px; padding: 12px; pointer-events: auto;">
                    <button class="ui-nav-btn" data-target="factory" style="background: #ff0055; border: none; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">🏭 Завод</button>
                    <button class="ui-nav-btn" data-target="upgrades" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">⚡ Прокачка</button>
                    <button class="ui-nav-btn" data-target="research" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">🔬 Наука</button>
                    <button class="ui-nav-btn" data-target="collection" style="background: #1a1f2b; border: 2px solid #2a3548; border-radius: 12px; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 14px; cursor: pointer;">👽 Мемы</button>
                </div>
            </div>
        `;
        if (this.uiLayer) this.uiLayer.insertAdjacentHTML('beforeend', hudHTML);
        this.elements.coinsText = document.getElementById('hud-coins');
        this.elements.gemsText = document.getElementById('hud-gems');
        setTimeout(() => this.setupNavButtonListeners(), 100);
    }

    setupNavButtonListeners() {
        const self = this;
        document.querySelectorAll('.ui-nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                self.handleNavClick(target);
            });
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                self.handleTabClick(tab, this);
            });
        });
        Logger.info('UIManager', 'Обработчики навигации установлены');
    }

    handleNavClick(target) {
        Logger.info('UIManager', 'Навигация: ' + target);
    }

    handleTabClick(tab, clickedBtn) {
        Logger.info('UIManager', 'Вкладка: ' + tab);
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (clickedBtn) clickedBtn.classList.add('active');
    }

    updateCurrencyDisplay(data) {
        if (data.currency === GameConfig.CURRENCY.COINS && this.elements.coinsText) {
            this.elements.coinsText.innerText = data.newValue.format();
        } else if (data.currency === GameConfig.CURRENCY.GEMS && this.elements.gemsText) {
            this.elements.gemsText.innerText = data.newValue.format();
        }
    }

    spawnFloatingText(x, y, text, color = '#ffdd44') {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const poolItem = this.floatingTextPool.find(item => !item.active);
        if (!poolItem) return;
        poolItem.active = true;
        const el = poolItem.el;
        el.textContent = text;
        el.style.color = color;
        el.style.left = (rect.left + x) + 'px';
        el.style.top = (rect.top + y) + 'px';
        el.style.display = 'block';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; poolItem.active = false; }, 1000);
        }, 1000);
    }

    showNotification(text, icon = 'ℹ️') {
        Logger.info('UIManager', 'Уведомление: ' + text);
    }
}
window.UIManager = UIManager;
