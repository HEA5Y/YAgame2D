/**
 * Класс TimeManager
 * Отвечает за контроль времени в игре, расчет оффлайн-прогресса и защиту от читов (time-skipping).
 */
class TimeManager {
    constructor() {
        this.sessionStartTime = Date.now();
        this.lastUpdateTime = this.sessionStartTime;
        this.offlineSeconds = 0;
        this.totalPlayTime = 0;
        
        // Внутренний таймер для периодических событий (например, сохранение раз в минуту)
        this.tickTimer = 0;
    }

    /**
     * Вызывается при загрузке сохранений. Вычисляет, сколько игрок отсутствовал.
     * @param {number} savedLastTime Время последнего сохранения (timestamp)
     * @param {number} savedPlayTime Общее время в игре из сохранения
     */
    initializeFromSave(savedLastTime, savedPlayTime) {
        this.totalPlayTime = savedPlayTime || 0;
        
        const currentTime = Date.now();
        
        if (savedLastTime && savedLastTime > 0) {
            let diffMs = currentTime - savedLastTime;
            
            // Защита от читов: если время на устройстве перевели назад
            if (diffMs < 0) {
                Logger.warn('TimeManager', 'Обнаружено отрицательное время. Возможен чит со временем на устройстве.');
                diffMs = 0;
            }
            
            this.offlineSeconds = Math.floor(diffMs / 1000);
            
            // Ограничение максимального оффлайн времени (например, 24 часа)
            const maxOfflineSeconds = GameConfig.ECONOMY.MAX_OFFLINE_HOURS * 3600;
            if (this.offlineSeconds > maxOfflineSeconds) {
                Logger.info('TimeManager', `Оффлайн время обрезано с ${this.offlineSeconds} до ${maxOfflineSeconds} сек.`);
                this.offlineSeconds = maxOfflineSeconds;
            }
            
            Logger.info('TimeManager', `Игрок отсутствовал ${this.offlineSeconds} секунд.`);
        } else {
            this.offlineSeconds = 0;
        }
    }

    /**
     * Обновление времени в главном цикле
     * @param {number} dt Delta time в секундах
     */
    update(dt) {
        const currentTime = Date.now();
        
        // Обновляем общее время игры
        this.totalPlayTime += dt;
        this.lastUpdateTime = currentTime;
        
        // Таймер секундного тика (для событий, которые не нужно считать каждый кадр)
        this.tickTimer += dt;
        if (this.tickTimer >= 1.0) {
            this.tickTimer -= 1.0;
            this.onSecondTick();
        }
    }

    onSecondTick() {
        // Здесь можно вызывать генерацию случайных событий, проверку квестов и т.д.
    }

    /**
     * Возвращает данные для сохранения
     */
    getSaveData() {
        return {
            lastUpdateTime: this.lastUpdateTime,
            totalPlayTime: this.totalPlayTime
        };
    }

    getOfflineSeconds() {
        return this.offlineSeconds;
    }

    clearOfflineSeconds() {
        this.offlineSeconds = 0;
    }
}