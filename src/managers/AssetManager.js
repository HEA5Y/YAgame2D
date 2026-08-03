/**
 * AssetManager - Управление загрузкой и кэшированием ресурсов (изображения, звуки, спрайты)
 * Генерирует процедурную графику для всех эпох, чтобы не зависеть от внешних файлов.
 */
class AssetManager {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.sprites = {};
        this.loaded = false;
        this.progress = 0;
        
        // Конфигурация эпох для генерации
        this.eras = GameConfig.WORLDS;
    }

    /**
     * Загрузка всех ресурсов
     */
    async loadAll() {
        console.log('[AssetManager] Начало загрузки ресурсов...');
        
        try {
            // 1. Генерация спрайтов для фабрик (8 эпох)
            await this._generateFactorySprites();
            
            // 2. Генерация иконок ресурсов
            await this._generateResourceIcons();
            
            // 3. Генерация UI элементов
            await this._generateUIElements();
            
            // 4. Инициализация звуков (синтез)
            this._initSounds();
            
            this.loaded = true;
            this.progress = 100;
            
            console.log('[AssetManager] Все ресурсы загружены и сгенерированы.');
            
            // СообщаемEventManager о завершении
            if (window.EventBus) {
                EventBus.emit('assets:loaded');
            }
            
            return true;
        } catch (error) {
            console.error('[AssetManager] Ошибка загрузки:', error);
            throw error;
        }
    }

    /**
     * Генерация спрайтов фабрик для каждой эпохи
     */
    _generateFactorySprites() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 128;
        canvas.width = size;
        canvas.height = size;

        this.eras.forEach((era, index) => {
            const key = `factory_era_${index}`;
            
            // Очистка
            ctx.clearRect(0, 0, size, size);
            
            // Фон эпохи
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, era.colors[0]);
            gradient.addColorStop(1, era.colors[1]);
            ctx.fillStyle = gradient;
            
            // Рисуем форму в зависимости от эпохи
            ctx.beginPath();
            if (index < 2) {
                // Ранние эпохи - простые формы
                ctx.roundRect(10, 10, size - 20, size - 20, 10);
            } else if (index < 5) {
                // Средние - сложные
                ctx.moveTo(size/2, 10);
                ctx.lineTo(size - 10, size/2);
                ctx.lineTo(size/2, size - 10);
                ctx.lineTo(10, size/2);
                ctx.closePath();
            } else {
                // Поздние - футуристичные
                ctx.arc(size/2, size/2, size/2 - 5, 0, Math.PI * 2);
            }
            
            ctx.fill();
            
            // Добавляем детали (окна, трубы)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(20 + i * 25, 30, 15, 15);
                ctx.fillRect(20 + i * 25, 60, 15, 15);
            }
            
            // Сохраняем как ImageBitmap или DataURL
            this.sprites[key] = canvas.toDataURL();
        });
        
        console.log('[AssetManager] Спрайты фабрик сгенерированы:', Object.keys(this.sprites).length);
    }

    /**
     * Генерация иконок ресурсов
     */
    _generateResourceIcons() {
        const resources = ['brainrots', 'gems', 'science', 'energy'];
        const colors = ['#FFD700', '#FF69B4', '#00BFFF', '#FF4500'];
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;

        resources.forEach((res, index) => {
            ctx.clearRect(0, 0, size, size);
            
            // Фон
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = colors[index];
            ctx.fill();
            
            // Блик
            ctx.beginPath();
            ctx.arc(size/2 - 10, size/2 - 10, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
            
            this.sprites[`icon_${res}`] = canvas.toDataURL();
        });
        
        console.log('[AssetManager] Иконки ресурсов сгенерированы.');
    }

    /**
     * Генерация UI элементов
     */
    _generateUIElements() {
        // Кнопки, фоны панелей и т.д. можно генерировать здесь
        // Пока используем CSS стили, но预留 место для сложных элементов
        this.sprites['ui_panel'] = null; 
    }

    /**
     * Инициализация звуков через Web Audio API (синтез)
     */
    _initSounds() {
        // Звуки будут синтезироваться на лету в AudioManager
        // Здесь только метаданные
        this.sounds = {
            'click': { type: 'synth', freq: 800, duration: 0.1 },
            'buy': { type: 'synth', freq: 1200, duration: 0.2 },
            'upgrade': { type: 'synth', freq: [600, 1200], duration: 0.3 },
            'achievement': { type: 'synth', freq: [400, 600, 800, 1000], duration: 0.5 },
            'error': { type: 'synth', freq: 200, duration: 0.2 }
        };
        console.log('[AssetManager] Звуковые профили инициализированы.');
    }

    /**
     * Получение спрайта по ключу
     */
    getSprite(key) {
        return this.sprites[key] || null;
    }

    /**
     * Получение изображения (если есть внешние)
     */
    getImage(key) {
        return this.images[key] || null;
    }

    /**
     * Предзагрузка внешних изображений (если понадобятся)
     */
    async preloadImage(url, key) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }
}

// Регистрация в глобальной области видимости для доступа из HTML
if (typeof window !== 'undefined') {
    window.AssetManager = AssetManager;
}
