class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
    }

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d', { alpha: false, desynchronized: true });
        this.dpr = window.devicePixelRatio || 1;
        this.setupResizeHandler();
        this.resize();
        Logger.info('CanvasManager', 'initialized');
    }

    setupResizeHandler() {
        let t;
        const onResize = () => { clearTimeout(t); t = setTimeout(() => this.resize(), 100); };
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('orientationchange', onResize, { passive: true });
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const w = parent.clientWidth;
        const h = parent.clientHeight;

        this.canvas.width = Math.max(1, Math.round(w * this.dpr));
        this.canvas.height = Math.max(1, Math.round(h * this.dpr));
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.width = w;
        this.height = h;

        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        if (window.gameInstance && window.gameInstance.eventBus) {
            window.gameInstance.eventBus.emit(GameConfig.EVENTS.RESIZE, { width: w, height: h });
        }
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    getCtx() { return this.ctx; }
    getContext() { return this.ctx; }
    getWidth() { return this.width; }
    getHeight() { return this.height; }

    screenToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    resetTransform() {
        if (this.ctx) this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    worldToScreen(worldX, worldY) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: rect.left + worldX, y: rect.top + worldY };
    }

    destroy() {
        this.canvas = null;
        this.ctx = null;
    }
}

window.CanvasManager = new CanvasManager();