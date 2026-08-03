/**
 * Класс FactoryManager
 * Управляет всеми производственными линиями фабрики, рабочими и визуализацией.
 * Интегрируется с EconomyManager для производства ресурсов.
 */

class FactoryManager {
    /**
     * @param {EconomyManager} economyManager
     * @param {SaveManager} saveManager
     */
    constructor(economyManager, saveManager) {
        this.economyManager = economyManager;
        this.saveManager = saveManager;
        
        // Все линии фабрики
        this.lines = new Map();
        
        // Рабочие (пул)
        this.workers = [];
        
        // Визуальные параметры для рендера
        this.canvasWidth = GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH;
        this.canvasHeight = GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT;
        
        // Позиции линий на экране
        this.linePositions = {};
        
        // Инициализация линий из конфига
        this.initLines();
        
        if (saveManager) {
            saveManager.registerSubsystem('factory', this);
        }
        
        this.subscribeEvents();
    }
    
    initLines() {
        // Создаем линии из EconomyData.FACTORY_LINES
        for (const [lineId, config] of Object.entries(EconomyData.FACTORY_LINES)) {
            const line = new FactoryLine(lineId, config, this.economyManager);
            this.lines.set(lineId, line);
            
            // Вычисляем позицию для рендера (вертикальный список)
            const index = Array.from(this.lines.keys()).indexOf(lineId);
            this.linePositions[lineId] = {
                x: 100,
                y: 350 + index * 180,
                width: 880,
                height: 140
            };
        }
        
        Logger.info('FactoryManager', `Инициализировано ${this.lines.size} производственных линий`);
    }
    
    subscribeEvents() {
        // Подписка на события изменения множителей
        gameEventBus.on('modifier_speed', (data) => {
            for (const line of this.lines.values()) {
                line.speedMultiplier = data;
            }
        });
        
        gameEventBus.on('modifier_energy', (data) => {
            for (const line of this.lines.values()) {
                line.productionMultiplier = data;
            }
        });
        
        // ИСПРАВЛЕНО: слушаем prestige_speed_bonus и применяем как modifier_speed
        gameEventBus.on('prestige_speed_bonus', (data) => {
            if (data && data.multiplier) {
                for (const line of this.lines.values()) {
                    line.speedMultiplier = data.multiplier;
                }
            }
        });
        
        gameEventBus.on(GameConfig.EVENTS.PRESTIGE_ACTIVATED, (data) => {
            // Сброс прогресса линий при престиже
            for (const line of this.lines.values()) {
                line.level = 0;
                line.unlocked = false;
                line.progress = 0;
                line.pendingCollection = new BigNumber(0);
            }
            Logger.info('FactoryManager', 'Прогресс фабрики сброшен из-за престижа');
        });
    }
    
    /**
     * Получить линию по ID
     */
    getLine(lineId) {
        return this.lines.get(lineId);
    }
    
    /**
     * Получить общее производство в секунду (для оффлайн-дохода)
     */
    getTotalProductionPerSecond() {
        let total = new BigNumber(0);
        for (const line of this.lines.values()) {
            if (line.unlocked && line.level > 0) {
                // Производство за цикл / время цикла = производство в секунду
                const output = line.getProductionOutput();
                const time = line.getProductionTime();
                const perSecond = output.divide(new BigNumber(time));
                total = total.add(perSecond);
            }
        }
        return total;
    }
    
    /**
     * Обработка оффлайн-дохода
     */
    processOfflineIncome(seconds) {
        const perSecond = this.getTotalProductionPerSecond();
        const total = perSecond.multiply(seconds);
        // Применяем множитель оффлайн
        const final = total.multiply(GameConfig.ECONOMY.OFFLINE_PRODUCTION_PERCENT);
        return final;
    }
    
    /**
     * Обновление всех линий
     */
    update(dt) {
        for (const line of this.lines.values()) {
            line.update(dt);
        }
        
        // Обновление рабочих
        for (const worker of this.workers) {
            worker.update(dt);
        }
    }
    
    /**
     * Рендер фабрики на Canvas
     */
    render(ctx) {
        // Фон фабрики
        ctx.fillStyle = '#1a1f2b';
        ctx.fillRect(50, 300, 980, 1400);
        
        // Заголовок
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏭 Производственные линии', 540, 340);
        
        // Рендер каждой линии
        for (const [lineId, line] of this.lines) {
            const pos = this.linePositions[lineId];
            this.renderLine(ctx, line, pos);
        }
    }
    
    /**
     * Рендер одной линии
     */
    renderLine(ctx, line, pos) {
        // Фон линии
        ctx.fillStyle = line.unlocked ? '#2a3548' : '#1a1f2b';
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        
        // Граница
        ctx.strokeStyle = line.unlocked ? '#ff0055' : '#444444';
        ctx.lineWidth = 3;
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        // Название и уровень
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${line.name} (Ур. ${line.level})`, pos.x + 20, pos.y + 40);
        
        // Прогресс бар производства
        if (line.unlocked && line.level > 0) {
            const barWidth = pos.width - 40;
            const barHeight = 20;
            const barX = pos.x + 20;
            const barY = pos.y + 60;
            
            // Фон прогресс бара
            ctx.fillStyle = '#1a1f2b';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Заполнение
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(barX, barY, barWidth * line.progress, barHeight);
            
            // Граница прогресс бара
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // Ожидающий сбор
            if (line.pendingCollection && line.pendingCollection.isGreaterThan(0)) {
                ctx.fillStyle = '#ffdd44';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`+${line.pendingCollection.format()} 💰`, pos.x + pos.width - 20, pos.y + 75);
            }
            
            // Производство в секунду
            const prodPerSec = line.getProductionOutput().divide(new BigNumber(line.getProductionTime()));
            ctx.fillStyle = '#00ffcc';
            ctx.font = '18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${prodPerSec.format()} / сек`, pos.x + 20, pos.y + 110);
        } else {
            // locked
            ctx.fillStyle = '#666666';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🔒 Заблокировано', pos.x + pos.width / 2, pos.y + 70);
        }
        
        // Кнопка улучшения
        const btnX = pos.x + pos.width - 200;
        const btnY = pos.y + 90;
        const btnWidth = 180;
        const btnHeight = 40;
        
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Улучшить', btnX + btnWidth / 2, btnY + 25);
        
        // Стоимость
        const cost = line.getUpgradeCost(1);
        ctx.fillStyle = '#ffdd44';
        ctx.font = '14px Arial';
        ctx.fillText(cost.format(), btnX + btnWidth / 2, btnY + 38);
    }
    
    /**
     * Обработка клика по линиям фабрики
     */
    handleClick(x, y) {
        for (const [lineId, line] of this.lines) {
            const pos = this.linePositions[lineId];
            
            // Проверка клика по кнопке улучшения
            const btnX = pos.x + pos.width - 200;
            const btnY = pos.y + 90;
            const btnWidth = 180;
            const btnHeight = 40;
            
            if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
                line.upgrade(1);
                return true;
            }
            
            // Проверка клика по линии для ручного сбора
            if (line.unlocked && line.pendingCollection && line.pendingCollection.isGreaterThan(0)) {
                if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
                    const collected = line.collectManual();
                    if (collected) {
                        gameEventBus.emit('manual_collect');
                        
                        // Визуальный эффект — получаем UI из реестра
                        const ui = (window.ManagerRegistry) ? window.ManagerRegistry.get('ui') : null;
                        if (ui && typeof ui.spawnFloatingText === 'function') {
                            ui.spawnFloatingText(x, y, `+${collected.format()}`, '#ffdd44');
                        }
                        
                        // Частицы — получаем particle из реестра
                        const particleManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('particle') : null;
                        if (particleManager && typeof particleManager.burst === 'function') {
                            particleManager.burst(x, y, '#ffdd44');
                        }
                        
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Сохранение и загрузка
    getSaveData() {
        const data = {};
        for (const [lineId, line] of this.lines) {
            data[lineId] = line.getSaveData();
        }
        return data;
    }
    
    loadSaveData(data) {
        if (!data) return;
        
        for (const [lineId, lineData] of Object.entries(data)) {
            const line = this.lines.get(lineId);
            if (line) {
                line.loadSaveData(lineData);
            }
        }
        
        Logger.info('FactoryManager', 'Данные фабрики загружены');
    }
}