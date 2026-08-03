/**
 * Класс AudioManager
 * Управляет звуковыми эффектами (SFX) и фоновой музыкой (BGM).
 * Поддерживает раздельные регулировки громкости и авто-mute при потере фокуса.
 */
class AudioManager {
    constructor() {
        this.sfxVolume = 1.0;
        this.musicVolume = 1.0;
        this.isMuted = false;
        
        this.sounds = new Map();
        this.currentMusic = null;
        this.currentMusicKey = null;

        // Автоматический mute при сворачивании или переключении вкладки браузера
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMusic();
            } else {
                this.resumeMusic();
            }
        });
    }

    /**
     * Загрузка и регистрация звука
     * @param {string} key Уникальный ключ звука
     * @param {string} url Путь к файлу
     * @param {boolean} isMusic Музыка это или короткий SFX
     */
    registerSound(key, url, isMusic = false) {
        const audio = new Audio(url);
        audio.loop = isMusic;
        audio.preload = 'auto';
        
        this.sounds.set(key, {
            element: audio,
            isMusic: isMusic
        });
    }

    /**
     * Воспроизведение звукового эффекта (SFX)
     * @param {string} key Ключ звука
     */
    playSfx(key) {
        if (this.isMuted) return;

        const soundData = this.sounds.get(key);
        if (!soundData) {
            Logger.warn('AudioManager', `SFX не найден: ${key}`);
            return;
        }

        // Для SFX клонируем элемент, чтобы можно было воспроизводить один звук многократно одновременно (например, клики)
        const clone = soundData.element.cloneNode();
        clone.volume = this.sfxVolume;
        clone.play().catch(error => {
            Logger.debug('AudioManager', `Браузер заблокировал воспроизведение SFX: ${error}`);
        });
    }

    /**
     * Воспроизведение фоновой музыки (BGM)
     * @param {string} key Ключ музыки
     */
    playMusic(key) {
        if (this.currentMusicKey === key && this.currentMusic && !this.currentMusic.paused) {
            return; // Музыка уже играет
        }

        this.stopMusic();

        const soundData = this.sounds.get(key);
        if (!soundData || !soundData.isMusic) {
            Logger.warn('AudioManager', `Музыкальный трек не найден или не помечен как музыка: ${key}`);
            return;
        }

        this.currentMusic = soundData.element;
        this.currentMusicKey = key;
        this.currentMusic.volume = this.isMuted ? 0 : this.musicVolume;
        
        this.currentMusic.play().catch(error => {
            Logger.warn('AudioManager', `Не удалось запустить музыку ${key}`, error);
        });
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
            this.currentMusicKey = null;
        }
    }

    pauseMusic() {
        if (this.currentMusic && !this.currentMusic.paused) {
            this.currentMusic.pause();
        }
    }

    resumeMusic() {
        if (this.currentMusic && this.currentMusic.paused && !this.isMuted) {
            this.currentMusic.play().catch(() => {});
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = MathUtils.clamp(volume, 0, 1);
    }

    setMusicVolume(volume) {
        this.musicVolume = MathUtils.clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.volume = this.isMuted ? 0 : this.musicVolume;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.currentMusic) {
            this.currentMusic.volume = this.isMuted ? 0 : this.musicVolume;
        }
        return this.isMuted;
    }
}