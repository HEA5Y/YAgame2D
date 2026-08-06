class Game {
    constructor() {
        if (window.gameInstance) {
            Logger.warn('Game', 'Game уже создан');
            return window.gameInstance;
        }
        window.gameInstance = this;
        this.isRunning = false;
        this.managers = {};
        this.initWatchdog(3000);
    }

    initWatchdog(ms) {
        setTimeout(() => {
            if (document.getElementById('loading-screen')) {
                Logger.warn('Game', 'Watchdog: force start');
                this.forceStartGame();
            }
        }, ms);
    }

    async init() {
        Logger.info('Game', 'init...');
        try {
            const reg = window.ManagerRegistry;
            this.managers.save = reg.get('save');
            this.managers.economy = reg.get('economy');
            this.managers.time = reg.get('time');
            this.managers.factory = reg.get('factory');
            this.managers.upgrade = reg.get('upgrade');
            this.managers.ui = reg.get('ui');
            this.managers.scene = reg.get('scene');
            this.managers.prestige = reg.get('prestige');
            this.managers.canvas = reg.get('canvas');

            const canvasEl = document.getElementById('game-canvas');
            if (canvasEl && this.managers.canvas) this.managers.canvas.init(canvasEl);

            const hasSave = (this.managers.save && this.managers.save.loadGame)
                ? await this.managers.save.loadGame() : false;

            await this.safeAsyncInit();

            if (hasSave && this.managers.time && this.managers.time.getOfflineSeconds) {
                const offSec = this.managers.time.getOfflineSeconds();
                if (offSec > 10 && this.managers.factory && this.managers.factory.processOfflineIncome) {
                    const earned = this.managers.factory.processOfflineIncome(offSec);
                    if (earned && earned.isGreaterThan && earned.isGreaterThan(0) && this.managers.ui) {
                        this.managers.ui.showOfflinePopup(earned, offSec);
                    }
                }
            }

            if (this.managers.scene && this.managers.scene.initScenes) this.managers.scene.initScenes();
            if (this.managers.ui && this.managers.ui.init) this.managers.ui.init();

            this.forceStartGame();
        } catch (e) {
            Logger.error('Game', 'init error: ' + (e.message || e));
            console.error(e);
            this.forceStartGame();
        }
    }

    async safeAsyncInit() {
        return Promise.race([
            new Promise(r => setTimeout(r, 300)),
            new Promise(r => setTimeout(r, 1500))
        ]);
    }

    forceStartGame() {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s ease';
            setTimeout(() => loader.remove(), 300);
        }
        const app = document.getElementById('game-app');
        if (app) {
            app.style.display = 'flex';
        }
        this.startLoop();
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas || !this.managers.canvas) return;

        const handle = (e) => {
            const pos = this.managers.canvas.screenToWorld(e.clientX, e.clientY);
            if (this.managers.factory && this.managers.factory.handleClick) {
                if (this.managers.factory.handleClick(pos.x, pos.y)) e.preventDefault();
            }
        };

        canvas.addEventListener('click', handle);
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) handle(e.touches[0]);
        }, { passive: false });
    }

    startLoop() {
        if (this.isRunning) return;
        this.isRunning = true;
        let last = performance.now();

        const loop = (now) => {
            if (!this.isRunning) return;
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;

            if (this.managers.factory && this.managers.factory.update) this.managers.factory.update(dt);
            const tween = window.ManagerRegistry ? window.ManagerRegistry.get('tween') : null;
            if (tween && tween.update) tween.update(dt);
            if (this.managers.scene && this.managers.scene.update) this.managers.scene.update(dt);

            if (this.managers.canvas && this.managers.canvas.getCtx()) {
                const ctx = this.managers.canvas.getCtx();
                const W = this.managers.canvas.getWidth();
                const H = this.managers.canvas.getHeight();
                this.managers.canvas.clear();
                if (this.managers.scene && this.managers.scene.render) {
                    this.managers.scene.render(ctx, W, H);
                }
                const pm = window.ManagerRegistry ? window.ManagerRegistry.get('particle') : null;
                if (pm && pm.render) pm.render(ctx);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}