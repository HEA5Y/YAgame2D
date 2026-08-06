class BackgroundParticles {
    constructor(count = 30) {
        this.particles = [];
        this.emojis = ['🧠', '🪙', '💎', '⚡', '🔥', '✨', '🧬', '🧪'];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random(),
            y: Math.random(),
            emoji: this.emojis[Math.floor(Math.random() * this.emojis.length)],
            size: 14 + Math.random() * 18,
            speedX: (Math.random() - 0.5) * 0.02,
            speedY: (Math.random() - 0.5) * 0.015,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            opacity: 0.08 + Math.random() * 0.15,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.5 + Math.random() * 1.5
        };
    }

    update(dt) {
        for (const p of this.particles) {
            p.x += p.speedX * dt;
            p.y += p.speedY * dt;
            p.rotation += p.rotSpeed * dt;
            p.pulsePhase += p.pulseSpeed * dt;

            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
            if (p.y < -0.05) p.y = 1.05;
            if (p.y > 1.05) p.y = -0.05;
        }
    }

    render(ctx, W, H) {
        for (const p of this.particles) {
            const px = p.x * W;
            const py = p.y * H;
            const pulse = 1 + Math.sin(p.pulsePhase) * 0.15;
            const size = p.size * pulse;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.opacity;
            ctx.font = size + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
}

class BootScene {
    constructor(sceneManager) { this.sceneManager = sceneManager; }
    enter() { setTimeout(() => this.sceneManager.changeScene('MainGameScene'), 100); }
    exit() {}
    update(dt) {}
    render(ctx, W, H) {}
}

class MainGameScene {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.particles = new BackgroundParticles(25);
        this.time = 0;
    }
    enter() { Logger.info('MainGameScene', 'active'); }
    exit() {}
    update(dt) {
        this.time += dt;
        this.particles.update(dt);
        const fm = ManagerRegistry.get('factory');
        if (fm && fm.update) fm.update(dt);
    }
    render(ctx, W, H) {
        ctx.fillStyle = '#0d111a';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(124,58,237,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        this.particles.render(ctx, W, H);

        ctx.strokeStyle = 'rgba(124,58,237,0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 40, W - 32, H - 56);

        const titlePulse = 1 + Math.sin(this.time * 2) * 0.02;
        ctx.save();
        ctx.translate(W / 2, 28);
        ctx.scale(titlePulse, titlePulse);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(124,58,237,0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('🏭 Brainrot Factory', 0, 0);
        ctx.restore();

        const fm = ManagerRegistry.get('factory');
        if (fm && fm.render) fm.render(ctx, W, H);
    }
}

class SceneManager {
    constructor(game) {
        this.game = game;
        this.scenes = new Map();
        this.currentScene = null;
        this.currentSceneName = '';
    }
    initScenes() {
        this.registerScene('BootScene', new BootScene(this));
        this.registerScene('MainGameScene', new MainGameScene(this));
        this.changeScene('BootScene');
    }
    registerScene(name, scene) { this.scenes.set(name, scene); }
    changeScene(name) {
        if (!this.scenes.has(name)) return;
        if (this.currentScene && this.currentScene.exit) this.currentScene.exit();
        this.currentSceneName = name;
        this.currentScene = this.scenes.get(name);
        if (this.currentScene && this.currentScene.enter) this.currentScene.enter();
    }
    update(dt) { if (this.currentScene && this.currentScene.update) this.currentScene.update(dt); }
    render(ctx, W, H) { if (this.currentScene && this.currentScene.render) this.currentScene.render(ctx, W, H); }
}

window.SceneManager = SceneManager;