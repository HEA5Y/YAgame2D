# 🧠 Brainrot Factory Evolution

Производственная idle-игра про эволюцию мемных существ для Yandex Games.

## 📁 Структура проекта

```
/workspace/
├── index.html              # Главный HTML файл
├── style.css               # Все стили игры (612 строк)
├── manifest.json           # PWA манифест
├── sw.js                   # Service Worker для оффлайн-работы
├── assets/                 # Директория для ассетов
│   ├── icons/             # Иконки для PWA
│   ├── audio/             # Звуковые файлы
│   └── images/            # Изображения
└── src/
    ├── main.js            # Точка входа приложения
    ├── core/              # Ядро игры
    │   ├── EventBus.js
    │   ├── GameConfig.js
    │   ├── Engine.js
    │   └── Game.js
    ├── sdk/               # Интеграция с платформами
    │   └── YandexSDKManager.js
    ├── managers/          # Менеджеры (17 шт.)
    │   ├── TimeManager.js
    │   ├── SaveManager.js
    │   ├── AudioManager.js
    │   ├── ResourceManager.js
    │   ├── ObjectPoolManager.js
    │   ├── EconomyManager.js
    │   ├── PrestigeManager.js
    │   ├── UIManager.js
    │   ├── SceneManager.js
    │   ├── UpgradeManager.js
    │   ├── AchievementManager.js
    │   ├── QuestManager.js
    │   ├── EventManager.js
    │   ├── OfflineManager.js
    │   ├── TweenManager.js
    │   ├── ParticleManager.js
    │   └── FactoryManager.js
    ├── data/              # Данные игры
    │   ├── EconomyData.js
    │   ├── UpgradeData.js      # 300+ улучшений
    │   ├── AchievementData.js  # 200+ достижений
    │   ├── QuestData.js
    │   └── EventData.js        # 100+ событий
    ├── entities/          # Игровые сущности
    │   ├── FactoryLine.js
    │   ├── Worker.js
    │   └── FloatingText.js
    └── utils/             # Утилиты
        ├── Logger.js
        ├── BigNumber.js
        └── MathUtils.js
```

## 🎮 Функционал

### Основные механики
- ✅ Производственные линии с прогресс-барами
- ✅ Ручной сбор ресурсов по клику
- ✅ Покупка и улучшение производственных линий
- ✅ Система улучшений (300+ апгрейдов)
- ✅ Достижения (200+)
- ✅ Квесты (ежедневные/еженедельные/сезонные)
- ✅ Престиж с Brain Cells
- ✅ Оффлайн-доход
- ✅ Случайные события

### Визуальные эффекты
- ✅ Частицы при сборе ресурсов
- ✅ Всплывающий текст (+монеты)
- ✅ Анимации через TweenManager
- ✅ Плавные переходы UI
- ✅ Градиентный фон с анимацией

### Технические особенности
- ✅ Интеграция Yandex Games SDK
- ✅ Сохранение (LocalStorage + IndexedDB + Cloud Yandex)
- ✅ PWA поддержка (Service Worker)
- ✅ Адаптивный дизайн под мобильные устройства
- ✅ Поддержка мультитача
- ✅ Обработка изменения ориентации
- ✅ Глобальная обработка ошибок

## 🚀 Запуск

### Локальный запуск
1. Откройте `index.html` в браузере
2. Для работы PWA и Service Worker используйте локальный сервер:
   ```bash
   npx serve .
   # или
   python -m http.server 8000
   ```

### Публикация на Yandex Games
1. Заархивируйте все файлы проекта
2. Загрузите архив в консоль разработчика Yandex Games
3. Пройдите модерацию

## 📊 Статистика проекта

- **35 JavaScript файлов** (~5490 строк кода)
- **1 CSS файл** (612 строк стилей)
- **1 HTML файл** (83 строки)
- **2 JSON файла** (манифест + конфиги)
- **1 Service Worker** (74 строки)
- **Итого: ~6260+ строк кода**

## 🎨 Цветовая схема

- Основной фон: `#0d0f12` → `#1a1f2b` (градиент)
- Акцентный цвет: `#ff0055` (розовый неон)
- Вторичный: `#00aaff` (голубой)
- Успех: `#00ff88` (зелёный)
- Монеты: `#ffdd44` (золотой)
- Алмазы: `#00ffcc` (бирюзовый)

## 📱 Поддерживаемые платформы

- ✅ Desktop браузеры (Chrome, Firefox, Safari, Edge)
- ✅ Mobile браузеры (iOS Safari, Chrome Android)
- ✅ Yandex Games платформа
- ✅ PWA установка на устройства

## 🔧 Архитектура

Игра построена на основе компонентного подхода с использованием менеджеров:

1. **Engine** - игровой цикл (update/render)
2. **Game** - центральный фасад, координирует все системы
3. **Managers** - изолированные подсистемы (экономика, сохранения, UI и т.д.)
4. **EventBus** - система событий для слабой связности компонентов
5. **ObjectPool** - пул объектов для оптимизации производительности

## 📄 Лицензия

Проект создан для публикации на Yandex Games.
