# leaddesk-mcp-server

Доменний MCP-сервер LeadDesk (stdio, режим фікстури): два бізнес-дієслова й один ресурс замість SQL на
всю базу.

| Що | Ім'я | Примітка |
|---|---|---|
| Інструмент | `leaddesk_find_leads` | лише читає (`readOnlyHint: true`); з лідів віддає шість полів: `id`, `company`, `status`, `source`, `budget`, `createdAt` |
| Інструмент | `leaddesk_set_lead_status` | змінює дані; статус лише з переліку; на кожну зміну — запис аудиту `{ action, leadId, at, from, to, reason }` |
| Ресурс | `leaddesk://reference/statuses` | `text/markdown`: п'ять статусів і що кожен означає для команди |

Ліди читаються з `fixtures/leads.json` (незмінна копія `materials/leads.json`, 20 лідів) один раз.
Зміни статусів живуть лише в пам'яті процесу й зникають після перезапуску; файл фікстури сервер не
переписує. Імені, email і тексту заявки в пам'ять сервера не потрапляє.

## Запуск

```bash
(cd mcp/leaddesk-server && npm ci)
node mcp/leaddesk-server/src/server.mjs     # чекає на MCP у stdin — так і має бути
```

Змінна `LEADDESK_FIXTURE` — необов'язковий **абсолютний** шлях до іншої фікстури (відносний
рахувався б від поточної теки, а Claude Code запускає сервер не з вашого терміналу).

## Перевірка Inspector'ом

Git Bash, з кореня репозиторію (кожен виклик запускає сервер заново, тож стан щоразу чистий):

```bash
I="npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs"
$I --method tools/list
$I --method tools/call --tool-name leaddesk_find_leads --tool-arg status=new --tool-arg limit=5
$I --method tools/call --tool-name leaddesk_set_lead_status --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка"
$I --method resources/read --uri leaddesk://reference/statuses
```

Результат з `isError: true` Inspector завершує кодом **5** — це очікувано. Готові результати —
у `docs/mcp/`.

## Підключення до Claude Code

Скоуп `local` (запис у `~/.claude.json`, у git нічого не потрапляє), шлях до сервера — повний:

```bash
REPO="$(pwd -W)"      # у macOS/Linux — REPO="$(pwd)"
claude mcp add leaddesk -- node "$REPO/mcp/leaddesk-server/src/server.mjs"
```

Прибрати сервер, коли він більше не потрібен:

```bash
claude mcp remove leaddesk
```

`claude mcp add --scope project` писав би в `.mcp.json` у репозиторії — без «так» людини цього не
робимо. Для Task C сервер додається в порожню теку поза репозиторієм.
