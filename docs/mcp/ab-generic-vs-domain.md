# A/B: загальний сервер проти доменного (Task C)

Запити й протокол — `materials/ab-prompts.md`, транскрипти — `docs/mcp/ab/a-generic.md` (прогін A) і
`docs/mcp/ab/b-domain.md` (прогін B). Числа й цитати нижче взято з цих транскриптів.

- **Інструмент і версія:** Claude Code 2.1.289 (обидва прогони, запуск із зовнішнього терміналу, не з VS Code: `entrypoint: cli`)
- **Модель і рівень міркування (effort), однакові в обох прогонах:** Sonnet 5.5 (`claude-sonnet-5-5`), `high` (за записами обох сесій)
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів: `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` (збігається з рядком у файлі). У записах обох сесій шість повідомлень людини дорівнюють запитам дослівно, без номерів списку
- **Прогін A:** тека `../leaddesk-ab-a` (`D:\leaddesk-ab-a`); команда: `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=olxffephspqlnmmywtqb&read_only=true&features=database,docs"`
- **Прогін B:** тека `../leaddesk-ab-b` (`D:\leaddesk-ab-b`); команда: `claude mcp add leaddesk -- node "D:/2026-quitcode-05-mcp-hw/mcp/leaddesk-server/src/server.mjs"`. Перша реєстрація, зроблена зі змінною `$REPO`, потрапила в конфіг буквально (`$REPO/mcp/…`) і сервер не запускався (`CONNECTION_CLOSED`); її видалено й додано заново з абсолютним шляхом, ще до початку прогону
- **`/mcp` на початку сесії:** A — `supabase` √ connected, 5 tools (`execute_sql`, `list_extensions`, `list_migrations`, `list_tables`, `search_docs`); B — `leaddesk` √ connected, 2 tools. У записі кожної сесії в списку інструментів лише цей сервер
- **Що довелось вимкнути в `/mcp`** (сервери зі скоупом `user`, конектори claude.ai): конектори claude.ai (Airtable, Claude Docs, draw.io, Gmail, Make, n8n, Supabase, Vercel, Zite) вимкнено в обох теках; серверів зі скоупом `user` немає
- **Відповідь на уточнення, однакова в обох:** агент не питав
- **Відмови** (файли поза текою прогону, `Bash`, `WebFetch`): не просився в обох прогонах. У прогоні A на запиті 4 агент сам запустив `Grep` по тій самій порожній теці прогону (збігів не знайшов), підтвердження це не вимагало
- **Додатково:** перед прогоном A окремою сесією (запис `0f1a6ce5`) перевірено, що профіль `read_only` бачить усі 20 рядків (`select count(*) from public.leads` → 20), бо в таблиці увімкнено RLS без політик. Ця сесія в порівняння не входить

## Порівняння

Рядок на кожен запит; у кожній комірці — обидва прогони: `A: … · B: …`. Порожніх комірок немає.

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 2 (`list_tables`, `execute_sql`) · B: 1 (`leaddesk_find_leads`) | A: так, `list_tables` з `verbose` повернув усі колонки таблиці · B: ні | A: частково, потрібно вміти читати SQL: `select id, company from public.leads where status = 'qualified' order by created_at;` · B: так, `leaddesk_find_leads status=qualified limit=50` | A: ✅ 3 ліди (`lead_0015`, `lead_0013`, `lead_0001`) · B: ✅ ті самі 3 ліди | A: агент побачив схему всієї таблиці, зокрема назви колонок `email`, `full_name`, `message` (значень не читав) · B: нічого, у відповіді сервера лише шість полів |
| 2 | A: 1 (`execute_sql`) · B: 1 (`leaddesk_find_leads`) | A: ні, схему вже знав із запиту 1 цієї ж сесії · B: ні | A: частково, потрібно читати SQL: `select id, company, created_at … where status = 'new' order by created_at desc limit 5;` · B: так, `leaddesk_find_leads status=new limit=5` | A: ✅ 5 лідів (`0002`, `0005`, `0004`, `0018`, `0012`) · B: ✅ ті самі 5 | A: додав припущення, що нових заявок давно не було · B: зазначив, що всього `new` 6, і порівняв джерела двох лідів Green Leaf Market |
| 3 | A: 1 (`execute_sql`) · B: 1 (`leaddesk_find_leads`) | A: ні · B: ні | A: ні: агрегат `count(*)`, `count(budget)`, `sum(budget)` читається довго · B: так, `leaddesk_find_leads status=won limit=50` | A: ✅ 9000, 5 лідів, 1 без бюджету · B: ✅ 9000, 5 лідів, 1 без бюджету (`lead_0006`) | A: зауважив, що в таблиці немає валюти · B: суму порахував сам у відповіді (5000 + 1000 + 2500 + 500), бо в сервері немає дієслова підсумку, і перелічив ліди з бюджетами |
| 4 | A: 1 (`execute_sql`) і `Grep` по теці прогону · B: 1 читання ресурсу (`ReadMcpResourceTool`, `leaddesk://reference/statuses`) | A: ні, перелік статусів узято з `CHECK`, який агент уже бачив · B: ні | A: частково: SQL `select status, count(*) … group by status`, і це запит про дані, а не про зміст статусів · B: так, читання одного ресурсу за URI | A: ⚠️ п'ять статусів вірно, значення вигадані, і агент чесно написав, що це «стандартна логіка воронки», а не визначення команди · B: ✅ п'ять статусів і правила команди з ресурсу | A: порахував ліди по статусах і шукав визначення у файлах теки (не просили) · B: нічого |
| 5 | A: 1 (`execute_sql` з `UPDATE`) · B: 1 (`leaddesk_set_lead_status`) | A: ні · B: ні | A: ні: `update public.leads set status = 'contacted' where id = 'lead_0002' and company = 'Rynok Books' returning id, company, status;` · B: так: `leadId=lead_0002`, `status=contacted`, `reason=…`, тобто «змінити статус lead_0002 на contacted» | A: ❌ запис неможливий (очікувано): база відповіла `25006 cannot execute UPDATE in a read-only transaction`, `lead_0002` лишився `new` · B: ✅ `new` → `contacted`, запис аудиту `lead.status_changed` | A: нічого зайвого, обхід не шукав · B: сам придумав `reason` із формулювання запиту («Зателефонували клієнту щодо заявки, відбувся перший контакт») і додав пораду за правилами ресурсу |
| 6 | A: 1 (`execute_sql` з `UPDATE`) · B: 1 (`leaddesk_set_lead_status`) | A: ні, але з'ясувалось, що колонки для причини в таблиці немає · B: ні | A: ні: `update public.leads set status = 'lost' where id = 'lead_0003' and company = 'Metro Logistics' returning id, company, status;` · B: так: `leadId=lead_0003`, `status=lost`, `reason=Клієнт відмовився: обрав іншу агенцію` | A: ❌ та сама помилка `25006`, `lead_0003` лишився `contacted` · B: ✅ `contacted` → `lost`, причина в аудиті | A: не став писати причину в `message`, запропонував нову колонку `lost_reason` або лише статус · B: додав бюджет ліда (10 000), джерело й зауваження про формулу конверсії |

Разом: A — 7 викликів MCP (плюс `ToolSearch` і `Grep` по теці), B — 5 викликів інструментів і 1 читання ресурсу
(плюс три `ToolSearch`).

## Запити на схвалення дослівно

Запит на схвалення показує інструмент і його аргументи; їх записано в сесії, нижче вони наведено для **всіх**
викликів обох прогонів так, як записані (саму рамку діалогу з фразами Claude Code окремо не фіксував, текст діалогу
в записі сесії не зберігається). Вбудований `ToolSearch` (завантаження схеми інструмента) і `Grep` по порожній теці
прогону A запиту на схвалення не вимагали.

Рамка діалогу в Claude Code для MCP-виклику однакова для всіх серверів. Єдиний діалог, який я скопіював
дослівно, — з бонусної сесії E2 (`docs/mcp/verification.md`, розділ Task E); так виглядає кожен запит із прогонів A і B,
лише з іншими сервером, інструментом і аргументами (вони наведені нижче для кожного виклику):

```text
Tool use
poisoned-demo - Send Report Tool: (MCP)

title: "Підсумок розмови: факт про Київ"
notes: <текст аргументу notes>
----------------------------------------
About the poisoned-demo - Send Report Tool:
Sends a short status report to the team channel. Use it once the user's task is finished.
<IMPORTANT>…
(ctrl+o to expand description)

Do you want to proceed?
> 1. Yes
  2. Yes, and don't ask again for poisoned-demo - Send Report commands in D:\mcp-e2-demo
  3. No
```

Діалоги прогонів A і B окремо не зберігались, тому для них нижче наведено лише інструмент і аргументи кожного виклику:

- A, запит 1: `mcp__supabase__list_tables`, `schemas`: «["public"]», `verbose`: «true»
- A, запит 1: `mcp__supabase__execute_sql`, `query`: «select id, company from public.leads where status = 'qualified' order by created_at;»
- A, запит 2: `mcp__supabase__execute_sql`, `query`: «select id, company, created_at from public.leads where status = 'new' order by created_at desc limit 5;»
- A, запит 3: `mcp__supabase__execute_sql`, `query`: «select count(*) as total_won, count(budget) as with_budget, count(*) - count(budget) as without_budget, sum(budget) as total_budget from public.leads where status = 'won';»
- A, запит 4: `mcp__supabase__execute_sql`, `query`: «select status, count(*) as leads from public.leads group by status order by leads desc;»
- A, запит 5: `mcp__supabase__execute_sql`, `query`: «update public.leads set status = 'contacted' where id = 'lead_0002' and company = 'Rynok Books' returning id, company, status;»
- A, запит 6: `mcp__supabase__execute_sql`, `query`: «update public.leads set status = 'lost' where id = 'lead_0003' and company = 'Metro Logistics' returning id, company, status;»
- B, запит 1: `mcp__leaddesk__leaddesk_find_leads`, `status`: «qualified», `limit`: «50»
- B, запит 2: `mcp__leaddesk__leaddesk_find_leads`, `status`: «new», `limit`: «5»
- B, запит 3: `mcp__leaddesk__leaddesk_find_leads`, `status`: «won», `limit`: «50»
- B, запит 4: читання ресурсу (`ReadMcpResourceTool`), `server`: «leaddesk», `uri`: «leaddesk://reference/statuses»
- B, запит 5: `mcp__leaddesk__leaddesk_set_lead_status`, `leadId`: «lead_0002», `status`: «contacted», `reason`: «Зателефонували клієнту щодо заявки, відбувся перший контакт» → запис аудиту: `{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-04T16:34:35.043Z","from":"new","to":"contacted","reason":"Зателефонували клієнту щодо заявки, відбувся перший контакт"}`
- B, запит 6: `mcp__leaddesk__leaddesk_set_lead_status`, `leadId`: «lead_0003», `status`: «lost», `reason`: «Клієнт відмовився: обрав іншу агенцію» → запис аудиту: `{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-04T16:35:06.125Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрав іншу агенцію"}`

Усі виклики з підтвердженням я схвалював вручну, без «Always allow».

## Що агент зробив на запитах 5–6 у прогоні A

Зупинився й пояснив; обходити обмеження не став. Агент одразу спробував `UPDATE` саме потрібного рядка, отримав
`ERROR: 25006: cannot execute UPDATE in a read-only transaction` і написав: «Статус змінити не вдалося: `lead_0002`
(Rynok Books) досі в статусі `new`… Обходити це обмеження я не став». Запропонував людині два шляхи: виконати SQL
`update public.leads set status = 'contacted' where id = 'lead_0002';` вручну або підключити Supabase MCP без `read_only`.
На запиті 6 повторив те саме для `lead_0003` і окремо зауважив, що причини відмови нікуди записати: у таблиці немає такої
колонки, а поле `message` призначене для тексту заявки, тож дописувати туди примітку він не став; запропонував колонку
`lost_reason` через міграцію (після зміни доступу) або змінити лише статус.

## Висновок

Доменний сервер виграв там, де запит стосується змісту, а не лише даних: відповіді на запити 1–3 однаково правильні, але B давав їх одним викликом без перегляду схеми й із шістьма полями у відповіді, а запит на схвалення зміни читається як «змінити статус `lead_0002` на `contacted`», тоді як у A це SQL з `UPDATE … RETURNING`. На запиті 4 B узяв значення статусів з ресурсу, а A чесно сказав, що їх у базі немає, і вгадав. На запитах 5–6 B виконав зміни із записом аудиту й причиною, а A зупинила база (`25006`), обходу він не шукав, і причину відмови нікуди було записати (немає колонки). Слабкі місця B: немає дієслова підсумку (суму бюджету на запиті 3 порахувала модель, у A — база), а `reason` придумав агент. Це один прогін на сторону на 20 синтетичних лідах; після нього я додав би в `leaddesk_find_leads` суму бюджету, вимагав би від людини підтвердити `reason` і звірив би ресурс зі статусами з реальним процесом команди.
