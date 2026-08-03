/**
 * Класс ObjectPoolManager
 * Управляет пулами переиспользуемых объектов для избежания аллокаций памяти (Garbage Collection).
 * Критично для всплывающих текстов урона/денег и частиц.
 */
class ObjectPoolManager {
    constructor() {
        // Хранилище всех пулов по категориям
        this.pools = new Map();
    }

    /**
     * Создает новый пул объектов определенного типа
     * @param {string} poolName Имя пула (например 'floating_text')
     * @param {Function} factory Функция, создающая новый экземпляр объекта
     * @param {number} initialSize Стартовый размер пула
     */
    createPool(poolName, factory, initialSize = 10) {
        if (this.pools.has(poolName)) {
            Logger.warn('ObjectPoolManager', `Пул ${poolName} уже существует!`);
            return;
        }

        const pool = {
            factory: factory,
            active: [],
            inactive: []
        };

        // Предварительная аллокация памяти
        for (let i = 0; i < initialSize; i++) {
            const obj = factory();
            if (typeof obj.reset === 'function') {
                obj.reset();
            }
            obj.isActive = false;
            pool.inactive.push(obj);
        }

        this.pools.set(poolName, pool);
        Logger.debug('ObjectPoolManager', `Пул ${poolName} создан. Размер: ${initialSize}`);
    }

    /**
     * Запрашивает объект из пула. Если свободных нет - пул автоматически расширяется.
     * @param {string} poolName Имя пула
     * @returns {Object} Активный объект
     */
    spawn(poolName) {
        const pool = this.pools.get(poolName);
        
        if (!pool) {
            Logger.error('ObjectPoolManager', `Запрос из несуществующего пула: ${poolName}`);
            return null;
        }

        let obj;

        if (pool.inactive.length > 0) {
            obj = pool.inactive.pop();
        } else {
            // Пул исчерпан, расширяем динамически
            obj = pool.factory();
            Logger.debug('ObjectPoolManager', `Пул ${poolName} расширен (не хватило объектов)`);
        }

        obj.isActive = true;
        pool.active.push(obj);

        return obj;
    }

    /**
     * Возвращает объект обратно в пул
     * @param {string} poolName Имя пула
     * @param {Object} obj Объект для возврата
     */
    despawn(poolName, obj) {
        const pool = this.pools.get(poolName);
        
        if (!pool) return;

        // Удаляем из активных
        const index = pool.active.indexOf(obj);
        if (index !== -1) {
            pool.active.splice(index, 1);
        }

        // Сбрасываем состояние объекта (если объект поддерживает интерфейс)
        if (typeof obj.reset === 'function') {
            obj.reset();
        }

        obj.isActive = false;
        pool.inactive.push(obj);
    }

    /**
     * Обновляет все активные объекты во всех пулах.
     * Вызывается из главного Engine.loop
     * @param {number} dt Delta time
     */
    update(dt) {
        for (const [poolName, pool] of this.pools.entries()) {
            // Итерируем с конца, так как элементы могут удаляться (despawn) прямо во время update
            for (let i = pool.active.length - 1; i >= 0; i--) {
                const obj = pool.active[i];
                
                if (typeof obj.update === 'function') {
                    // Если update возвращает true, значит объект "умер" (например, закончилась анимация)
                    const isDead = obj.update(dt);
                    if (isDead) {
                        this.despawn(poolName, obj);
                    }
                }
            }
        }
    }

    /**
     * Отрисовка всех активных объектов (например, частиц поверх UI)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        for (const pool of this.pools.values()) {
            for (let i = 0; i < pool.active.length; i++) {
                const obj = pool.active[i];
                if (typeof obj.render === 'function') {
                    obj.render(ctx);
                }
            }
        }
    }

    /**
     * Очищает всю память. Вызывается при жестком рестарте.
     */
    clearAll() {
        this.pools.clear();
        Logger.info('ObjectPoolManager', 'Все пулы очищены');
    }
}