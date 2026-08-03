/**
 * Класс ResourceManager
 * Управляет загрузкой, кэшированием и отдачей всех медиа-ассетов (картинки, атласы, аудио).
 */
class ResourceManager {
    constructor() {
        this.images = new Map();
        this.atlases = new Map();
        this.audio = new Map();
        
        // Заглушка (розовый квадрат) на случай отсутствия текстуры, чтобы игра не падала
        this.fallbackCanvas = document.createElement('canvas');
        this.fallbackCanvas.width = 64;
        this.fallbackCanvas.height = 64;
        const ctx = this.fallbackCanvas.getContext('2d');
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, 64, 64);
    }

    /**
     * Первичная загрузка обязательных ассетов
     * @param {Function} onProgress Колбэк прогресса (0-100)
     */
    async loadInitialAssets(onProgress) {
        Logger.info('ResourceManager', 'Начало загрузки ассетов...');
        
        // Список ассетов для загрузки (в реальном проекте выносится в assets.json)
        // Для примера описываем прямо здесь:
        const manifest = {
            images: [
                { key: 'bg_main', url: 'assets/backgrounds/main_bg.png' },
                { key: 'ui_panel', url: 'assets/ui/panel_bg.png' },
                { key: 'ui_button', url: 'assets/ui/btn_primary.png' }
            ],
            atlases: [
                { 
                    key: 'game_atlas', 
                    imageUrl: 'assets/atlas/game_atlas.png', 
                    jsonUrl: 'assets/atlas/game_atlas.json' 
                }
            ],
            audio: [
                { key: 'bgm_main', url: 'assets/music/factory_theme.mp3' },
                { key: 'sfx_click', url: 'assets/sfx/click.mp3' },
                { key: 'sfx_cash', url: 'assets/sfx/cash.mp3' },
                { key: 'sfx_upgrade', url: 'assets/sfx/upgrade.mp3' }
            ]
        };

        let totalAssets = manifest.images.length + manifest.atlases.length * 2 + manifest.audio.length;
        let loadedAssets = 0;

        const updateProgress = () => {
            loadedAssets++;
            const percent = (loadedAssets / totalAssets) * 100;
            if (onProgress) onProgress(percent);
        };

        const promises = [];

        // 1. Загрузка одиночных картинок
        for (const img of manifest.images) {
            promises.push(
                this.loadImage(img.key, img.url)
                    .then(updateProgress)
                    .catch(() => { Logger.warn('ResourceManager', `Не удалось загрузить: ${img.url}`); updateProgress(); })
            );
        }

        // 2. Загрузка Атласов
        for (const atlas of manifest.atlases) {
            promises.push(
                this.loadAtlas(atlas.key, atlas.imageUrl, atlas.jsonUrl)
                    .then(() => { updateProgress(); updateProgress(); }) // +2 за картинку и json
                    .catch(() => { Logger.warn('ResourceManager', `Не удалось загрузить атлас: ${atlas.key}`); updateProgress(); updateProgress(); })
            );
        }

        // В этом месте в реальном проекте добавляется загрузка аудио,
        // но Audio API загружает их асинхронно через другой менеджер.

        await Promise.all(promises);
        Logger.info('ResourceManager', 'Загрузка ассетов завершена');
    }

    /**
     * Загрузка одного изображения
     */
    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            if (this.images.has(key)) {
                resolve(this.images.get(key));
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.images.set(key, img);
                resolve(img);
            };
            img.onerror = (e) => {
                reject(e);
            };
            img.src = url;
        });
    }

    /**
     * Загрузка Texture Атласа (Image + JSON Data)
     */
    async loadAtlas(key, imageUrl, jsonUrl) {
        try {
            // Загружаем картинку
            const img = await this.loadImage(`${key}_texture`, imageUrl);
            
            // Загружаем JSON (TexturePacker format)
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const jsonData = await response.json();
            
            // Парсим фреймы
            const frames = new Map();
            // Формат TexturePacker Hash
            for (const frameName in jsonData.frames) {
                const frameData = jsonData.frames[frameName].frame;
                frames.set(frameName, {
                    x: frameData.x,
                    y: frameData.y,
                    w: frameData.w,
                    h: frameData.h
                });
            }

            this.atlases.set(key, { texture: img, frames: frames });

        } catch (error) {
            Logger.error('ResourceManager', `Ошибка парсинга атласа ${key}`, error);
            throw error;
        }
    }

    /**
     * Получить полное изображение
     */
    getImage(key) {
        if (this.images.has(key)) return this.images.get(key);
        return this.fallbackCanvas;
    }

    /**
     * Отрисовка спрайта из атласа напрямую на Canvas
     * Оптимизировано для вызова в Render-цикле
     */
    drawSpriteFromAtlas(ctx, atlasKey, frameName, x, y, width, height) {
        const atlas = this.atlases.get(atlasKey);
        if (!atlas) {
            ctx.drawImage(this.fallbackCanvas, x, y, width, height);
            return;
        }

        const frame = atlas.frames.get(frameName);
        if (!frame) {
            ctx.drawImage(this.fallbackCanvas, x, y, width, height);
            return;
        }

        ctx.drawImage(
            atlas.texture,
            frame.x, frame.y, frame.w, frame.h, // Source (Atlas crop)
            x, y, width, height                 // Destination (Canvas position)
        );
    }
}