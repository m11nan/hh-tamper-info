# HH.ru Hidden Info — Tampermonkey скрипт

Добавляет скрытую информацию к карточкам вакансий в выдаче HH.ru: тип публикации, налоги, количество откликов, ТК РФ, ГПХ, автоответ, бейджи компании, даты.

## Установка

1. Установите **Tampermonkey** для вашего браузера:
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - [Opera](https://addons.opera.com/extensions/details/tampermonkey-beta/)

2. Перейдите по ссылке для установки:
   [**Установить скрипт**](https://raw.githubusercontent.com/m11nan/hh-tamper-info/main/hh-hidden-info.user.js)

   Tampermonkey должен автоматически открыть страницу установки. Нажмите **«Установить»**.

3. Готово. Откройте [hh.ru/search/vacancy](https://hh.ru/search/vacancy) — на карточках появится дополнительная информация.

## Для Chrome и Edge (если Tampermonkey не устанавливает скрипт)

В браузерах на основе Chromium нужно включить **«Режим разработчика»** в управлении расширениями:

- Откройте `chrome://extensions` (или `edge://extensions`)
- Включите тумблер **«Режим разработчика»** (Developer mode)
- Обновите страницу установки скрипта

Это требование связано с политикой Chrome Web Store.

## Что добавляется

После блока с адресом на каждой карточке вакансии появляется три ряда:

```
Row 1: [⭐ Стандарт+] [⚠️ До вычета налогов] [📊 Отклики: +1122 / всего 1160]
Row 2: [📋 ТК РФ] [🤖 Автоответ ✓] [✅ Проверенный] [💻 ИТ-аккредитация]
Row 3: [создана 25 мая 2026] [опубл. 25 мая 2026] [обновл. 26 мая 2026]
```

### Расшифровка полей

| Поле | Источник | Пояснение |
|---|---|---|
| 👑 Премиум / ⭐ Стандарт+ / ⚡ Оптимум / Стандарт | `vacancyProperties.calculatedStates.HH` | Тип публикации вакансии |
| ⚠️ До вычета налогов | `compensation.gross: true` | Зарплата указана до вычета НДФЛ |
| ✅ После вычета | `compensation.gross: false` | Зарплата указана после вычета НДФЛ |
| 📊 Отклики | `responsesCount` / `totalResponsesCount` | Количество новых и всего откликов |
| 📋 ТК РФ / 📋 Без ТК РФ | `acceptLaborContract` | Оформление по Трудовому кодексу |
| 📝 ГПХ | `civilLawContracts[]` | Договоры ГПХ (самозанятые, ИП, физлица) |
| 🤖 Автоответ ✓ / 🤷‍♂️ Без автоответа | `autoResponse.acceptAutoResponse` | Принимает ли вакансия автоотклики |
| ✅ Проверенный | `company.@trusted` | Работодатель прошёл проверку HH |
| 💻 ИТ-аккредитация | `company.accreditedITEmployer` | Компания имеет ИТ-аккредитацию |
| 🕒 даты | `publicationTime`, `lastChangeTime`, `creationTime` | Даты создания, публикации, обновления |

## Разработка

```bash
npm install        # установка зависимостей (prettier, eslint)
npm run check      # проверка форматирования и линтинг
npm run format     # автоформатирование
```

## Обновление

Скрипт автоматически проверяет обновления раз в сутки через Tampermonkey (`@updateURL`).
