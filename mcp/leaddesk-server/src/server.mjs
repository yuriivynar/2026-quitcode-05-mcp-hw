// LeadDesk as an MCP server: two business verbs instead of SQL on the whole database.
// QuitCode Workshop 5, Task A. Same shape as examples/nbu-rates-mcp/server.mjs.
//
//   node src/server.mjs                              reads fixtures/leads.json, waits for MCP on stdin
//   LEADDESK_FIXTURE=/abs/path/leads.json node ...   another fixture (absolute path)
//
// Fixture mode: leads are read once and kept in memory. Status changes live only in this process
// and are gone on restart; the fixture file is never written. stdout is the protocol channel,
// so nothing here prints to it; a journal, if ever needed, goes to stderr without personal data.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Vocabulary of the app: LEAD_STATUSES in lib/types.ts, lead id format leadId() in lib/db.ts.
// lib/*.ts cannot be imported from a plain .mjs module, so the values are copied.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;
const STATUSES_URI = "leaddesk://reference/statuses";
const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Only these fields leave the server. Name, email and the text of the request are dropped at load
// time, so no code path below can leak them.
const publicLead = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

// State is module-level: loaded once, shared by every server instance the transport may create.
const leads = new Map(JSON.parse(await readFile(FIXTURE, "utf8")).map((row) => [row.id, publicLead(row)]));
const audit = []; // AuditEntry-shaped records of this process (AuditEntry in lib/types.ts)

// Newest first, as db.getLeads in lib/db.ts. ISO-8601 UTC strings sort chronologically.
const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);
const budgetText = (b) => (b === null ? "бюджет не вказано" : `бюджет ${b}`);
const line = (l) => `- ${l.id} · ${l.company} · ${l.status} · ${l.source} · ${budgetText(l.budget)} · ${l.createdAt.slice(0, 10)}`;
const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const STATUSES_MD = `# Статуси лідів LeadDesk

Лід завжди має рівно один із п'яти статусів; інших немає. Кожна зміна статусу — з причиною і лишає запис в аудиті.

| Статус | Що означає для команди | Коли переводимо сюди | Хто переводить |
|---|---|---|---|
| \`new\` | Заявка надійшла, з клієнтом ще ніхто не говорив | Ставиться сам, коли лід створено; вручну — лише щоб виправити помилкову зміну | система (форма заявки) |
| \`contacted\` | Відбувся перший справжній контакт: розмова телефоном, відповідь на email або зустріч | Після контакту, а не після спроби, на яку ніхто не відповів | менеджер, який говорив із клієнтом |
| \`qualified\` | Підтверджено: реальна задача, бюджет у наших межах, на зв'язку той, хто ухвалює рішення, зрозумілі строки | Після брифу, коли підтверджено всі чотири пункти | менеджер, з погодженням керівника продажів |
| \`won\` | Клієнт погодився: договір підписано або аванс сплачено | Лише після підпису чи оплати — усна згода ще не won | керівник продажів або власник агенції |
| \`lost\` | Угоди не буде: відмова, обрали іншу агенцію, зник після кількох спроб зв'язку або задача нам не підходить | З будь-якого етапу, з причиною | менеджер ліда |

## Типовий шлях

\`new\` → \`contacted\` → \`qualified\` → \`won\`; з будь-якого етапу — \`lost\`.

## Правила

- Етап можна перескочити (наприклад, \`new\` → \`qualified\` після одного довгого брифу) — причина має це пояснити.
- Повернення назад (наприклад, \`lost\` → \`contacted\`, якщо клієнт повернувся) дозволене, з причиною.
- \`won\` і \`lost\` — закриті ліди; конверсія = won / (won + lost).
- Агент сам статус не змінює: лише коли людина прямо попросила змінити статус цього ліда або підтвердила зміну.
- У причину не пишемо персональних даних клієнта.
`;

const status = z
  .enum([...LEAD_STATUSES, "any"])
  .describe("Статус, за яким шукати: new, contacted, qualified, won або lost; any — усі статуси");
const limit = z
  .number()
  .int()
  .min(1)
  .max(50)
  .default(10)
  .describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Найновіші — першими");

const leadId = z
  .string()
  .regex(LEAD_ID)
  .describe("Ідентифікатор ліда: lead_ і чотири цифри, напр. lead_0002. Бери з результату leaddesk_find_leads");
const newStatus = z
  .enum(LEAD_STATUSES)
  .describe("Новий статус: new, contacted, qualified, won або lost. Має відрізнятися від поточного");
const reason = z
  .string()
  .min(3)
  .max(500)
  .describe(
    "Чому змінюємо статус, 3–500 символів, напр. «зателефонували, домовились про бриф». Потрапляє в аудит — не пиши сюди email, телефони чи інші персональні дані",
  );

const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Пошук лідів LeadDesk",
      description:
        "Повертає ліди LeadDesk за статусом, найновіші першими (за датою заявки). Для кожного ліда — лише id, компанія, статус, джерело, бюджет і дата заявки; імен, email і текстів заявок інструмент не віддає. Застосовуй, щоб побачити, хто в роботі, порахувати ліди чи бюджет за статусом або знайти id ліда перед зміною статусу. У відповіді total — скільки лідів відповідає фільтру; якщо total більший за кількість показаних, повтори з більшим limit. Назви компаній можуть повторюватися — розрізняй ліди за id. Що означає кожен статус — у ресурсі leaddesk://reference/statuses. Тільки читає.",
      inputSchema: { status, limit },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status: wanted, limit: max }) => {
      const all = [...leads.values()].filter((l) => wanted === "any" || l.status === wanted).sort(byNewest);
      const page = all.slice(0, max).map((l) => ({ ...l })); // copies: callers never hold state
      const header =
        all.length === 0
          ? `Лідів зі статусом ${wanted} немає.`
          : `${wanted === "any" ? "Усього лідів" : `Лідів зі статусом ${wanted}`}: ${all.length}, показано ${page.length}, найновіші першими:`;
      return {
        content: [{ type: "text", text: [header, ...page.map(line)].join("\n") }],
        structuredContent: { status: wanted, total: all.length, returned: page.length, leads: page },
      };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Зміна статусу ліда LeadDesk",
      description:
        "Змінює дані: переводить один лід LeadDesk у новий статус і створює запис в аудиті з причиною. Викликай лише після підтвердження людини: пряме прохання людини змінити статус саме цього ліда вже є підтвердженням; якщо зміну пропонуєш ти сам — спершу спитай і назви id ліда, компанію, поточний і новий статус. id бери з leaddesk_find_leads, не вгадуй. Якщо лід уже має цей статус, інструмент поверне помилку й нічого не змінить. Що означає кожен статус і хто його ставить — у ресурсі leaddesk://reference/statuses.",
      inputSchema: { leadId, status: newStatus, reason },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ leadId: id, status: to, reason: why }) => {
      const lead = leads.get(id);
      if (!lead) {
        return fail(
          `Ліда ${id} у LeadDesk немає, статус не змінено. Знайди правильний id через leaddesk_find_leads (status "any", за потреби limit до 50) — назви компаній можуть повторюватися, тож звіряй за id.`,
        );
      }
      if (lead.status === to) {
        return fail(
          `Лід ${id} (${lead.company}) уже має статус ${to}. Нічого не змінено, запис в аудит не створено. Якщо йшлося про інший статус чи інший лід — перевір через leaddesk_find_leads.`,
        );
      }
      // No await between the change and the audit entry, so the pair is atomic on the event loop.
      const from = lead.status;
      lead.status = to;
      const entry = { action: "lead.status_changed", leadId: id, at: new Date().toISOString(), from, to, reason: why };
      audit.push(entry);
      return {
        content: [
          {
            type: "text",
            text: `Статус ${id} (${lead.company}) змінено: ${from} → ${to}. Запис аудиту ${entry.action} о ${entry.at}. Причина: ${why}`,
          },
        ],
        structuredContent: { lead: { ...lead }, audit: entry },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    STATUSES_URI,
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди: коли переводимо і хто вирішує",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MD }] }),
  );

  return server;
};

await serveStdio(factory);
