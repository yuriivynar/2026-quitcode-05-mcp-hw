# A/B, прогін B: доменний сервер (LeadDesk MCP із Task A, режим фікстури)

- Сесія: `44c518b1-b053-499b-9c56-54594fa79184.jsonl`
- Час (UTC): 2026-10-04T16:31:59.348Z → 2026-10-04T16:35:08.265Z
- Модель: Sonnet 5.5 (claude-sonnet-5-5), effort high
- Режими дозволів у записі: default
- Джерело: запис сесії Claude Code (.jsonl), відрендерений без змін тексту; запити на схвалення в записі не зберігаються, їх дослівний текст — у `docs/mcp/ab-generic-vs-domain.md`.


## Запит 1

**Людина:** Скільки лідів зараз у статусі qualified? Назви їхні ідентифікатори й компанії.

**Виклик:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 1
}
```

**Результат** (`ToolSearch`):

```
[tool_reference]
```

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "qualified",
  "limit": 50
}
```

**Результат** (`mcp__leaddesk__leaddesk_find_leads`):

```
{"status":"qualified","total":3,"returned":3,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"}]}
```

**Агент:** Зараз у статусі **qualified** 3 ліди:

| ID | Компанія |
|---|---|
| lead_0001 | North Wind Yachts |
| lead_0013 | Bloom Florists |
| lead_0015 | Bloom Florists |

Bloom Florists тут двічі, але це два окремі ліди з різними id, джерелами та бюджетами.


## Запит 2

**Людина:** Покажи п'ять найновіших лідів зі статусом new: ідентифікатор, компанія, дата заявки.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "new",
  "limit": 5
}
```

**Результат** (`mcp__leaddesk__leaddesk_find_leads`):

```
{"status":"new","total":6,"returned":5,"leads":[{"id":"lead_0002","company":"Rynok Books","status":"new","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"}]}
```

**Агент:** П'ять найновіших лідів зі статусом **new** (усього їх 6):

| ID | Компанія | Дата заявки |
|---|---|---|
| lead_0002 | Rynok Books | 2026-09-13 |
| lead_0005 | Brick & Beam | 2026-09-12 |
| lead_0004 | Green Leaf Market | 2026-08-30 |
| lead_0018 | Green Leaf Market | 2026-07-18 |
| lead_0012 | Lviv Coffee Lab | 2026-07-07 |

Green Leaf Market тут двічі, але це два окремі ліди: lead_0004 із facebook-ads і lead_0018 із google-ads. Шостий лід у статусі new старший за ці п'ять, тому в список не потрапив.


## Запит 3

**Людина:** Який сумарний бюджет лідів у статусі won? Ліди без бюджету в суму не додавай, але скажи, скільки їх.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "won",
  "limit": 50
}
```

**Результат** (`mcp__leaddesk__leaddesk_find_leads`):

```
{"status":"won","total":5,"returned":5,"leads":[{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:** Сумарний бюджет лідів у статусі **won** — **9 000**.

5000 + 1000 + 2500 + 500 = 9000

Усього won-лідів 5. Бюджет вказано у чотирьох: lead_0011 (5000), lead_0016 (1000), lead_0010 (2500), lead_0017 (500).

Без бюджету **один** лід: lead_0006 (Nova Dental). У суму він не входить.


## Запит 4

**Людина:** Які статуси лідів є в LeadDesk і що кожен із них означає для команди?

**Виклик:** `ToolSearch`

```json
{
  "query": "select:ReadMcpResourceTool",
  "max_results": 1
}
```

**Результат** (`ToolSearch`):

```
[tool_reference]
```

**Виклик:** `ReadMcpResourceTool`

```json
{
  "server": "leaddesk",
  "uri": "leaddesk://reference/statuses"
}
```

**Результат** (`ReadMcpResourceTool`):

```
{"contents":[{"uri":"leaddesk://reference/statuses","mimeType":"text/markdown","text":"# Статуси лідів LeadDesk\n\nЛід завжди має рівно один із п'яти статусів; інших немає. Кожна зміна статусу — з причиною і лишає запис в аудиті.\n\n| Статус | Що означає для команди | Коли переводимо сюди | Хто переводить |\n|---|---|---|---|\n| `new` | Заявка надійшла, з клієнтом ще ніхто не говорив | Ставиться сам, коли лід створено; вручну — лише щоб виправити помилкову зміну | система (форма заявки) |\n| `contacted` | Відбувся перший справжній контакт: розмова телефоном, відповідь на email або зустріч | Після контакту, а не після спроби, на яку ніхто не відповів | менеджер, який говорив із клієнтом |\n| `qualified` | Підтверджено: реальна задача, бюджет у наших межах, на зв'язку той, хто ухвалює рішення, зрозумілі строки | Після брифу, коли підтверджено всі чотири пункти | менеджер, з погодженням керівника продажів |\n| `won` | Клієнт погодився: договір підписано або аванс сплачено | Лише після підпису чи оплати — усна згода ще не won | керівник продажів або власник агенції |\n| `lost` | Угоди не буде: відмова, обрали іншу агенцію, зник після кількох спроб зв'язку або задача нам не підходить | З будь-якого етапу, з причиною | менеджер ліда |\n\n## Типовий шлях\n\n`new` → `contacted` → `qualified` → `won`; з будь-якого етапу — `lost`.\n\n## Правила\n\n- Етап можна перескочити (наприклад, `new` → `qualified` після одного довгого брифу) — причина має це пояснити.\n- Повернення назад (наприклад, `lost` → `contacted`, якщо клієнт повернувся) дозволене, з причиною.\n- `won` і `lost` — закриті ліди; конверсія = won / (won + lost).\n- Агент сам статус не змінює: лише коли людина прямо попросила змінити статус цього ліда або підтвердила зміну.\n- У причину не пишемо персональних даних клієнта.\n"}]}
```

**Агент:** У LeadDesk є рівно п'ять статусів, інших немає.

| Статус | Що означає для команди | Коли ставимо | Хто переводить |
|---|---|---|---|
| `new` | Заявка надійшла, з клієнтом ще ніхто не говорив | Статус виставляється сам при створенні ліда. Вручну його ставлять лише для виправлення помилкової зміни | система (форма заявки) |
| `contacted` | Відбувся перший справжній контакт: розмова телефоном, відповідь на email або зустріч | Після контакту, а не після спроби, на яку ніхто не відповів | менеджер, який говорив із клієнтом |
| `qualified` | Підтверджено реальну задачу, бюджет у наших межах, особу, що ухвалює рішення, і зрозумілі строки | Після брифу, коли підтверджено всі чотири пункти | менеджер, з погодженням керівника продажів |
| `won` | Клієнт погодився: договір підписано або аванс сплачено | Лише після підпису чи оплати. Усна згода ще не won | керівник продажів або власник агенції |
| `lost` | Угоди не буде: відмова, клієнт обрав іншу агенцію, зник після кількох спроб зв'язку або задача нам не підходить | З будь-якого етапу, з причиною | менеджер ліда |

**Типовий шлях:** `new` → `contacted` → `qualified` → `won`. У `lost` лід можна перевести з будь-якого етапу.

**Правила:**
- Етап можна перескочити, наприклад `new` → `qualified` після одного довгого брифу. Причина зміни має це пояснити.
- Повернення назад дозволене, наприклад `lost` → `contacted`, якщо клієнт повернувся. Теж із причиною.
- `won` і `lost` — закриті ліди. Конверсія = won / (won + lost).
- Кожна зміна статусу потребує причини й лишає запис в аудиті. У причину не пишуть персональних даних клієнта.
- Я сам статус не змінюю. Роблю це лише тоді, коли ви прямо просите змінити статус конкретного ліда або підтверджуєте зміну.


## Запит 5

**Людина:** Ми вже зателефонували в Rynok Books щодо заявки lead_0002. Переведи цей лід у статус contacted.

**Виклик:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 1
}
```

**Результат** (`ToolSearch`):

```
[tool_reference]
```

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0002",
  "status": "contacted",
  "reason": "Зателефонували клієнту щодо заявки, відбувся перший контакт"
}
```

**Результат** (`mcp__leaddesk__leaddesk_set_lead_status`):

```
{"lead":{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-04T16:34:35.043Z","from":"new","to":"contacted","reason":"Зателефонували клієнту щодо заявки, відбувся перший контакт"}}
```

**Агент:** Лід **lead_0002** (Rynok Books) переведено зі статусу `new` у `contacted`.

У аудит записано причину: «Зателефонували клієнту щодо заявки, відбувся перший контакт».

Згідно з правилами, `contacted` ставимо після справжнього контакту, а не після спроби, на яку ніхто не відповів. Якщо клієнт не взяв слухавку, статус краще повернути в `new`.


## Запит 6

**Людина:** Лід lead_0003 (Metro Logistics) відмовився: обрали іншу агенцію. Познач його як lost і вкажи причину.

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0003",
  "status": "lost",
  "reason": "Клієнт відмовився: обрав іншу агенцію"
}
```

**Результат** (`mcp__leaddesk__leaddesk_set_lead_status`):

```
{"lead":{"id":"lead_0003","company":"Metro Logistics","status":"lost","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-04T16:35:06.125Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрав іншу агенцію"}}
```

**Агент:** Лід **lead_0003** (Metro Logistics) переведено зі статусу `contacted` у `lost`.

Причина в аудиті: «Клієнт відмовився: обрав іншу агенцію».

Бюджет цього ліда був 10 000, джерело — facebook-ads. Це закритий лід, тож він тепер враховується в знаменнику конверсії won / (won + lost).

