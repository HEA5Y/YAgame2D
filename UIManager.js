class UIManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer');
        this.popupLayer = document.getElementById('popup-layer');
        this.elements = {};
        this.activePopups = [];
        this.floatingTextPool = [];
        this.poolSize = 40;
        this.initFloatingTextPool();
        this.bindElements();
        this.setupNavListeners();
        this.setupSidePanel();
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, this.updateCurrencyDisplay, this);
    }

    initFloatingTextPool() {
        const container = document.getElementById('game-app') || document.body;
        for (let i = 0; i < this.poolSize; i++) {
            const el = document.createElement('div');
            el.className = 'floating-text';
            el.style.opacity = '0';
            el.style.display = 'none';
            container.appendChild(el);
            this.floatingTextPool.push({ el, active: false });
        }
    }

    bindElements() {
        this.elements.coinsText = document.getElementById('ui-coins');
        this.elements.gemsText = document.getElementById('ui-gems');
        this.elements.brainText = document.getElementById('ui-braincells');
    }

    setupNavListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.handleTabClick(tab, btn);
            });
        });
        const settingsBtn = document.getElementById('btn-settings');
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }

    setupSidePanel() {
        const side = document.getElementById('side-panel');
        const handle = side?.querySelector('.side-panel-handle');
        const close = side?.querySelector('.side-panel-close');
        if (handle) handle.addEventListener('click', () => this.toggleSidePanel());
        if (close) close.addEventListener('click', () => this.toggleSidePanel());
    }

    async init() {
        Logger.info('UIManager', 'init() called');
        if (typeof gameEventBus !== 'undefined') {
            gameEventBus.on(GameConfig.EVENTS.SHOW_NOTIFICATION, this.showNotification, this);
            gameEventBus.on(GameConfig.EVENTS.POPUP_OPEN, this.showPopup, this);
        }
        this.refreshPanels();
        this.showPanel('factory');
        Logger.info('UIManager', 'UI initialized');
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

    showPanel(name) {
        const side = document.getElementById('side-panel');
        const app = document.getElementById('game-app');
        if (side) {
            side.classList.remove('collapsed');
            if (app) app.classList.add('panel-open');
        }
        document.querySelectorAll('.side-panel-panel').forEach(p => p.style.display = 'none');
        const target = document.getElementById('panel-' + name);
        if (target) target.style.display = 'block';
        this.refreshPanels();
    }

    toggleSidePanel() {
        const side = document.getElementById('side-panel');
        const app = document.getElementById('game-app');
        if (side) {
            side.classList.toggle('collapsed');
            const isOpen = !side.classList.contains('collapsed');
            if (app) app.classList.toggle('panel-open', isOpen);
            setTimeout(() => {
                const cm = window.ManagerRegistry ? window.ManagerRegistry.get('canvas') : null;
                if (cm && cm.resize) cm.resize();
            }, 360);
        }
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
            host.innerHTML = '<p style="color:#94a3b8">Фабрика ещё не инициализирована.</p>';
            return;
        }
        const lines = Array.from(factory.lines.values());
        host.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'ui-panel-grid';

        const summary = document.createElement('div');
        summary.className = 'ui-card';
        summary.innerHTML = '<div class="ui-card-title">🏭 Производство</div><div class="ui-pill">⚡ ' + factory.getTotalProductionPerSecond().format() + ' / сек</div><div class="muted">Линии генерируют доход и могут быть улучшены.</div>';
        grid.appendChild(summary);

        lines.forEach(line => {
            const card = document.createElement('div');
            card.className = 'ui-card';
            card.innerHTML = '<div class="ui-card-title">' + (line.unlocked ? '✅' : '🔒') + ' ' + line.name + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0;"><div class="ui-pill">📈 Уровень ' + line.level + '</div><div class="ui-pill">💰 ' + line.getUpgradeCost(1).format() + '</div></div><div class="muted">Накоплено: ' + (line.pendingCollection ? line.pendingCollection.format() : '0') + '</div>';

            const btn = document.createElement('button');
            btn.className = 'ui-action-btn';
            btn.innerText = line.unlocked ? 'Улучшить' : 'Открыть';
            btn.addEventListener('click', () => {
                const ok = line.upgrade(1);
                if (ok) this.showNotification('Обновили ' + line.name);
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
                    if (collected) this.showNotification('+' + collected.format());
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
            host.innerHTML = '<p style="color:#94a3b8">Улучшения ещё не инициализированы.</p>';
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
            card.innerHTML = '<div class="ui-card-title">⚡ ' + upgrade.name + '</div><div class="muted">' + upgrade.description + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0;"><div class="ui-pill">📊 Ур. ' + level + '</div><div class="ui-pill">💸 ' + upgradeManager.getCost(upgrade.id, 1).format() + '</div></div>';

            const btn = document.createElement('button');
            btn.className = 'ui-action-btn';
            btn.innerText = 'Купить';
            btn.addEventListener('click', () => {
                const ok = upgradeManager.purchase(upgrade.id, 1);
                if (ok) this.showNotification('Куплено: ' + upgrade.name);
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
            card.innerHTML = '<div class="ui-card-title">' + item.icon + ' ' + item.title + '</div><div class="muted">' + item.body + '</div>';
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
            card.innerHTML = '<div class="ui-card-title">' + item.icon + ' ' + item.title + '</div><div class="muted">' + item.body + '</div>';
            grid.appendChild(card);
        });
        host.appendChild(grid);
    }

    openSettingsModal() {
        if (document.getElementById('settings-modal')) return;
        const overlay = document.createElement('div');
        overlay.id = 'settings-modal-overlay';
        overlay.className = 'ui-popup-overlay';

        const card = document.createElement('div');
        card.id = 'settings-modal';
        card.className = 'ui-popup-card';
        card.innerHTML = '<h3>⚙️ Настройки</h3>';

        const createRow = (label, type, value, onChange) => {
            const row = document.createElement('div');
            row.className = 'toggle-row';
            const lbl = document.createElement('label');
            lbl.innerText = label;
            row.appendChild(lbl);
            if (type === 'range') {
                const input = document.createElement('input');
                input.type = 'range'; input.min = '0'; input.max = '1'; input.step = '0.01'; input.value = value;
                input.addEventListener('input', onChange);
                row.appendChild(input);
            } else if (type === 'button') {
                const btn = document.createElement('button');
                btn.className = 'ui-action-btn';
                btn.innerText = value;
                btn.addEventListener('click', onChange);
                row.appendChild(btn);
            }
            return row;
        };

        const audio = window.ManagerRegistry ? window.ManagerRegistry.get('audio') : null;
        card.appendChild(createRow('Музыка', 'range', audio?.musicVolume ?? 0.3, (e) => {
            if (audio && audio.setMusicVolume) audio.setMusicVolume(parseFloat(e.target.value));
        }));
        card.appendChild(createRow('SFX', 'range', audio?.sfxVolume ?? 0.7, (e) => {
            if (audio && audio.setSfxVolume) audio.setSfxVolume(parseFloat(e.target.value));
        }));
        card.appendChild(createRow('Полноэкранный режим', 'button', 'Включить', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
            else document.exitFullscreen().catch(() => { });
        }));

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:14px;';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-action-btn';
        closeBtn.innerText = 'Закрыть';
        closeBtn.addEventListener('click', () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
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
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = '';
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; poolItem.active = false; }, 1000);
        }, 1000);
    }

    showNotification(text, icon = 'ℹ️') {
        Logger.info('UIManager', 'Уведомление: ' + text);
        const container = document.getElementById('notification-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'notification';
        el.innerText = icon + ' ' + text;
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
        }, 3500);
    }

    showOfflinePopup(earned, offlineSeconds) {
        const amount = earned && earned.format ? earned.format() : String(earned);
        const message = 'Вы заработали ' + amount + ' за ' + Math.floor(offlineSeconds) + ' сек оффлайна';
        this.showPopup({ title: 'Оффлайн доход', body: message });
    }

    showPopup(payload = {}) {
        const title = payload.title || '';
        const body = payload.body || '';
        const overlay = document.createElement('div');
        overlay.className = 'ui-popup-overlay';
        const card = document.createElement('div');
        card.className = 'ui-popup-card';
        if (title) {
            const h = document.createElement('h3');
            h.innerText = title;
            card.appendChild(h);
        }
        const p = document.createElement('div');
        p.innerText = body;
        p.style.cssText = 'color:#cbd5e1;line-height:1.5;margin-bottom:14px;';
        card.appendChild(p);
        const btn = document.createElement('button');
        btn.className = 'ui-action-btn';
        btn.innerText = 'Закрыть';
        btn.addEventListener('click', () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (payload.onClose) payload.onClose();
        });
        card.appendChild(btn);
        overlay.appendChild(card);
        if (this.popupLayer) this.popupLayer.appendChild(overlay); else document.body.appendChild(overlay);
    }
}

window.UIManager = UIManager;