# Chronos

An hourly activity logger. Every hour during your wake window, Chronos prompts you with a notification — tap it and log, in up to three words, what you spent the last hour on. Over time you build an honest, low-effort picture of where your time actually goes.

The whole point is **frequent prompts, tiny entries**. Accuracy comes from being asked every hour, not from writing detailed notes.

## Status

Early MVP. Android-first. Local-only — entries live in on-device SQLite, nothing is sent to a server.

## Core loop

- **Notification window** (configurable, default 08:00–23:00). On the hour, Chronos fires a local notification asking about the hour that just ended. The first prompt fires one hour after Start (e.g. Start 8 AM → first prompt 9 AM, asking about 8–9 AM); the last prompt fires at End.
- **Log modal.** Tap the notification → modal opens with the relevant hour preloaded. Type up to three words → save.
- **Today timeline.** Reverse-chronological list of hours you've logged for the selected day. Empty hours aren't rendered.
- **Backfill.** A center "+" button on the Today tab opens the modal in pick mode (date + hour range) so missed hours can be filled in later.
- **Day picker.** `‹` / `›` chevrons (and a date picker) on the Today tab let you jump to any past day.

## Tech

- [Expo](https://expo.dev) (~55) with [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing
- [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) for hourly scheduled prompts (Android `DAILY` triggers, one per hour in the window)
- [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local entry + settings storage
- React Native 0.83 / React 19

## Running it

> [!IMPORTANT]
> **Don't use Expo Go.** Expo Go strips `Notifications.scheduleNotificationAsync`, so the entire prompt loop will silently no-op. Use a development build.

```bash
npm install
npx expo run:android         # builds & installs the dev client on a connected device/emulator
# or, after the dev client is installed:
npx expo start --dev-client
```

iOS / web builds compile but aren't actively verified — Android is the priority surface.

### Android permissions

On first launch, Chronos routes to a permissions screen and won't proceed until they're granted. There are three things to allow:

1. **Notifications** (`POST_NOTIFICATIONS`) — system prompt; Chronos requests it inline.
2. **Alarms & reminders** (`SCHEDULE_EXACT_ALARM`, Android 12+) — opens a system page; toggle "Allow" for Chronos.
3. **Ignore battery optimization** — opens the battery-optimization list; find Chronos and choose "Don't optimize."

Some manufacturers (Samsung, Xiaomi/Redmi, OnePlus, Oppo, Huawei) aggressively kill background scheduled alarms even with the system permission. The permissions screen has per-OEM tips inline. If hourly prompts ever stop firing in real use, that's the first thing to check — battery managers, not the code.

## Project layout

```
src/
  app/
    _layout.tsx            root: init DB, request notifications, gate first-run
    permissions.tsx        permissions screen (first-run + Settings entry)
    log.tsx                log modal (single + batch/pick mode)
    (tabs)/
      _layout.tsx          tab nav (Today / Settings)
      index.tsx            Today: day picker + timeline
      settings.tsx         notification window, permissions link, diagnostics
  components/               themed primitives, day timeline, hour row, app tabs
  lib/
    db.ts                  SQLite schema + queries (entries, settings kv)
    notifications.ts       channel setup, permission helper, schedule loop
    settings.ts            notify window + first-run flag
    time.ts                hour/day math + formatters
  constants/theme.ts       colors, spacing, fonts
```

## Scripts

```bash
npm run android      # alias for `expo run:android`
npm start            # `expo start`
npm run lint         # `expo lint`
```
