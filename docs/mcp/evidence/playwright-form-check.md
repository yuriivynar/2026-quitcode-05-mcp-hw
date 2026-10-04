# Playwright: перевірка форми заявки

Сервер `playwright` (`@playwright/mcp@0.0.82`, `--isolated --no-webmcp --allowed-origins http://localhost:3000`),
`.claude/settings.json` із блоком `deny` для Playwright (знімки «до» і «після» — `mcp-before.txt`,
`mcp-after.txt`). Сесія лише з `playwright`: `supabase` і `vercel` вимкнено в `/mcp`. Застосунок —
`npm run dev` на `http://localhost:3000`. Sonnet 5.5, рівень `high`. У списку інструментів, який
отримав агент, — 21 інструмент (у знімку «після» перелічено ті самі 21); `/mcp` для цієї сесії не
знімали.

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і
> мережу. Інших адрес не відкривай.

## Ланцюжок інструментів

| # | Інструмент | Що зроблено |
|---|---|---|
| 1 | `ToolSearch` | агент підтягнув схеми шести потрібних інструментів (вбудований інструмент Claude Code, не MCP) |
| 2 | `browser_navigate` | `http://localhost:3000` — заголовок сторінки «LeadDesk» |
| 3 | `browser_snapshot` | дерево доступності сторінки: знайшов поля форми й кнопку |
| 4 | `browser_fill_form` | заповнив 8 полів (див. нижче) |
| 5 | `browser_click` | кнопка «Надіслати заявку» |
| 6 | `browser_snapshot` | перевірка результату на сторінці |
| 7 | `browser_console_messages` | `level: info`, `all: true` |
| 8 | `browser_network_requests` | `static: false` |

Усі сім викликів (шість різних інструментів: `browser_navigate`, `browser_snapshot`, `browser_fill_form`,
`browser_click`, `browser_console_messages`, `browser_network_requests`) відповідають точним правилам `allow`
у `.claude/settings.json` з префіксом `mcp__playwright__` (наприклад, `mcp__playwright__browser_navigate`),
тому за конфігом запиту на схвалення не потребували. Заборонені інструменти (`browser_run_code_unsafe`, `browser_file_upload`, `browser_drop`,
`browser_evaluate`) відсутні в контексті агента, а `browser_network_request` (одниця) агент не викликав.
Жодного іншого URL, окрім `http://localhost:3000/`, не відкривалось; у браузері агента ніхто не
логінився.

## Тестові дані (синтетичні)

Ім'я «Тест», прізвище «Тестовий», email `test@example.com`, телефон `+380501234567`, компанія
«Test LLC», сайт `https://example.com`, бюджет «$500–1500 / міс.», опис «Тестова заявка: потрібен
лендінг.». Прапорець розсилки не чіпали.

## Чи відправилась форма

Так. Після кліку на сторінці з'явилося повідомлення (елемент `alert` у знімку): **«Дякуємо! Заявку
отримано.»**

## Консоль

`Total messages: 2 (Errors: 0, Warnings: 0)`: інфо-повідомлення про React DevTools і `[HMR] connected`.
Помилок і попереджень немає.

## Мережа

Один не-статичний запит: `[POST] http://localhost:3000/ => [200] OK` — Server Action форми. Ще 22
статичні запити агент не переглядав (`static: false`), тож твердження «зовнішніх запитів немає»
стосується лише переглянутого запиту; перелік статики не перевірено.

## Побічні файли

Знімки сторінок і лог консолі сервер зберіг у `.playwright-mcp/` (3 файли). Тека в `.gitignore`, у
репозиторій не потрапляє.
