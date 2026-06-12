# ParkManager

Мобильное приложение для управления парковкой: клиенты, автомобили, заезды/выезды, касса, долги, отчеты, график смен, нарушения и экспорт данных.

## Стек

- Expo 54
- React Native 0.81
- Expo Router
- TypeScript
- Supabase для синхронизации данных
- Bun для установки зависимостей и запуска команд

## Запуск

```cmd
bun install
bun run start-web
```

Для запуска на телефоне или эмуляторе используйте:

```cmd
bun run start
```

Затем откройте QR-код в Expo Go или выберите нужную платформу в терминале Expo.

## Переменные окружения

Создайте `.env` по примеру `.env.example`, если нужна синхронизация через Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Если Supabase не настроен, приложение продолжит работать локально.

## Тестовый вход

```txt
Логин: admin
Пароль: admin
```

## Проверка качества

```cmd
bun run lint
bunx tsc --noEmit
bunx expo export --platform web --clear
```

## Структура

```txt
app/          экраны и маршруты Expo Router
components/   общие компоненты
providers/    состояние авторизации, темы и парковки
utils/        расчеты, экспорт, Supabase, helpers
constants/    цвета и тарифы
assets/       иконки и splash
```

## Supabase

SQL для создания таблицы и realtime-политик находится в:

```txt
../delivery/SUPABASE_SETUP.sql
```
