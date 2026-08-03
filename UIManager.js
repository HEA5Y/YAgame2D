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
        // Если нет контейнера для попапов — создаём его, чтобы showNotification и др. работали
        if (!this.popupLayer) {
            this.popupLayer = document.createElement('div');
            this.popupLayer.id = 'popup-layer';
            if (this.uiLayer) this.uiLayer.appendChild(this.popupLayer);
            else document.body.appendChild(this.popupLayer);
        }
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
        // Вставляем свой HUD только если в разметке нет верхней панели или нижней навигации
        // (чтобы не создавать дубликаты элементов, если index.html уже содержит их)
        const hasTopHud = this.uiLayer && (this.uiLayer.querySelector('.hud-top') || this.uiLayer.querySelector('#hud-container'));
        const hasBottomNav = this.uiLayer && (this.uiLayer.querySelector('.nav-bottom') || this.uiLayer.querySelector('.nav-btn'));
        if (this.uiLayer && !hasTopHud && !hasBottomNav) {
            this.uiLayer.insertAdjacentHTML('beforeend', hudHTML);
        }

        // Поддерживаем несколько вариантов id, чтобы интегрироваться с index.html
        this.elements.coinsText = document.getElementById('hud-coins') || document.getElementById('ui-coins');
        this.elements.gemsText = document.getElementById('hud-gems') || document.getElementById('ui-gems');
        this.elements.brainText = document.getElementById('ui-braincells') || document.getElementById('hud-brain');

        // Привязываем кнопку настроек, если она есть в верстке
        const settingsBtn = document.getElementById('btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.onSettingsClicked());
        }

        // Увеличим небольшой таймаут чтобы все статичные элементы DOM гарантированно были на месте
        setTimeout(() => this.setupNavButtonListeners(), 250);
    }

    /**
     * Инициализация вызовов, выполняется менеджером при старте
     */
    async init() {
        Logger.info('UIManager', 'init() called');

        // Подписываемся на глобальные события
        if (typeof gameEventBus !== 'undefined') {
            gameEventBus.on(GameConfig.EVENTS.SHOW_NOTIFICATION, this.showNotification, this);
            gameEventBus.on(GameConfig.EVENTS.POPUP_OPEN, this.showPopup, this);
        }

        // Убедимся, что контейнер уведомлений существует
        if (!document.getElementById('notification-container') && !document.getElementById('notifications-area')) {
            const c = document.createElement('div');
            c.id = 'notification-container';
            c.style.pointerEvents = 'none';
            if (this.uiLayer) this.uiLayer.appendChild(c); else document.body.appendChild(c);
        }

        // Готово
        Logger.info('UIManager', 'UI initialized');
        // Создаём панели основного контента и показываем первую
        this.renderMainPanels();
        this.showPanel('factory');
    }

    renderMainPanels() {
        if (!this.uiLayer) return;

        // Если уже есть — не создаём повторно
        if (document.getElementById('side-panel')) return;

        const container = document.createElement('div');
        container.id = 'side-panel';
        container.className = 'side-panel collapsed';

        const inner = document.createElement('div');
        inner.className = 'side-panel-inner';

        const header = document.createElement('div');
        header.className = 'side-panel-header';
        header.innerHTML = `<div class="side-panel-title">Brainrot — Меню</div><button class="side-panel-close">✕</button>`;
        inner.appendChild(header);

        const panels = [
            { id: 'factory', title: 'Производственные линии' },
            { id: 'upgrades', title: 'Прокачка' },
            { id: 'collection', title: 'Коллекция' },
            { id: 'quest', title: 'Квесты' }
        ];

        panels.forEach(p => {
            const panel = document.createElement('div');
            panel.id = `panel-${p.id}`;
            panel.className = 'ui-panel-content side-panel-panel';
            panel.style.display = 'none';

            const h = document.createElement('h2');
            h.innerText = p.title;
            h.style.marginTop = '0';
            panel.appendChild(h);

            const content = document.createElement('div');
            content.id = `content-${p.id}`;
            panel.appendChild(content);

            inner.appendChild(panel);
        });

        // Хэндл для открытия/закрытия
        const handle = document.createElement('div');
        handle.className = 'side-panel-handle';
        handle.innerText = '☰';
        handle.title = 'Открыть меню';
        handle.addEventListener('click', () => this.toggleSidePanel());

        container.appendChild(inner);
        container.appendChild(handle);
        this.uiLayer.appendChild(container);

        // Close button
        inner.querySelector('.side-panel-close').addEventListener('click', () => this.toggleSidePanel());

        this.refreshPanels();
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
        this.showPanel(tab);
    }

    updateCurrencyDisplay(data) {
        if (data.currency === GameConfig.CURRENCY.COINS && this.elements.coinsText) {
            this.elements.coinsText.innerText = data.newValue.format ? data.newValue.format() : data.newValue;
        } else if (data.currency === GameConfig.CURRENCY.GEMS && this.elements.gemsText) {
            this.elements.gemsText.innerText = data.newValue.format ? data.newValue.format() : data.newValue;
        } else if (data.currency === GameConfig.CURRENCY.BRAIN_CELLS && this.elements.brainText) {
            this.elements.brainText.innerText = data.newValue.format ? data.newValue.format() : data.newValue;
        }
    }

    onSettingsClicked() {
        Logger.info('UIManager', 'Settings clicked');
        this.openSettingsModal();
    }

    showPanel(name) {
        // Ensure side panel is open when showing content
        const side = document.getElementById('side-panel');
        if (side && side.classList.contains('collapsed')) side.classList.remove('collapsed');

        const panels = document.querySelectorAll('.side-panel-panel');
        panels.forEach(p => p.style.display = 'none');

        const target = document.getElementById(`panel-${name}`);
        if (target) target.style.display = 'block';
        this.refreshPanels();
    }

    toggleSidePanel() {
        const side = document.getElementById('side-panel');
        if (!side) return;
        side.classList.toggle('collapsed');
    }

    refreshPanels() {
        this.renderFactoryPanel();
        this.renderUpgradePanel();
        this.renderCollectionPanel();
        this.renderQuestPanel();
    }

    renderFactoryPanel() {
        const host = document.getElementById('content-factory');
        if (!host) return;

        const registry = window.ManagerRegistry;
        const factory = registry ? registry.get('factory') : null;
        const economy = registry ? registry.get('economy') : null;
        if (!factory || !economy) {
            host.innerHTML = '<p>Фабрика ещё не инициализирована.</p>';
            return;
        }

        const lines = Array.from(factory.lines.values());
        host.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'ui-panel-grid';

        const summary = document.createElement('div');
        summary.className = 'ui-card';
        summary.innerHTML = `
            <div class="ui-card-title">🏭 Производство</div>
            <div class="ui-pill">⚡ ${factory.getTotalProductionPerSecond().format()} / сек</div>
            <div class="muted">Линии генерируют доход и могут быть улучшены.</div>
        `;
        grid.appendChild(summary);

        lines.forEach(line => {
            const card = document.createElement('div');
            card.className = 'ui-card';
            card.innerHTML = `
                <div class="ui-card-title">${line.unlocked ? '✅' : '🔒'} ${line.name}</div>
                <div class="ui-pill">📈 Уровень ${line.level}</div>
                <div class="ui-pill">💰 ${line.getUpgradeCost(1).format()}</div>
                <div class="muted">Накоплено: ${line.pendingCollection ? line.pendingCollection.format() : '0'}</div>
            `;

            const btn = document.createElement('button');
            btn.className = 'ui-action-btn';
            btn.innerText = line.unlocked ? 'Улучшить' : 'Открыть';
            btn.addEventListener('click', () => {
                const ok = line.upgrade(1);
                if (ok) this.showNotification(`Обновили ${line.name}`);
                else this.showNotification('Недостаточно монет');
                this.refreshPanels();
            });
            card.appendChild(btn);

            if (line.unlocked && line.pendingCollection && line.pendingCollection.isGreaterThan(0)) {
                const collect = document.createElement('button');
                collect.className = 'ui-action-btn secondary';
                collect.innerText = 'Забрать';
                collect.addEventListener('click', () => {
                    const collected = line.collectManual();
                    if (collected) this.showNotification(`+${collected.format()}`);
                    this.refreshPanels();
                });
                card.appendChild(collect);
            }

            grid.appendChild(card);
        });

        host.appendChild(grid);
    }

    renderUpgradePanel() {
        const host = document.getElementById('content-upgrades');
        if (!host) return;

        const registry = window.ManagerRegistry;
        const upgradeManager = registry ? registry.get('upgrade') : null;
        const economy = registry ? registry.get('economy') : null;
        if (!upgradeManager || !economy) {
            host.innerHTML = '<p>Улучшения ещё не инициализированы.</p>';
            return;
        }

        host.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'ui-panel-grid';

        const upgrades = Array.from(upgradeManager.upgrades.values()).slice(0, 12);
        upgrades.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = 'ui-card';
            const level = upgradeManager.getLevel(upgrade.id);
            card.innerHTML = `
                <div class="ui-card-title">⚡ ${upgrade.name}</div>
                <div class="muted">${upgrade.description}</div>
                <div class="ui-pill">📊 Ур. ${level}</div>
                <div class="ui-pill">💸 ${upgradeManager.getCost(upgrade.id, 1).format()}</div>
            `;
            const btn = document.createElement('button');
            btn.className = 'ui-action-btn';
            btn.innerText = 'Купить';
            btn.addEventListener('click', () => {
                const ok = upgradeManager.purchase(upgrade.id, 1);
                if (ok) this.showNotification(`Куплено: ${upgrade.name}`);
                else this.showNotification('Недостаточно монет');
                this.refreshPanels();
            });
            card.appendChild(btn);
            grid.appendChild(card);
        });

        host.appendChild(grid);
    }

    renderCollectionPanel() {
        const host = document.getElementById('content-collection');
        if (!host) return;
        host.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'ui-panel-grid';

        const cards = [
            { icon: '🧠', title: 'Базовые мемы', body: 'Собирайте новые мозги и повышайте редкость.' },
            { icon: '🎁', title: 'Сундуки', body: 'Открывайте сундуки за награды и прогресс.' },
            { icon: '⭐', title: 'Реликвии', body: 'Улучшайте шансы на редкие находки.' }
        ];

        cards.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ui-card';
            card.innerHTML = `
                <div class="ui-card-title">${item.icon} ${item.title}</div>
                <div class="muted">${item.body}</div>
            `;
            grid.appendChild(card);
        });
        host.appendChild(grid);
    }

    renderQuestPanel() {
        const host = document.getElementById('content-quest');
        if (!host) return;
        host.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'ui-panel-grid';

        const quests = [
            { icon: '📜', title: 'Первый запуск', body: 'Откройте фабрику и начните производство.' },
            { icon: '⚡', title: 'Прокачайся', body: 'Купите минимум 3 улучшения.' },
            { icon: '🧠', title: 'Собери мозги', body: 'Соберите 10 единиц дохода из линий.' }
        ];

        quests.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ui-card';
            card.innerHTML = `
                <div class="ui-card-title">${item.icon} ${item.title}</div>
                <div class="muted">${item.body}</div>
            `;
            grid.appendChild(card);
        });
        host.appendChild(grid);
    }

    openSettingsModal() {
        // Если уже открыт — ничего не делаем
        if (document.getElementById('settings-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'settings-modal-overlay';
        overlay.className = 'ui-popup-overlay';

        const card = document.createElement('div');
        card.id = 'settings-modal';
        card.className = 'ui-popup-card';

        const title = document.createElement('h3');
        title.innerText = 'Настройки';
        card.appendChild(title);

        // Music volume
        const rowMusic = document.createElement('div');
        rowMusic.className = 'toggle-row';
        rowMusic.innerHTML = `<label>Музыка</label>`;
        const inputMusic = document.createElement('input');
        inputMusic.type = 'range';
        inputMusic.min = '0';
        inputMusic.max = '1';
        inputMusic.step = '0.01';
        inputMusic.value = (window.GameConfig && window.GameConfig.AUDIO) ? window.GameConfig.AUDIO.MUSIC_VOLUME : 0.3;
        rowMusic.appendChild(inputMusic);
        card.appendChild(rowMusic);

        // SFX volume
        const rowSfx = document.createElement('div');
        rowSfx.className = 'toggle-row';
        rowSfx.innerHTML = `<label>SFX</label>`;
        const inputSfx = document.createElement('input');
        inputSfx.type = 'range';
        inputSfx.min = '0';
        inputSfx.max = '1';
        inputSfx.step = '0.01';
        inputSfx.value = (window.GameConfig && window.GameConfig.AUDIO) ? window.GameConfig.AUDIO.SFX_VOLUME : 0.7;
        rowSfx.appendChild(inputSfx);
        card.appendChild(rowSfx);

        // Fullscreen toggle
        const rowFs = document.createElement('div');
        rowFs.className = 'toggle-row';
        const fsBtn = document.createElement('button');
        fsBtn.innerText = 'Полноэкранный режим';
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
            else document.exitFullscreen().catch(()=>{});
        });
        rowFs.appendChild(fsBtn);
        card.appendChild(rowFs);

        // Buttons
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.justifyContent = 'flex-end';

        const saveBtn = document.createElement('button');
        saveBtn.innerText = 'Сохранить';
        saveBtn.style.background = 'var(--ui-accent)';
        saveBtn.style.color = '#fff';
        saveBtn.style.border = 'none';
        saveBtn.style.padding = '8px 12px';
        saveBtn.style.borderRadius = '10px';
        saveBtn.addEventListener('click', () => {
            // Применяем звук если есть AudioManager в реестре
            try {
                const audio = window.ManagerRegistry ? window.ManagerRegistry.get('audio') : null;
                if (audio && typeof audio.setMusicVolume === 'function') audio.setMusicVolume(parseFloat(inputMusic.value));
                if (audio && typeof audio.setSfxVolume === 'function') audio.setSfxVolume(parseFloat(inputSfx.value));
            } catch (e) {
                Logger.warn('UIManager', 'Не удалось применить звуковые настройки: ' + e);
            }
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Закрыть';
        closeBtn.style.padding = '8px 12px';
        closeBtn.style.borderRadius = '10px';
        closeBtn.addEventListener('click', () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });

        actions.appendChild(saveBtn);
        actions.appendChild(closeBtn);
        card.appendChild(actions);

        overlay.appendChild(card);
        if (this.popupLayer) this.popupLayer.appendChild(overlay); else document.body.appendChild(overlay);
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

        // Получаем контейнер (поддерживаем оба варианта id)
        const container = document.getElementById('notification-container') || document.getElementById('notifications-area') || this.popupLayer;
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'notification';
        el.style.pointerEvents = 'auto';
        el.innerText = `${icon} ${text}`;

        container.appendChild(el);

        // Анимация появления
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(0)';
            el.style.opacity = '1';
        });

        // Удалить через 3500мс
        setTimeout(() => {
            el.style.transform = 'translateY(20px)';
            el.style.opacity = '0';
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
        }, 3500);
    }

    /**
     * Показ оффлайн-попапа при входе
     */
    showOfflinePopup(earned, offlineSeconds) {
        const amount = earned && earned.format ? earned.format() : String(earned);
        const message = `Вы заработали ${amount} за ${Math.floor(offlineSeconds)} сек оффлайна`;
        this.showPopup({ title: 'Оффлайн доход', body: message });
    }

    /**
     * Универсальный попап
     * payload: { title, body, onClose }
     */
    showPopup(payload = {}) {
        const title = payload.title || '';
        const body = payload.body || '';

        const overlay = document.createElement('div');
        overlay.className = 'ui-popup-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';

        const card = document.createElement('div');
        card.style.background = 'var(--ui-panel-bg)';
        card.style.border = '2px solid var(--ui-panel-border)';
        card.style.borderRadius = '16px';
        card.style.padding = '20px';
        card.style.minWidth = '280px';
        card.style.maxWidth = '90%';
        card.style.boxShadow = 'var(--shadow-lg)';
        card.style.color = 'var(--text-color)';

        if (title) {
            const h = document.createElement('h3');
            h.innerText = title;
            h.style.margin = '0 0 8px 0';
            card.appendChild(h);
        }

        const p = document.createElement('div');
        p.innerText = body;
        p.style.marginBottom = '12px';
        card.appendChild(p);

        const btn = document.createElement('button');
        btn.innerText = 'Закрыть';
        btn.style.cursor = 'pointer';
        btn.style.padding = '8px 12px';
        btn.style.borderRadius = '10px';
        btn.style.border = 'none';
        btn.style.background = 'var(--ui-accent)';
        btn.style.color = '#fff';
        btn.addEventListener('click', () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (payload.onClose) payload.onClose();
        });

        card.appendChild(btn);
        overlay.appendChild(card);

        if (this.popupLayer) this.popupLayer.appendChild(overlay);
        else document.body.appendChild(overlay);
    }
}
window.UIManager = UIManager;
