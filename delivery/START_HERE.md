# Как запустить ParkManager

## Требования

- Node.js 20+
- Bun 1.3+

## Быстрый старт

1. Перейдите в папку приложения:

```cmd
cd expo
```

2. Установите зависимости:

```cmd
bun install
```

3. При необходимости подключите Supabase:

```cmd
copy .env.example .env
```

Заполните в `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Запустите web-версию:

```cmd
bun run start-web
```

5. Откройте локальный адрес из терминала.

## Данные для проверки

- Администратор: `admin` / `admin`
- На главной странице статус синхронизации должен быть `Онлайн`, если Supabase подключен и таблица создана.

## Настройка Supabase

Если приложение не может загрузить/сохранить данные в Supabase или в консоли виден `404`, выполните SQL из файла:

```txt
delivery/SUPABASE_SETUP.sql
```

Откройте Supabase Dashboard, перейдите в SQL Editor, вставьте содержимое файла и запустите запрос.

## Проверка перед сдачей

В папке `expo` выполните:

```cmd
bun run lint
bunx tsc --noEmit
bunx expo export --platform web --clear
```

Ожидаемый результат: lint и TypeScript проходят без ошибок, web export создается в папке `expo/dist`.
