class FactoryManager {
    constructor(economyManager, saveManager) {
        this.economyManager = economyManager;
        this.saveManager = saveManager;
        this.lines = new Map();
        this.workers = [];
        this.linePositions = {};
        this.lineIcons = {
            'resource_intake': '📦',
            'cleaning': '🧼',
            'incubator': '🧬',
            'mutation': '⚗️',
            'assembly': '🔧',
            'quality_control': '🔍',
            'packaging': '📦',
            'sales': '💰'
        };
        this.lineColors = {
            'resource_intake': '#ff0055',
            'cleaning': '#00ffcc',
            'incubator': '#ffdd44',
            'mutation': '#ff66ff',
            'assembly': '#66ff66',
            'quality_control': '#66ccff',
            'packaging': '#ff9966',
            'sales': '#ffcc00'
        };
        this.time = 0;
        this.initLines();
        if (saveManager) saveManager.registerSubsystem('factory', this);
        this.subscribeEvents();
    }

    initLines() {
        for (const [lineId, config] of Object.entries(EconomyData.FACTORY_LINES)) {
            const line = new FactoryLine(lineId, config, this.economyManager);
            this.lines.set(lineId, line);
        }
        Logger.info('FactoryManager', `Инициализировано ${this.lines.size} линий`);
    }

    subscribeEvents() {
        gameEventBus.on('modifier_speed', (data) => {
            for (const line of this.lines.values()) line.speedMultiplier = data;
        });
        gameEventBus.on('modifier_energy', (data) => {
            for (const line of this.lines.values()) line.productionMultiplier = data;
        });
        gameEventBus.on('prestige_speed_bonus', (data) => {
            if (data && data.multiplier) {
                for (const line of this.lines.values()) line.speedMultiplier = data.multiplier;
            }
        });
        gameEventBus.on(GameConfig.EVENTS.PRESTIGE_ACTIVATED, () => {
            for (const line of this.lines.values()) {
                line.level = 0; line.unlocked = false; line.progress = 0;
                line.pendingCollection = new BigNumber(0);
            }
            Logger.info('FactoryManager', 'Прогресс сброшен');
        });
    }

    getLine(lineId) { return this.lines.get(lineId); }

    getTotalProductionPerSecond() {
        let total = new BigNumber(0);
        for (const line of this.lines.values()) {
            if (line.unlocked && line.level > 0) {
                const output = line.getProductionOutput();
                const time = line.getProductionTime();
                total = total.add(output.divide(new BigNumber(time)));
            }
        }
        return total;
    }

    processOfflineIncome(seconds) {
        return this.getTotalProductionPerSecond().multiply(seconds)
            .multiply(GameConfig.ECONOMY.OFFLINE_PRODUCTION_PERCENT);
    }

    update(dt) {
        this.time += dt;
        for (const line of this.lines.values()) line.update(dt);
        for (const worker of this.workers) worker.update(dt);
    }

    render(ctx, W, H) {
        const count = this.lines.size;
        if (count === 0) return;

        const marginX = 24;
        const marginY = 50;
        const gap = 12;
        const availableH = H - marginY - 16;
        const lineH = Math.min(110, Math.floor((availableH - (count - 1) * gap) / count));
        const lineW = W - marginX * 2;

        let idx = 0;
        for (const [lineId, line] of this.lines) {
            const y = marginY + idx * (lineH + gap);
            this.linePositions[lineId] = { x: marginX, y, w: lineW, h: lineH };
            this.renderLine(ctx, line, lineId, marginX, y, lineW, lineH);
            idx++;
        }
    }

    renderLine(ctx, line, lineId, x, y, w, h) {
        const r = 12;
        const color = this.lineColors[lineId] || '#ff0055';
        const icon = this.lineIcons[lineId] || '⚙️';
        const isActive = line.unlocked && line.level > 0;

        if (isActive) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 20 + Math.sin(this.time * 3) * 5;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
            ctx.restore();
        }

        ctx.fillStyle = isActive ? 'rgba(42,53,72,0.8)' : 'rgba(18,24,38,0.5)';
        this.roundRect(ctx, x, y, w, h, r);
        ctx.fill();

        ctx.strokeStyle = isActive ? color : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = isActive ? 2 : 1;
        this.roundRect(ctx, x, y, w, h, r);
        ctx.stroke();

        const iconSize = 24;
        const iconX = x + 16;
        const iconY = y + h / 2;
        const iconPulse = isActive ? 1 + Math.sin(this.time * 4 + lineId.length) * 0.1 : 1;
        const iconRot = isActive ? Math.sin(this.time * 2 + lineId.length) * 0.1 : 0;

        ctx.save();
        ctx.translate(iconX, iconY);
        ctx.scale(iconPulse, iconPulse);
        ctx.rotate(iconRot);
        ctx.font = iconSize + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 0);
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(line.name + ' (Ур. ' + line.level + ')', x + 44, y + 22);

        if (isActive) {
            const barW = w - 200;
            const barH = 12;
            const barX = x + 44;
            const barY = y + 34;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.roundRect(ctx, barX, barY, barW, barH, 6);
            ctx.fill();

            const fillW = barW * Math.min(line.progress, 1);
            const grad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
            grad.addColorStop(0, color);
            grad.addColorStop(1, this.lightenColor(color, 40));
            ctx.fillStyle = grad;
            this.roundRect(ctx, barX, barY, fillW, barH, 6);
            ctx.fill();

            if (fillW > 5) {
                ctx.save();
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(barX + fillW - 3, barY, 3, barH);
                ctx.restore();
            }

            if (line.progress > 0.1 && line.progress < 0.95) {
                const particleX = barX + barW * line.progress;
                const particleY = barY + barH / 2;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (line.pendingCollection && line.pendingCollection.isGreaterThan(0)) {
                ctx.fillStyle = '#ffdd44';
                ctx.font = 'bold 13px Montserrat, Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('+' + line.pendingCollection.format() + ' 💰', x + w - 160, y + 44);
            }

            const prodPerSec = line.getProductionOutput().divide(new BigNumber(line.getProductionTime()));
            ctx.fillStyle = '#00ffcc';
            ctx.font = '12px Montserrat, Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(prodPerSec.format() + ' / сек', x + 44, y + 66);

            const workerCount = Math.min(line.level, 5);
            for (let i = 0; i < workerCount; i++) {
                const wx = x + 44 + i * 18;
                const wy = y + h - 18;
                const wobble = Math.sin(this.time * 3 + i * 1.5) * 2;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(wx, wy + wobble, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#666';
            ctx.font = '13px Montserrat, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🔒 Заблокировано', x + w / 2, y + h / 2 + 4);
        }

        const btnW = 130;
        const btnH = 32;
        const btnX = x + w - btnW - 14;
        const btnY = y + h - btnH - 12;

        if (isActive) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(btnX - 2, btnY - 2, btnW + 4, btnH + 4);
            ctx.restore();
        }

        ctx.fillStyle = isActive ? color : '#444';
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        if (isActive) {
            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            btnGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
            btnGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = btnGrad;
            this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
            ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isActive ? 'Улучшить' : 'Открыть', btnX + btnW / 2, btnY + btnH / 2);
        ctx.textBaseline = 'alphabetic';

        const cost = line.getUpgradeCost(1);
        ctx.fillStyle = '#ffdd44';
        ctx.font = '10px Montserrat, Arial, sans-serif';
        ctx.fillText(cost.format(), btnX + btnW / 2, btnY + btnH + 12);
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    handleClick(x, y) {
        for (const [lineId, line] of this.lines) {
            const pos = this.linePositions[lineId];
            if (!pos) continue;

            const btnW = 130;
            const btnH = 32;
            const btnX = pos.x + pos.w - btnW - 14;
            const btnY = pos.y + pos.h - btnH - 12;

            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                line.upgrade(1);
                return true;
            }

            if (line.unlocked && line.pendingCollection && line.pendingCollection.isGreaterThan(0)) {
                if (x >= pos.x && x <= pos.x + pos.w && y >= pos.y && y <= pos.y + pos.h) {
                    const collected = line.collectManual();
                    if (collected) {
                        gameEventBus.emit('manual_collect');
                        const ui = window.ManagerRegistry ? window.ManagerRegistry.get('ui') : null;
                        if (ui && ui.spawnFloatingText) ui.spawnFloatingText(x, y, '+' + collected.format(), '#ffdd44');
                        const pm = window.ManagerRegistry ? window.ManagerRegistry.get('particle') : null;
                        if (pm && pm.burst) pm.burst(x, y, this.lineColors[lineId] || '#ffdd44');
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getSaveData() {
        const data = {};
        for (const [lineId, line] of this.lines) data[lineId] = line.getSaveData();
        return data;
    }

    loadSaveData(data) {
        if (!data) return;
        for (const [lineId, lineData] of Object.entries(data)) {
            const line = this.lines.get(lineId);
            if (line) line.loadSaveData(lineData);
        }
        Logger.info('FactoryManager', 'Данные загружены');
    }
}

window.FactoryManager = FactoryManager;