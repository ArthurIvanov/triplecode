# Public beta handoff — пункты 3, 5, 6, 7 + UI parity

**Дата:** 25.11.2026  
**Для кого:** агенты-исполнители (отдельные сессии на пункт)  
**Контекст:** критерии Stage 2 [product-plan.md](../product-plan.md); floor A–D/V уже в дереве.  
**SoT backlog:** [roadmap.md](../roadmap.md) секция **Волна β**.  
**Запреты:** ADR 0004 (нет rewrite IDE / Agents Window shell); без Scenario ID — нет продуктовой фичи ([AGENTS.md](../../AGENTS.md)).

---

## Как брать задачу (агентам)

1. Прочитать корневой `AGENTS.md` + `docs/engineering.md`.  
2. `git branch --show-current` / `git status` — своя ветка; не трогать чужой dirty.  
3. Взять **один** ID ниже (`R-β3` / `R-β5` / `R-β6` / `R-β7` или `R-V5…`).  
4. Открыть Scenario `Sxx` + этот файл (раздел пункта).  
5. DoD = все AC сценария + тест/лог QA + обновление checkbox в scenario + строка roadmap.  
6. PR: роль, `Scenario: Sxx`, AC, команды, что осталось.

Параллель: worktree. Не смешивать R-β3 и R-β5 в одном PR без явной просьбы.

---

## Карта «где взять» (roadmap → spec → scenario)

| Пункт (из gap-листа беты) | Roadmap ID | Scenario | Раздел в этом файле | Роль |
| --- | --- | --- | --- | --- |
| **3** Tab/inline по умолчанию | **R-β3** | [S20](../scenarios/S20-tab-inline-default.md) | §3 | Инженер AI + QA |
| **5** Индекс / `@` search | **R-β5** | [S21](../scenarios/S21-context-index-search.md) | §5 | Инженер AI + Архитектор |
| **6** Закрытый пилот → метрики | **R-β6** | [S22](../scenarios/S22-closed-pilot-metrics.md) | §6 | Аналитик + Продакт + web |
| **7** Live QA матрица | **R-β7** | [S23](../scenarios/S23-live-qa-public-beta.md) | §7 | QA + Релизы |
| UI parity (остаток) | **R-V5…R-V8** | [S19](../scenarios/S19-visual-parity-cursor-devin.md) + §UI | §UI | Дизайнер + AI |

Связанные уже закрытые floors (не переписывать с нуля):

| Тема | Уже есть | Не трогать как rewrite |
| --- | --- | --- |
| Tab/Cmd-K infra | S10 / R-C5 — toggle off by default | `inline.js`, `inline-logic.cjs`, `cmdk-*` |
| `@` picker | S08 / R-C4 — workspace `findFiles`, no index | `context-rules.cjs`, `agent.tsx` at-picker |
| Usage events | S09 / R-A1 — `/api/usage/event`, soft quota | `desktop-account.js`, web usage |
| Packaging/update | S17/S18 | signing secrets optional |

---

## §3 — R-β3 Tab / inline по умолчанию

### Цель продукта

Ghost text (Tab) работает **из коробки** для TS/JS на Pilot, без ручного `Toggle Inline`, с безопасным yield к IntelliSense и измеряемой latency ([product-plan](../product-plan.md) строка «AI-автодополнение»).

### Текущее состояние

- `triplecode.ai.inlineEnabled` **default false** (`package.json`).  
- Провайдеры: Ollama local / OpenAI-compatible BYOK (`inlineProvider`).  
- Yield: `shouldYieldToSuggest` в `inline-logic.cjs` (S10 ✓).  
- Status bar latency — есть.  
- NES / multi-file next-edit — **вне scope** R-β3 (отдельный follow-up после базового Tab).

### Scope (in)

1. Политика default-on:  
   - либо `inlineEnabled: true` в product defaults **только** когда есть рабочий inline backend (Ollama reachable **или** inline API key);  
   - либо first-run soft-prompt: «Включить Tab-подсказки?» с one-click enable + link to settings.  
   Предпочтение: **smart default** — auto-enable если probe OK; иначе off + status «Tab: setup».  
2. Onboarding copy в Welcome / empty Agents: одна строка про Tab + Cmd-K.  
3. Settings UX: group «Inline / Tab» с provider, model, endpoint, enabled.  
4. Telemetry (без кода/промптов): `feature=inline`, outcomes show/accept/dismiss/error + `duration_ms` (уже есть канал usage — расширить outcome set если нужно в web contracts).  
5. QA matrix: IntelliSense conflict, Escape, partial accept если API позволяет, slow provider (>2s) status visible.

### Scope (out)

- Собственная completion-модель TripleCode.  
- NES / jump-to-next-edit.  
- Изменение Monaco/Workbench suggest ranking.

### Acceptance (перенос в S20)

- [ ] На чистом QA profile с Ollama `inlineModel` доступен → ghost text появляется **без** ручного Toggle.  
- [ ] При открытом suggest widget с selected item — inline не предлагает (регресс S10).  
- [ ] Без backend → Tab не спамит ошибки; понятный status / setup path.  
- [ ] Usage: ≥1 accept и ≥1 dismiss/error зафиксированы в кабинете или debug log (redacted).  
- [ ] Ручной QA log в `docs/pilot-qa.md` или `docs/evidence/YYYY-MM-DD/`.

### Code paths

- `extensions/triplecode-mvp/package.json` (defaults)  
- `inline.js`, `inline-logic.cjs` (probe + auto-enable policy)  
- Welcome / agent empty CTA copy  
- `test/s10-inline-cmdk.test.cjs` + новый `test/s20-…` при новой логике  
- contracts: outcome labels если добавите `accepted`/`dismissed` для inline

### Verify

```bash
npm --prefix extensions/triplecode-mvp test
# ручной: QA app, TS файл, Ollama up, Tab ghost + IntelliSense conflict
```

### Handoff notes агенту

- Роль: **Инженер AI**. Scenario: **S20**.  
- Не включать inline hard-on без probe — иначе шум на машинах без Ollama.  
- Не логировать completion text / file paths в usage.

---

## §5 — R-β5 Индекс контекста + `@` search

### Цель продукта

`@` в composer ищет по workspace **быстрее и релевантнее**, чем полный `findFiles` скан; пользователь видит ranked files/symbols; secret paths по-прежнему исключены (S08).

### Текущее состояние

- Candidates: `listAttachCandidates` / `findFiles` в host (S08).  
- Picker UI: loading / empty / no-matches (V1).  
- Нет embeddings / Instant Grep-подобного индекса.

### Scope (in) — phased

**Phase A (обязателен для R-β5):** локальный file index

1. Построить индекс путей (+ optional basename trigram / fuzzy) при open folder + incremental on create/delete/rename.  
2. Query из `@` picker → top N (12–20) с score; debounce 50–100ms.  
3. Fallback: если индекс cold/miss → текущий `findFiles` path.  
4. Exclude: `isSensitivePath`, `.git`, `node_modules`, binary globs (как сейчас + расширить).  
5. Status: «Indexing…» / «Index ready (N files)» в picker footer или Output channel (без путей секретов).

**Phase B (optional follow-up, новый ID если не влезет):** symbol/outline via document symbols API for open editors + cached workspace symbols if cheap; **не** требовать cloud embeddings.

### Scope (out)

- Semantic embeddings / remote index.  
- `/` skills catalog (отдельный сценарий).  
- Browser/git/terminal `@` kinds как у Cursor (можно stub labels «soon»).

### Acceptance (S21)

- [ ] Workspace ≥2k файлов: `@foo` отвечает <150ms p95 после warm index (замерить в QA log).  
- [ ] Cold start: progress «Indexing…»; после ready — результаты.  
- [ ] `*.env` / secret names не появляются в candidates.  
- [ ] Регресс S08 keyboard picker + chips.  
- [ ] Unit tests на rank/exclude/incremental update.

### Code paths (предложение)

- Новый `context-index.cjs` (+ host wiring в `extension.js` / attach path)  
- `context-rules.cjs` — reuse filter/sensitive  
- `webview/agent.tsx` — footer status на at-picker  
- `test/s21-context-index.test.cjs`

### Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

### Handoff notes агенту

- Роль: **Инженер AI** (+ Архитектор если меняете trust bounds). Scenario: **S21**.  
- Индекс только local disk; не отправлять corpus на сервер.  
- ADR не нужен, если остаётесь в extension API.

---

## §6 — R-β6 Закрытый пилот → метрики

### Цель продукта

Перед публичной бетой закрыть **Stage 1 exit**: ≥80% участников пилота завершают import + первую AI-задачу без помощи, медиана ≤15 мин ([product-plan](../product-plan.md)). Зафиксировать знаменатели и отчёт.

### Scope (in)

1. **Pilot protocol** (документ + чеклист): N=6–8 участников; задания одинаковые; фиксация версии app, OS, model, repo, start commit.  
2. **Event schema** (уже usage + расширить):  
   - `pilot_task_id`, `step` (`import`|`first_agent`|`review_keep`|`done`), `outcome`, `duration_ms`  
   - **Запрет:** код, промпты, пути файлов, секреты ([accounts.md](../accounts.md)).  
3. **Cabinet / internal report:** агрегаты по периоду пилота — completion rate, median time, accept/reject patch ratio (уже accepted/rejected).  
4. **Go/No-Go memo:** таблица участников (аноним ID), % success, blockers → решение Продакта на Stage 2.  
5. Опционально: IDE команда «Mark pilot step» для ручной разметки, если авто-детект слаб.

### Scope (out)

- Платный checkout (отдельный gap беты #2).  
- Team org analytics (R-E4).  
- Публичный dashboard для всех юзеров.

### Acceptance (S22)

- [ ] Protocol + template в `docs/pilot/` (или `docs/evidence/pilot-YYYY-MM/`).  
- [ ] ≥6 заполненных run cards **или** явный No-Go с причиной.  
- [ ] Метрики без PII/кода; знаменатели документированы.  
- [ ] Roadmap/product-plan: Stage 1 exit отмечен Pass/Fail датой.

### Code / docs paths

- `triplecode-web` usage + optional pilot tags  
- `docs/pilot/README.md` (создать агентом)  
- `docs/pilot-qa.md` — ссылка на пилот  
- Продакт обновляет `product-plan.md` статус Этапа 1

### Handoff notes агенту

- Роли: **Продакт** ведёт протокол; **Аналитик** — схему/отчёт; **web/AI** — только instrumentation. Scenario: **S22**.  
- Не обещать ≥80% без реальных участников — можно закрыть AC «protocol+tooling ready» и оставить поле «field results» отдельным checkbox.

---

## §7 — R-β7 Live QA матрица публичной беты

### Цель продукта

Ручной/полуавтоматический прогон критичных сценариев на **реальных** артефактах macOS (+ Win/Linux smoke), с логом в репо. Закрывает «кнопка есть ≠ принято».

### Матрица (минимум)

| ID | Сценарий | Платформа | Артефакт | Owner |
| --- | --- | --- | --- | --- |
| L1 | S09 login PKCE E2E | macOS | `TripleCode.app` signed/QA | QA |
| L2 | S02 import real VS Code profile | macOS | QA profile | QA |
| L3 | S05–S07 Review Keep/Drop + Check patch + Undo | macOS | QA app | QA |
| L4 | S10/S20 Tab + Cmd-K + IntelliSense | macOS | Ollama or BYOK | QA |
| L5 | S18 update check + rollback path | macOS (+ Win/Linux if build) | manifest | Релизы+QA |
| L6 | S17 install smoke | Win x64, Linux x64 | zip/appimage/etc | Релизы |
| L7 | S03 Ask no writes + S06 Stop | macOS | stub/BYOK | QA |
| L8 | Agents empty CTA + session rail (S19) | macOS | screenshot → evidence | QA/Design |

### Лог формат

Файл: `docs/evidence/YYYY-MM-DD/live-qa.md` (+ screenshots).

```md
| ID | Result | Build SHA | Notes |
| L1 | PASS/FAIL | abc123 | … |
```

### Acceptance (S23)

- [ ] L1–L4, L7 PASS на macOS одной сборки (SHA в логе).  
- [ ] L5: update dialog states проверены (или явный блокер secrets).  
- [ ] L6: хотя бы install+open на Win **или** Linux (лучше оба).  
- [ ] FAIL → issue/follow-up Scenario, не «закрыть молча».  
- [ ] Ссылка из `pilot-qa.md` / roadmap R-β7.

### Handoff notes агенту

- Роль: **QA-инженер**. Scenario: **S23**.  
- Не править product code без FAIL→bug ticket; допустимы harness/`scripts/` для smoke.  
- Computer Use / TCC: при блоке — ручной capture как в `docs/evidence/2026-11-25/`.

---

## §UI — План паритета UI (для агентов)

SoT языка: [competitive-visual-parity.md](../competitive-visual-parity.md) · evidence [2026-11-25](../evidence/2026-11-25/).  
V1–V4 закрыты. Ниже **остаток до «привычно как Cursor sidepane / Devin ACC»** без Agents Window shell.

### Roadmap UI IDs

| ID | Outcome | Scenario | Priority |
| --- | --- | --- | --- |
| **R-V5** | Ghost Tab + Cmd-K peek visual polish (aligned with R-β3) | S19 / S20 | P1 beta |
| **R-V6** | `@` picker ranked results + index status (with R-β5) | S19 / S21 | P1 |
| **R-V7** | Editable queue chip + OS notify opt-in | S19 | P2 |
| **R-V8** | TripleCode side-by-side evidence + gallery sync | evidence / DS | P2 |

### Принципы реализации UI

1. IDE-first (ADR 0004): Agents = secondary side bar webview; не новое окно.  
2. Копируем **язык** (mode pill, changes strip, session rail, Build) — не бренд Cursor/Devin.  
3. Wedge Check patch остаётся заметнее конкурента.  
4. Токены: `design system rules/` + `media/workbench.css`; галерея Storybook не расходится.  
5. a11y: keyboard paths из S19/V1 обязательны при любых правках composer.

### План работ по UI (порядок)

1. **R-V5** вместе с R-β3: status «Tab» latency chip; Cmd-K peek panel density как у Cursor selection edit (без клона).  
2. **R-V6** вместе с R-β5: at-picker footer Indexing/Ready; ranked rows (path + score hint muted).  
3. **R-V7:** queue chip editable (click → edit draft / cancel); optional `Notification` API when agent waiting (setting off by default).  
4. **R-V8:** 2–3 PNG TripleCode Agents (empty, review+changes strip, session rail) в `docs/evidence/…`; обновить README evidence.

### DoD UI-агента

- Scenario AC + screenshot before/after в evidence **или** Storybook story.  
- `npm run build:webview`.  
- Не патчить `workbench.desktop.main.js` из extension-задачи.

### Запрещено в UI-задачах

- Отдельный Agents Window / Monaco-only shell.  
- Фиолетовые/glow «AI defaults»; следовать существующим токенам.  
- Обещать Cloud continue как работающий runtime (только UI states).

---

## Вне scope этого handoff (напоминание)

| Gap беты | Почему не здесь |
| --- | --- |
| #1 Signed update 3 OS | Wave D / S18 — Релизы + secrets |
| #2 Hosted checkout | web billing — отдельный epic |
| #4 Plugin matrix Win/Linux | extensions-pilot-matrix + Релизы |
| R-E2 cloud VM | Stage 3 |

---

## Links

- [roadmap.md](../roadmap.md) · [product-plan.md](../product-plan.md) · [strategy.md](../strategy.md)  
- [competitive-visual-parity.md](../competitive-visual-parity.md) · [accounts.md](../accounts.md)  
- Extension: [extensions/triplecode-mvp/AGENTS.md](../../extensions/triplecode-mvp/AGENTS.md)  
- Web contracts: `../triplecode-web/packages/contracts/README.md`
