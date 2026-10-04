# Перевірка (Task A, Task B, бонус E)

> Сюди — лише те, що справді сталося: команди, коди виходу, числа, цитати. Порядок дій —
> `docs/walkthrough.md`. A/B — в окремому звіті `docs/mcp/ab-generic-vs-domain.md`, threat model — у
> `docs/mcp/threat-model.md`.

## Task A — сервер в Inspector

- Команди, якими зроблено чотири файли в `docs/mcp/` — ті самі, що в walkthrough (Task A, крок 4), без змін, Git Bash з кореня репозиторію, `>` у файл:
  ```bash
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list > docs/mcp/tools-list.json
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/call --tool-name leaddesk_set_lead_status --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/call --tool-name leaddesk_set_lead_status --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json   # exit=5
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json
  ```
  Коди виходу: `tools-list` 0, `set-status` 0, `bad-input` **5**, `resource-read` 0.
- `tools-list.json`: рівно два інструменти. `leaddesk_find_leads` — `{"readOnlyHint":true,"openWorldHint":false}`, `leaddesk_set_lead_status` — `{"readOnlyHint":false,"openWorldHint":false}`. Модель бачить `description` на кожному параметрі (їх 5), перелік значень статусу в `enum`, шаблон `^lead_\d{4}$` для `leadId`, межі 1–50 і значення за замовчуванням 10 для `limit`.
- `bad-input.json`: ламали два аргументи — `leadId=nope` (не збігається з `^lead_\d{4}$`) і `reason=ok` (2 символи, треба ≥ 3). Перевірка схеми відбувається в SDK, до обробника, тому текст помилки англійською, з двома зауваженнями: `Input validation error: Invalid arguments for tool leaddesk_set_lead_status: leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small: expected string to have >=3 characters`. Код виходу Inspector — **5**, у stderr `tool_is_error`.
- Помилки самого обробника (у файли не збережено; кожна — `isError: true`, код виходу 5; дані й текст — із прогону):
  - `leadId=lead_0099` → `Ліда lead_0099 у LeadDesk немає, статус не змінено. Знайди правильний id через leaddesk_find_leads …`
  - `leadId=lead_0002 status=new` (лід уже `new`) → `Лід lead_0002 (Rynok Books) уже має статус new. Нічого не змінено, запис в аудит не створено. …`
  - `leaddesk_find_leads limit=51` → `Input validation error … limit: Too big: expected number to be <=50`
- `set-status.json`: `lead_0002` (Rynok Books), `new → contacted`. Запис аудиту:
  ```json
  { "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-04T12:54:27.624Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }
  ```
- Додаткові перевірки `leaddesk_find_leads` на фікстурі: `status=new limit=5` → total 6, `lead_0002, lead_0005, lead_0004, lead_0018, lead_0012`; `status=won` → total 5, сума бюджетів 9000; `status=qualified` → `lead_0001, lead_0013, lead_0015`; `status=any` без `limit` → total 20, показано 10 (за замовчуванням).
- Сесія з одним процесом (стан між викликами; Inspector запускає сервер заново на кожен виклик, тому це окремий скрипт): `find new` → total 6; `set lead_0002 new → contacted`; `find new` → total 5, `lead_0002` зник; `find contacted` містить `lead_0002`; повторний `set … contacted` → `isError: true`; `set … contacted → lost` → успіх, запис аудиту з `from: contacted`, `to: lost`. Фікстура після цього лишилась ідентичною `materials/leads.json`.
- Самоперевірка з walkthrough: `console.log` у `src` — 0; `cmp` фікстури з `materials/leads.json` — збігається; `"isError": true` у `bad-input.json` — 1; персональних даних (`example.test`, `fullName`) у JSON-файлах — 0.
- Що було найважче в описах інструментів і параметрів:
  - **Правило підтвердження.** Модель бачить лише назву, опис і схему, тож у `leaddesk_set_lead_status` довелося прямо написати, що інструмент змінює дані. Найважче було сформулювати межу підтвердження: пряме прохання людини змінити статус саме цього ліда вже є підтвердженням, а якщо зміну пропонує сам агент, він спершу питає й називає id, компанію, поточний і новий статус.
  - **Однакові назви компаній.** Деякі компанії повторюються (наприклад, Green Leaf Market — `lead_0004` і `lead_0018`), тому в описах і в тексті помилок сказано розрізняти ліди за `id`, а не за назвою.
  - **Два шари помилок.** `bad-input.json` показує помилку SDK, а не мого обробника: `leadId=nope` і `reason=ok` не проходять схему Zod ще до виклику обробника, тому текст англійською. Власні підказки («Ліда … немає», «уже має статус …») видно лише з валідним `leadId` і `status`, тож їх перевіряв окремими прогонами.
  - **Лише потрібні поля.** Ім'я, email і текст заявки відкидаються під час завантаження фікстури, а не у відповіді, тому жоден шлях коду не може їх віддати. Для `budget: null` у текстовій відповіді пишу «бюджет не вказано».
  - **Стан між викликами.** Кожен виклик Inspector'а запускає сервер заново, тож збереження стану ним не перевірити. Це перевірив окремим скриптом з одним довгоживучим процесом (див. «Сесія з одним процесом» вище).
  - **Процес команди в ресурсі.** Зміст `leaddesk://reference/statuses` — це правила команди (хто ставить `won`, що потрібно для `qualified`). Їх у коді не знайти, тому текст є чернеткою, яку треба звірити з реальним процесом.

## Task B — що зробили агенти з серверами

- **Supabase:** <які інструменти викликав агент для міграції й сиду; що ви схвалили вручну; чи щось відхилили>
- **Vercel:** <як задеплоїли (git-інтеграція); яким інструментом отримали лог; що в ньому>
- **Figma:** <`whoami`: план і сіт; скільки викликів витратили з квоти; з якого фрейму токени>
- **Playwright:** <ланцюжок інструментів; чи відправилась форма; що в консолі й мережі>
- Що агент зробив сам, без прохання (наприклад, викликав інструмент, який ви не очікували): <… / нічого>

## Task E (бонус)

- Варіант: <E1 HTTP-сервер / E2 отруєний опис / E3 Cursor>
- <команди, виводи, спостереження — див. walkthrough, Task E>
