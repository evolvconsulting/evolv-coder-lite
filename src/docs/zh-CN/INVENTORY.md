# eCL 已发布功能清单

> 所有已发布 eCL 功能面的权威目录：命令、代理、工作流、参考资料、CLI 模块和钩子。当广义文档（AGENTS.md、COMMANDS.md、ARCHITECTURE.md、CLI-TOOLS.md）与文件系统不一致时，以本文件及代码库目录树为准。

## 使用说明

- 本文件中的数量基于 v1.36.0 快照，版本之间可能存在偏差。如需实时数量，请在检出目录中运行 `ls commands/ecl/*.md | wc -l`、`ls agents/ecl-*.md | wc -l` 等命令。
- 本文件列举了所有六大类别（代理、命令、工作流、参考资料、CLI 模块、钩子）中的每个已发布功能面。广义文档可能呈现叙述性内容或精选子集；当其与文件系统不一致时，本文件及目录清单为准。
- v1.36.0 之后新增的功能面应首先在此处记录，再传播到广义文档中。`tests/inventory-counts.test.cjs`、`tests/commands-doc-parity.test.cjs`、`tests/agents-doc-parity.test.cjs`、`tests/cli-modules-doc-parity.test.cjs`、`tests/hooks-doc-parity.test.cjs`、`tests/architecture-counts.test.cjs` 和 `tests/command-count-sync.test.cjs` 中的漂移控制测试将数量和清单内容锚定到文件系统。

这是所有已发布 eCL Core 功能面的权威目录。请参阅 [文档索引](README.md) 按主题导航。

---

## 代理 (33 shipped)

完整清单位于 `agents/ecl-*.md`。"主要文档"列标注了 [`docs/AGENTS.md`](../AGENTS.md) 是否提供完整角色卡（*primary*）、"高级与专项代理"章节中的简短存根（*advanced stub*），或未覆盖（*inventory only*）。

| 代理 | 角色（一行描述） | 由谁启动 | 主要文档 |
|------|----------------|----------|----------|
| ecl-project-researcher | 在路线图创建前研究领域生态系统（技术栈、功能、架构、潜在问题）。 | `/ecl-new-project`、`/ecl-new-milestone` | primary |
| ecl-phase-researcher | 在规划前研究特定阶段的实施方案。 | `/ecl-plan-phase` | primary |
| ecl-ui-researcher | 为前端阶段生成 UI 设计契约。 | `/ecl-ui-phase` | primary |
| ecl-assumptions-analyzer | 为 discuss-phase（假设模式）生成有证据支撑的假设。 | `discuss-phase-assumptions` 工作流 | primary |
| ecl-advisor-researcher | 在 discuss-phase 顾问模式下研究单个灰色地带决策。 | `discuss-phase` 工作流（顾问模式） | primary |
| ecl-research-synthesizer | 将并行研究者的输出整合为统一的 SUMMARY.md。 | `/ecl-new-project` | primary |
| ecl-planner | 创建可执行的阶段计划，包含任务分解和目标反向验证。 | `/ecl-plan-phase`、`/ecl-quick` | primary |
| ecl-roadmapper | 创建包含阶段分解和需求映射的项目路线图。 | `/ecl-new-project` | primary |
| ecl-executor | 以原子提交和偏差处理方式执行 eCL 计划。 | `/ecl-execute-phase`、`/ecl-quick` | primary |
| ecl-plan-checker | 验证计划是否能实现阶段目标（8 个验证维度）。 | `/ecl-plan-phase`（验证循环） | primary |
| ecl-integration-checker | 验证跨阶段集成和端到端流程。 | `/ecl-audit-milestone` | primary |
| ecl-ui-checker | 根据质量维度验证 UI-SPEC.md 设计契约。 | `/ecl-ui-phase`（验证循环） | primary |
| ecl-verifier | 通过目标反向分析验证阶段目标的达成情况。 | `/ecl-execute-phase` | primary |
| ecl-nyquist-auditor | 通过生成测试填补奈奎斯特验证空缺。 | `/ecl-validate-phase` | primary |
| ecl-ui-auditor | 对已实现前端代码进行六柱回溯视觉审计。 | `/ecl-ui-review` | primary |
| ecl-codebase-mapper | 探索代码库并撰写结构化分析文档。 | `/ecl-map-codebase` | primary |
| ecl-debugger | 使用科学方法和持久状态调查缺陷。 | `/ecl-debug`、`/ecl-verify-work` | primary |
| ecl-user-profiler | 从 8 个维度评分开发者行为。 | `/ecl-profile-user` | primary |
| ecl-doc-writer | 撰写并更新项目文档。 | `/ecl-docs-update` | primary |
| ecl-doc-verifier | 验证生成文档中的事实声明。 | `/ecl-docs-update` | primary |
| ecl-security-auditor | 验证 PLAN.md 威胁模型中的威胁缓解措施。 | `/ecl-secure-phase` | primary |
| ecl-pattern-mapper | 将新文件映射到最近似的已有类似文件；为规划者撰写 PATTERNS.md。 | `/ecl-plan-phase`（在研究与规划之间） | advanced stub |
| ecl-debug-session-manager | 在隔离上下文中运行完整的 `/ecl-debug` 检查点和续传循环，保持主上下文精简。 | `/ecl-debug` | advanced stub |
| ecl-code-reviewer | 审查源文件中的缺陷、安全问题和代码质量问题；生成 REVIEW.md。 | `/ecl-code-review` | advanced stub |
| ecl-code-fixer | 以每次修复原子提交的方式应用 REVIEW.md 中的修复；生成 REVIEW-FIX.md。 | `/ecl-code-review --fix` | advanced stub |
| ecl-ai-researcher | 将所选 AI 框架的官方文档研究成可实施的指导（AI-SPEC.md §3–§4b）。 | `/ecl-ai-integration-phase` | advanced stub |
| ecl-domain-researcher | 为 AI 系统提供领域专家评估标准和失效模式（AI-SPEC.md §1b）。 | `/ecl-ai-integration-phase` | advanced stub |
| ecl-eval-planner | 为 AI 阶段设计结构化评估策略（AI-SPEC.md §5–§7）。 | `/ecl-ai-integration-phase` | advanced stub |
| ecl-eval-auditor | 对 AI 阶段评估覆盖率进行回溯审计；生成 EVAL-REVIEW.md（COVERED/PARTIAL/MISSING）。 | `/ecl-eval-review` | advanced stub |
| ecl-framework-selector | ≤6 个问题的交互式决策矩阵，为 AI/LLM 框架评分并给出推荐。 | `/ecl-ai-integration-phase` | advanced stub |
| ecl-intel-updater | 撰写结构化 intel 文件（`.planning/intel/*.json`），用作可查询的代码库知识库。 | `/ecl-map-codebase --query` | advanced stub |
| ecl-doc-classifier | 将单个规划文档分类为 ADR、PRD、SPEC、DOC 或 UNKNOWN；并行生成以处理文档语料库。 | `/ecl-ingest-docs` | advanced stub |
| ecl-doc-synthesizer | 将已分类的规划文档综合为一个统一上下文，具有优先级规则、循环检测和三桶冲突报告。 | `/ecl-ingest-docs` | advanced stub |

**覆盖说明。** `docs/AGENTS.md` 为 21 个主要代理提供了完整角色卡，并为 12 个高级代理提供了简洁存根。该文件中的代理工具权限摘要仅涵盖主要的 21 个代理；高级代理的工具列表记录在 `agents/ecl-*.md` 中各代理的 frontmatter 里。

---

## 命令 (67 shipped)

完整清单位于 `commands/ecl/*.md`。以下分组与 `docs/COMMANDS.md` 的章节顺序一致；每行包含命令名称、从命令 frontmatter `description:` 派生的一行角色描述，以及源文件链接。`tests/command-count-sync.test.cjs` 将数量锁定到文件系统。

### 命名空间元技能

以下六个路由器是仅包含描述符的条目，模型优先选择这些条目；每个条目的主体包含一个路由表，指向正确的具体子技能。它们的存在是为了在完整功能面仍可访问的情况下降低急切技能列举的令牌成本。请参阅 [#2792](https://github.com/evolvconsulting/evolv-coder-lite/issues/2792) 了解原因；路由表指向 [#2790](https://github.com/evolvconsulting/evolv-coder-lite/issues/2790) 合并后的功能面。

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-workflow` | 阶段流水线路由器 — 讨论 / 规划 / 执行 / 验证 / 阶段 / 进度。 | [commands/ecl/ns-workflow.md](../../commands/ecl/ns-workflow.md) |
| `/ecl-project` | 项目生命周期路由器 — 里程碑、审计、摘要。 | [commands/ecl/ns-project.md](../../commands/ecl/ns-project.md) |
| `/ecl-quality` | 质量关卡路由器 — 代码审查、调试、审计、安全、评估、UI。 | [commands/ecl/ns-review.md](../../commands/ecl/ns-review.md) |
| `/ecl-context` | 代码库智能路由器 — 映射、图形化、文档、学习。 | [commands/ecl/ns-context.md](../../commands/ecl/ns-context.md) |
| `/ecl-manage` | 管理路由器 — 配置、工作区、工作流、线程、更新、发布、收件箱。 | [commands/ecl/ns-manage.md](../../commands/ecl/ns-manage.md) |
| `/ecl-ideate` | 探索与捕获路由器 — 探索、草图、尖峰、规格、捕获。 | [commands/ecl/ns-ideate.md](../../commands/ecl/ns-ideate.md) |

### 核心工作流

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-new-project` | 通过深度上下文收集和 PROJECT.md 初始化新项目。 | [commands/ecl/new-project.md](../../commands/ecl/new-project.md) |
| `/ecl-workspace` | 管理 eCL 工作区 — 创建（`--new`）、列出（`--list`）或移除（`--remove`）隔离的工作区环境。 | [commands/ecl/workspace.md](../../commands/ecl/workspace.md) |
| `/ecl-discuss-phase` | 在规划前通过自适应提问收集阶段上下文。 | [commands/ecl/discuss-phase.md](../../commands/ecl/discuss-phase.md) |
| `/ecl-mvp-phase` | 将阶段规划为垂直 MVP 切片 — 用户故事、SPIDR 拆分，然后进行阶段规划。 | [commands/ecl/mvp-phase.md](../../commands/ecl/mvp-phase.md) |
| `/ecl-spec-phase` | 苏格拉底式规格细化，生成包含可证伪需求的 SPEC.md。 | [commands/ecl/spec-phase.md](../../commands/ecl/spec-phase.md) |
| `/ecl-ui-phase` | 为前端阶段生成 UI 设计契约（UI-SPEC.md）。 | [commands/ecl/ui-phase.md](../../commands/ecl/ui-phase.md) |
| `/ecl-ai-integration-phase` | 通过框架选择、研究和评估规划生成 AI 设计契约（AI-SPEC.md）。 | [commands/ecl/ai-integration-phase.md](../../commands/ecl/ai-integration-phase.md) |
| `/ecl-plan-phase` | 创建带有验证循环的详细阶段计划（PLAN.md）。 | [commands/ecl/plan-phase.md](../../commands/ecl/plan-phase.md) |
| `/ecl-plan-review-convergence` | 跨 AI 计划收敛循环 — 根据审查反馈重新规划，直到没有 HIGH 级别问题为止（最多 3 个循环）。 | [commands/ecl/plan-review-convergence.md](../../commands/ecl/plan-review-convergence.md) |
| `/ecl-ultraplan-phase` | [BETA] 将计划阶段卸载到 Claude Code 的 ultraplan 云端 — 远程起草，在浏览器中审查，通过 `/ecl-import` 导入回来。仅限 Claude Code。 | [commands/ecl/ultraplan-phase.md](../../commands/ecl/ultraplan-phase.md) |
| `/ecl-spike` | 通过一次性实验快速验证想法；使用 `--wrap-up` 将发现打包为持久技能。 | [commands/ecl/spike.md](../../commands/ecl/spike.md) |
| `/ecl-sketch` | 使用一次性 HTML 原型快速勾画 UI/设计想法；使用 `--wrap-up` 打包发现。 | [commands/ecl/sketch.md](../../commands/ecl/sketch.md) |
| `/ecl-execute-phase` | 使用基于波次的并行化执行阶段中的所有计划。 | [commands/ecl/execute-phase.md](../../commands/ecl/execute-phase.md) |
| `/ecl-verify-work` | 通过自动诊断的对话式 UAT 验证已构建的功能。 | [commands/ecl/verify-work.md](../../commands/ecl/verify-work.md) |
| `/ecl-ship` | 验证后创建 PR、运行审查并准备合并。 | [commands/ecl/ship.md](../../commands/ecl/ship.md) |
| `/ecl-fast` | 内联执行简单任务 — 无子代理、无规划开销。 | [commands/ecl/fast.md](../../commands/ecl/fast.md) |
| `/ecl-quick` | 以 eCL 保证（原子提交、状态跟踪）执行快速任务，但跳过可选代理。 | [commands/ecl/quick.md](../../commands/ecl/quick.md) |
| `/ecl-ui-review` | 对已实现前端代码进行六柱回溯视觉审计。 | [commands/ecl/ui-review.md](../../commands/ecl/ui-review.md) |
| `/ecl-code-review` | 审查阶段中更改的源文件中的缺陷、安全问题和代码质量问题；使用 `--fix` 自动应用发现。 | [commands/ecl/code-review.md](../../commands/ecl/code-review.md) |
| `/ecl-eval-review` | 回溯审计已执行 AI 阶段的评估覆盖率；生成 EVAL-REVIEW.md。 | [commands/ecl/eval-review.md](../../commands/ecl/eval-review.md) |

### 阶段与里程碑管理

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-phase` | 阶段的增删改查 — 在 ROADMAP.md 中添加（默认）、插入（`--insert`）、移除（`--remove`）或编辑（`--edit`）阶段。 | [commands/ecl/phase.md](../../commands/ecl/phase.md) |
| `/ecl-add-tests` | 根据 UAT 标准和实现，为已完成阶段生成测试。 | [commands/ecl/add-tests.md](../../commands/ecl/add-tests.md) |
| `/ecl-validate-phase` | 回溯审计并填补已完成阶段的奈奎斯特验证空缺。 | [commands/ecl/validate-phase.md](../../commands/ecl/validate-phase.md) |
| `/ecl-secure-phase` | 回溯验证已完成阶段的威胁缓解措施。 | [commands/ecl/secure-phase.md](../../commands/ecl/secure-phase.md) |
| `/ecl-audit-milestone` | 在归档前根据原始意图审计里程碑完成情况。 | [commands/ecl/audit-milestone.md](../../commands/ecl/audit-milestone.md) |
| `/ecl-audit-uat` | 跨阶段审计所有待处理的 UAT 和验证项目。 | [commands/ecl/audit-uat.md](../../commands/ecl/audit-uat.md) |
| `/ecl-audit-fix` | 自主审计到修复流水线 — 查找问题、分类、修复、测试、提交。 | [commands/ecl/audit-fix.md](../../commands/ecl/audit-fix.md) |
| `/ecl-complete-milestone` | 归档已完成的里程碑并为下一个版本做准备。 | [commands/ecl/complete-milestone.md](../../commands/ecl/complete-milestone.md) |
| `/ecl-new-milestone` | 启动新的里程碑周期 — 更新 PROJECT.md 并路由到需求。 | [commands/ecl/new-milestone.md](../../commands/ecl/new-milestone.md) |
| `/ecl-milestone-summary` | 从里程碑产物生成全面的项目摘要。 | [commands/ecl/milestone-summary.md](../../commands/ecl/milestone-summary.md) |
| `/ecl-cleanup` | 归档已完成里程碑中积累的阶段目录。 | [commands/ecl/cleanup.md](../../commands/ecl/cleanup.md) |
| `/ecl-manager` | 用于从单个终端管理多个阶段的交互式指挥中心。 | [commands/ecl/manager.md](../../commands/ecl/manager.md) |
| `/ecl-workstreams` | 管理并行工作流 — 列出、创建、切换、状态、进度、完成、恢复。 | [commands/ecl/workstreams.md](../../commands/ecl/workstreams.md) |
| `/ecl-autonomous` | 自主运行所有剩余阶段 — 每个阶段依次讨论 → 规划 → 执行。 | [commands/ecl/autonomous.md](../../commands/ecl/autonomous.md) |
| `/ecl-undo` | 安全的 git 回退 — 使用阶段清单回滚阶段或计划提交。 | [commands/ecl/undo.md](../../commands/ecl/undo.md) |

### 会话与导航

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-progress` | 检查项目进度、显示上下文并路由到下一个操作；使用 `--next` 自动推进或使用 `--do` 运行自由格式任务。 | [commands/ecl/progress.md](../../commands/ecl/progress.md) |
| `/ecl-capture` | 捕获想法、任务、笔记和种子 — todo（默认）、`--note`、`--backlog`、`--seed` 或 `--list` 待处理 todo。 | [commands/ecl/capture.md](../../commands/ecl/capture.md) |
| `/ecl-stats` | 显示项目统计信息 — 阶段、计划、需求、git 指标、时间线。 | [commands/ecl/stats.md](../../commands/ecl/stats.md) |
| `/ecl-pause-work` | 在阶段中途暂停工作时创建上下文交接。 | [commands/ecl/pause-work.md](../../commands/ecl/pause-work.md) |
| `/ecl-resume-work` | 从上一个会话恢复工作并完整还原上下文。 | [commands/ecl/resume-work.md](../../commands/ecl/resume-work.md) |
| `/ecl-explore` | 苏格拉底式构思和想法路由 — 在承诺之前思考想法。 | [commands/ecl/explore.md](../../commands/ecl/explore.md) |
| `/ecl-review-backlog` | 审查并将待办事项提升到活跃里程碑。 | [commands/ecl/review-backlog.md](../../commands/ecl/review-backlog.md) |
| `/ecl-thread` | 管理用于跨会话工作的持久上下文线程。 | [commands/ecl/thread.md](../../commands/ecl/thread.md) |

### 代码库智能

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-map-codebase` | 使用并行映射代理分析代码库；使用 `--fast` 进行轻量级扫描或使用 `--query` 进行 intel 查询。 | [commands/ecl/map-codebase.md](../../commands/ecl/map-codebase.md) |
| `/ecl-graphify` | 在 `.planning/graphs/` 中构建、查询和检查项目知识图谱。 | [commands/ecl/graphify.md](../../commands/ecl/graphify.md) |
| `/ecl-extract-learnings` | 从已完成阶段产物中提取决策、经验、模式和意外发现。 | [commands/ecl/extract-learnings.md](../../commands/ecl/extract-learnings.md) |

### 审查、调试与恢复

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-review` | 通过外部 AI CLI 请求跨 AI 同行审查阶段计划。 | [commands/ecl/review.md](../../commands/ecl/review.md) |
| `/ecl-debug` | 在上下文重置时进行跨会话持久状态的系统化调试。 | [commands/ecl/debug.md](../../commands/ecl/debug.md) |
| `/ecl-forensics` | 针对失败 eCL 工作流的事后调查 — 分析 git、产物、状态。 | [commands/ecl/forensics.md](../../commands/ecl/forensics.md) |
| `/ecl-health` | 诊断规划目录健康状态并可选择修复问题。 | [commands/ecl/health.md](../../commands/ecl/health.md) |
| `/ecl-import` | 摄取外部计划，并与项目决策进行冲突检测。 | [commands/ecl/import.md](../../commands/ecl/import.md) |
| `/ecl-inbox` | 根据项目模板分类审查所有未处理的 GitHub 问题和 PR。 | [commands/ecl/inbox.md](../../commands/ecl/inbox.md) |

### 文档、用户档案与实用工具

| 命令 | 角色 | 源文件 |
|------|------|--------|
| `/ecl-docs-update` | 生成或更新经代码库验证的项目文档。 | [commands/ecl/docs-update.md](../../commands/ecl/docs-update.md) |
| `/ecl-ingest-docs` | 扫描仓库中混合的 ADR/PRD/SPEC/DOC 文档，通过分类、综合和冲突报告引导或合并到完整的 `.planning/` 设置中。 | [commands/ecl/ingest-docs.md](../../commands/ecl/ingest-docs.md) |
| `/ecl-profile-user` | 生成开发者行为档案和 Claude 可发现的产物。 | [commands/ecl/profile-user.md](../../commands/ecl/profile-user.md) |
| `/ecl-settings` | 配置 eCL 工作流开关和模型档案。 | [commands/ecl/settings.md](../../commands/ecl/settings.md) |
| `/ecl-config` | 配置 eCL 设置 — 工作流开关（默认）、高级旋钮（`--advanced`）、集成（`--integrations`）或模型档案（`--profile`）。 | [commands/ecl/config.md](../../commands/ecl/config.md) |
| `/ecl-pr-branch` | 通过过滤掉 `.planning/` 提交来创建干净的 PR 分支。 | [commands/ecl/pr-branch.md](../../commands/ecl/pr-branch.md) |
| `/ecl-surface` | 切换哪些技能被呈现 — 应用配置文件、列出或禁用集群而无需重新安装。 | [commands/ecl/surface.md](../../commands/ecl/surface.md) |
| `/ecl-update` | 将 eCL 更新到最新版本；使用 `--sync` 跨运行时同步技能或使用 `--reapply` 重新应用本地补丁。 | [commands/ecl/update.md](../../commands/ecl/update.md) |
| `/ecl-help` | 显示可用的 eCL 命令和使用指南。 | [commands/ecl/help.md](../../commands/ecl/help.md) |

---

## 工作流 (88 shipped)

完整清单位于 `evolv-coder-lite/workflows/*.md`。工作流是命令在内部引用的轻量编排器；大多数不由最终用户直接阅读。以下行将每个工作流文件映射到其角色（来源于 `<purpose>` 块），以及在适用情况下映射到调用它的命令。

| 工作流 | 角色 | 调用者 |
|--------|------|--------|
| `add-backlog.md` | 使用 999.x 编号将待办事项添加到 ROADMAP.md。 | `/ecl-capture --backlog` |
| `add-phase.md` | 在路线图中当前里程碑的末尾添加新的整数阶段。 | `/ecl-phase`（默认） |
| `add-tests.md` | 根据已完成阶段的产物生成单元测试和 E2E 测试。 | `/ecl-add-tests` |
| `add-todo.md` | 将会话中出现的想法或任务捕获为结构化 todo。 | `/ecl-capture`（默认） |
| `ai-integration-phase.md` | 将框架选择 → AI 研究 → 领域研究 → 评估规划编排为 AI-SPEC.md。 | `/ecl-ai-integration-phase` |
| `analyze-dependencies.md` | 分析 ROADMAP.md 阶段的文件重叠和语义依赖；建议 `Depends on` 边。 | `/ecl-manager --analyze-deps` |
| `audit-fix.md` | 自主审计到修复流水线 — 运行审计、解析、分类、修复、测试、提交。 | `/ecl-audit-fix` |
| `audit-milestone.md` | 通过聚合阶段验证来验证里程碑是否满足完成定义。 | `/ecl-audit-milestone` |
| `audit-uat.md` | 跨阶段审计 UAT 和验证文件；生成优先排序的待处理事项列表。 | `/ecl-audit-uat` |
| `autonomous.md` | 自主驱动里程碑阶段 — 所有剩余阶段、一个范围或单个阶段。 | `/ecl-autonomous` |
| `check-todos.md` | 列出待处理 todo，允许选择，加载上下文，并路由到适当的操作。 | `/ecl-capture --list` |
| `cleanup.md` | 归档已完成里程碑中积累的阶段目录。 | `/ecl-cleanup` |
| `code-review-fix.md` | 通过 ecl-code-fixer 以每次修复原子提交的方式自动修复 REVIEW.md 中的问题。 | `/ecl-code-review --fix` |
| `code-review.md` | 通过 ecl-code-reviewer 审查阶段源码变更；生成 REVIEW.md。 | `/ecl-code-review` |
| `complete-milestone.md` | 将已发布版本标记为完成 — MILESTONES.md 条目、PROJECT.md 演进、标签。 | `/ecl-complete-milestone` |
| `diagnose-issues.md` | 编排并行调试代理以调查 UAT 差距并找出根本原因。 | `/ecl-verify-work`（自动诊断） |
| `discovery-phase.md` | 以适当的深度级别执行发现。 | `/ecl-new-project`（发现路径） |
| `discuss-phase-assumptions.md` | 假设模式讨论 — 通过以代码库为先的分析提取实施决策。 | `/ecl-discuss-phase`（当 `discuss_mode=assumptions` 时） |
| `discuss-phase-power.md` | 高级用户讨论 — 将所有问题预生成到 JSON 状态文件和 HTML UI 中。 | `/ecl-discuss-phase --power` |
| `discuss-phase.md` | 通过迭代灰色地带讨论提取实施决策。 | `/ecl-discuss-phase` |
| `mvp-phase.md` | 将阶段规划为垂直 MVP 切片 — 用户故事、SPIDR 拆分，然后进行阶段规划。 | `/ecl-mvp-phase` |
| `do.md` | 将用户的自由格式文本路由到最匹配的 eCL 命令。 | `/ecl-progress --do` |
| `docs-update.md` | 生成、更新和验证规范的和手写的项目文档。 | `/ecl-docs-update` |
| `edit-phase.md` | 就地编辑 ROADMAP.md 中现有阶段的任何字段，保留编号和位置。 | `/ecl-phase --edit` |
| `eval-review.md` | 对已实现 AI 阶段的评估覆盖率进行回溯审计。 | `/ecl-eval-review` |
| `execute-phase.md` | 使用基于波次的并行执行方式执行阶段中的所有计划。 | `/ecl-execute-phase` |
| `execute-plan.md` | 执行阶段提示（PLAN.md）并创建结果摘要（SUMMARY.md）。 | `execute-phase.md`（每个计划的子代理） |
| `explore.md` | 苏格拉底式构思 — 通过探究性问题引导开发者。 | `/ecl-explore` |
| `debug.md` | 系统化调试 — 子命令路由、会话创建、委托给 ecl-debug-session-manager。 | `/ecl-debug` |
| `extract-learnings.md` | 从已完成阶段产物中提取决策、经验、模式和意外发现。 | `/ecl-extract-learnings` |
| `fast.md` | 内联执行简单任务，无子代理开销。 | `/ecl-fast` |
| `forensics.md` | 针对失败工作流的取证调查 — git、产物和状态分析。 | `/ecl-forensics` |
| `graduation.md` | 跨阶段聚类 LEARNINGS.md 中的重复项，并显示 HITL 提升候选项。 | `transition.md`（graduation_scan 步骤） |
| `health.md` | 验证 `.planning/` 目录完整性并报告可操作问题。 | `/ecl-health` |
| `help.md` | 显示完整的 eCL Core 命令参考。 | `/ecl-help` |
| `import.md` | 摄取外部计划，并与现有项目决策进行冲突检测。 | `/ecl-import` |
| `inbox.md` | 根据项目贡献模板分类未处理的 GitHub 问题和 PR。 | `/ecl-inbox` |
| `ingest-docs.md` | 扫描仓库中混合的规划文档；分类、综合，并通过冲突报告引导或合并到 `.planning/` 中。 | `/ecl-ingest-docs` |
| `insert-phase.md` | 为里程碑中途发现的紧急工作插入十进制阶段。 | `/ecl-phase --insert` |
| `list-phase-assumptions.md` | 在规划前显示 Claude 对某个阶段的假设。 | `/ecl-discuss-phase --assumptions` |
| `list-workspaces.md` | 列出在 `~/ecl-workspaces/` 中找到的所有 eCL 工作区及其状态。 | `/ecl-workspace --list` |
| `manager.md` | 交互式里程碑指挥中心 — 仪表板、内联讨论、后台规划/执行。 | `/ecl-manager` |
| `map-codebase.md` | 编排并行代码库映射代理以生成 `.planning/codebase/` 文档。 | `/ecl-map-codebase` |
| `milestone-summary.md` | 里程碑摘要综合 — 从里程碑产物生成的入职和审查产物。 | `/ecl-milestone-summary` |
| `new-milestone.md` | 启动新里程碑周期 — 加载项目上下文、收集目标、更新 PROJECT.md/STATE.md。 | `/ecl-new-milestone` |
| `new-project.md` | 统一的新项目流程 — 提问、研究（可选）、需求、路线图。 | `/ecl-new-project` |
| `new-workspace.md` | 创建带有仓库 worktree/克隆和独立 `.planning/` 的隔离工作区。 | `/ecl-workspace --new` |
| `next.md` | 检测当前项目状态并自动推进到下一个逻辑步骤。 | `/ecl-progress --next` |
| `node-repair.md` | 用于失败任务验证的自主修复算子；由 `execute-plan` 调用。 | `execute-plan.md`（恢复） |
| `note.md` | 零摩擦想法捕获 — 一次 Write 调用，一行确认。 | `/ecl-capture --note` |
| `pause-work.md` | 创建结构化的 `.planning/HANDOFF.json` 和 `.continue-here.md` 交接文件。 | `/ecl-pause-work` |
| `plan-phase.md` | 创建包含集成研究和验证循环的可执行 PLAN.md 文件。 | `/ecl-plan-phase`、`/ecl-quick` |
| `plan-review-convergence.md` | 跨 AI 计划收敛循环 — 根据审查反馈重新规划，直到没有 HIGH 级别问题为止。 | `/ecl-plan-review-convergence` |
| `plant-seed.md` | 将前瞻性想法捕获为带有触发条件的结构化种子文件。 | `/ecl-capture --seed` |
| `pr-branch.md` | 通过过滤 `.planning/` 提交为 PR 创建干净的分支。 | `/ecl-pr-branch` |
| `profile-user.md` | 编排完整的开发者档案流程 — 同意、会话扫描、档案生成。 | `/ecl-profile-user` |
| `progress.md` | 进度渲染 — 项目上下文、位置和下一步操作路由。 | `/ecl-progress` |
| `quick.md` | 以 eCL 保证（原子提交、状态跟踪）快速执行任务。 | `/ecl-quick` |
| `reapply-patches.md` | eCL 更新后重新应用本地修改。 | `/ecl-update --reapply` |
| `remove-phase.md` | 从路线图中移除未来的阶段并重新编号后续阶段。 | `/ecl-phase --remove` |
| `remove-workspace.md` | 移除 eCL 工作区并清理 worktree。 | `/ecl-workspace --remove` |
| `resume-project.md` | 恢复工作 — 从 STATE.md、HANDOFF.json 和产物中完整还原上下文。 | `/ecl-resume-work` |
| `review.md` | 通过外部 CLI 进行跨 AI 计划审查；生成 REVIEWS.md。 | `/ecl-review` |
| `scan.md` | 快速单焦点代码库扫描 — map-codebase 的轻量替代方案。 | `/ecl-map-codebase --fast` |
| `secure-phase.md` | 对已完成阶段进行回溯威胁缓解审计。 | `/ecl-secure-phase` |
| `session-report.md` | 会话报告 — 令牌使用情况、工作摘要、成果。 | `/ecl-pause-work --report` |
| `settings.md` | 配置 eCL 工作流开关和模型档案。 | `/ecl-settings`、`/ecl-config --profile` |
| `settings-advanced.md` | 配置 eCL 高级用户旋钮 — 计划回弹、超时、分支模板、跨 AI 执行、运行时旋钮。 | `/ecl-config --advanced` |
| `settings-integrations.md` | 配置第三方 API 密钥（Brave/Firecrawl/Exa）、`review.models.<cli>` CLI 路由和带掩码（`****<last-4>`）显示的 `agent_skills.<agent-type>` 注入。 | `/ecl-config --integrations` |
| `ship.md` | 验证后创建 PR、运行审查并准备合并。 | `/ecl-ship` |
| `sketch.md` | 通过一次性 HTML 原型（每次草图 2-3 个变体）探索设计方向。 | `/ecl-sketch` |
| `sketch-wrap-up.md` | 整理草图发现并将其打包为持久的 `sketch-findings-[project]` 技能。 | `/ecl-sketch --wrap-up` |
| `spec-phase.md` | 带歧义评分的苏格拉底式规格细化；生成 SPEC.md。 | `/ecl-spec-phase` |
| `spike.md` | 通过聚焦的一次性实验进行快速可行性验证。 | `/ecl-spike` |
| `spike-wrap-up.md` | 整理尖峰发现并将其打包为持久的 `spike-findings-[project]` 技能。 | `/ecl-spike --wrap-up` |
| `stats.md` | 项目统计信息渲染 — 阶段、计划、需求、git 指标。 | `/ecl-stats` |
| `sync-skills.md` | 跨运行时 eCL 技能同步 — 跨运行时根目录差异并应用 `ecl-*` 技能目录。 | `/ecl-update --sync` |
| `transition.md` | 阶段边界过渡工作流 — 工作流检查、状态推进。 | `execute-phase.md`、`/ecl-progress --next` |
| `ui-phase.md` | 通过 ecl-ui-researcher 生成 UI-SPEC.md 设计契约。 | `/ecl-ui-phase` |
| `ui-review.md` | 通过 ecl-ui-auditor 进行六柱回溯视觉审计。 | `/ecl-ui-review` |
| `ultraplan-phase.md` | [BETA] 将规划卸载到 Claude Code 的 ultraplan 云端；远程起草并通过 `/ecl-import` 导入回来。 | `/ecl-ultraplan-phase` |
| `undo.md` | 安全的 git 回退 — 使用阶段清单回滚阶段或计划提交。 | `/ecl-undo` |
| `thread.md` | 为跨会话工作创建、列出、关闭或恢复持久上下文线程。 | `/ecl-thread` |
| `update.md` | 将 eCL 更新到最新版本并显示变更日志。 | `/ecl-update` |
| `validate-phase.md` | 回溯审计并填补已完成阶段的奈奎斯特验证空缺。 | `/ecl-validate-phase` |
| `verify-phase.md` | 通过目标反向分析验证阶段目标的达成情况。 | `execute-phase.md`（执行后） |
| `verify-work.md` | 带自动诊断的对话式 UAT — 生成 UAT.md 和修复计划。 | `/ecl-verify-work` |

> **注意：** 某些工作流没有直接面向用户的命令（例如 `execute-plan.md`、`verify-phase.md`、`transition.md`、`node-repair.md`、`diagnose-issues.md`）— 它们由编排器工作流在内部调用。`discovery-phase.md` 是 `/ecl-new-project` 的备用入口。

---

## 参考资料 (62 shipped)

完整清单位于 `evolv-coder-lite/references/*.md`。参考资料是工作流和代理 `@-reference` 的共享知识文档。以下分组与 [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#references-evolv-coder-litereferencesmd) 一致 — 核心、工作流、思维模型集群和模块化规划器分解。

### 核心参考资料

| 参考资料 | 角色 |
|----------|------|
| `checkpoints.md` | 检查点类型定义和交互模式。 |
| `gates.md` | 4 种规范关卡类型（Confirm、Quality、Safety、Transition），已连接到 plan-checker 和 verifier。 |
| `model-profiles.md` | 每个代理的模型层级分配。 |
| `model-profile-resolution.md` | 模型解析算法文档。 |
| `verification-patterns.md` | 如何验证不同的产物类型。 |
| `verification-overrides.md` | 每种产物的验证覆盖规则。 |
| `planning-config.md` | 完整的配置模式和行为。 |
| `git-integration.md` | Git 提交、分支和历史模式。 |
| `git-planning-commit.md` | 规划目录提交约定。 |
| `questioning.md` | 项目初始化的梦想提取哲学。 |
| `tdd.md` | 测试驱动开发集成模式。 |
| `ui-brand.md` | 视觉输出格式模式。 |
| `common-bug-patterns.md` | 代码审查和验证的常见缺陷模式。 |
| `debugger-philosophy.md` | 由 `ecl-debugger` 加载的长青调试准则。 |
| `mandatory-initial-read.md` | 注入到代理提示中的共享必读样板文本。 |
| `project-skills-discovery.md` | 注入到代理提示中的共享项目技能发现样板文本。 |

### 工作流参考资料

| 参考资料 | 角色 |
|----------|------|
| `agent-contracts.md` | 编排器与代理之间的正式接口。 |
| `context-budget.md` | 上下文窗口预算分配规则。 |
| `continuation-format.md` | 会话续传/恢复格式。 |
| `domain-probes.md` | discuss-phase 的领域特定探究问题。 |
| `gate-prompts.md` | 关卡/检查点提示模板。 |
| `scout-codebase.md` | discuss-phase 侦察步骤的阶段类型→代码库映射选择表（通过 #2551 提取）。 |
| `revision-loop.md` | 计划修订迭代模式。 |
| `universal-anti-patterns.md` | 需要检测和避免的通用反模式。 |
| `worktree-path-safety.md` | Worktree 守卫套件：HEAD 断言、cwd 漂移哨兵（步骤 0a，#3097）和绝对路径守卫（步骤 0b，#3099）— 通过 `<execution_context>` 加载到执行器生成提示中。 |
| `artifact-types.md` | 规划产物类型定义。 |
| `phase-argument-parsing.md` | 阶段参数解析约定。 |
| `decimal-phase-calculation.md` | 十进制子阶段编号规则。 |
| `workstream-flag.md` | 工作流活跃指针约定（`--ws`）。 |
| `user-profiling.md` | 用户行为档案检测启发式方法。 |
| `thinking-partner.md` | 决策点处的条件性思维伙伴激活。 |
| `autonomous-smart-discuss.md` | 自主模式的智能讨论逻辑。 |
| `ios-scaffold.md` | iOS 应用程序脚手架模式。 |
| `ai-evals.md` | `/ecl-ai-integration-phase` 的 AI 评估设计参考。 |
| `ai-frameworks.md` | `ecl-framework-selector` 的 AI 框架决策矩阵参考。 |
| `executor-examples.md` | ecl-executor 代理的已完成示例。 |
| `doc-conflict-engine.md` | 摄取/导入工作流的共享冲突检测契约。 |
| `execute-mvp-tdd.md` | MVP+TDD 模式下 execute-phase 的运行时关卡语义 — 任务前失败测试验证、阶段结束阻塞性审查。 |
| `mvp-concepts.md` | 六个 MVP 相关参考文件的交叉引用索引；将每个文件映射到其目的和加载它的工作流。 |
| `verify-mvp-mode.md` | MVP 模式阶段的 UAT 框架规则 — 用户流程优先排序、延迟技术检查、用户故事格式守卫。 |

### 草图参考资料

`/ecl-sketch` 工作流及其收尾配套使用的参考资料。

| 参考资料 | 角色 |
|----------|------|
| `sketch-interactivity.md` | 使 HTML 草图感觉交互性强且富有活力的规则。 |
| `sketch-theme-system.md` | 用于跨草图一致性的共享 CSS 主题变量系统。 |
| `sketch-tooling.md` | 每个草图中包含的浮动工具栏实用工具。 |
| `sketch-variant-patterns.md` | 多变体 HTML 模式（标签页、并排、叠加层）。 |

### 思维模型参考资料

将思维类模型（o3、o4-mini、Gemini 2.5 Pro）集成到 eCL 工作流中的参考资料。

| 参考资料 | 角色 |
|----------|------|
| `thinking-models-debug.md` | 用于调试工作流的思维模型模式。 |
| `thinking-models-execution.md` | 用于执行代理的思维模型模式。 |
| `thinking-models-planning.md` | 用于规划代理的思维模型模式。 |
| `thinking-models-research.md` | 用于研究代理的思维模型模式。 |
| `thinking-models-verification.md` | 用于验证代理的思维模型模式。 |

### 模块化规划器分解

`ecl-planner` 代理被分解为一个核心代理加上参考模块，以适应运行时字符限制。

| 参考资料 | 角色 |
|----------|------|
| `planner-antipatterns.md` | 规划器反模式和特异性示例。 |
| `planner-chunked.md` | 分块模式返回格式（`## OUTLINE COMPLETE`、`## PLAN COMPLETE`），用于缓解 Windows stdio 挂起问题。 |
| `planner-gap-closure.md` | 间隙闭合模式行为（读取 VERIFICATION.md，有针对性地重新规划）。 |
| `planner-reviews.md` | 跨 AI 审查集成（读取来自 `/ecl-review` 的 REVIEWS.md）。 |
| `planner-revision.md` | 迭代细化的计划修订模式。 |
| `planner-source-audit.md` | 规划器源代码审计和权限限制规则。 |
| `planner-mvp-mode.md` | MVP 模式的垂直切片规划规则。 |
| `planner-human-verify-mode.md` | `workflow.human_verify_mode = end-of-phase` 的规则：抑制 `checkpoint:human-verify` 任务发射，并通过 `<verify><human-check>` 路由延迟的项目。 |
| `planner-graphify-auto-update.md` | `load_graph_context` 如何在现有陈旧性注释旁边显示 `.last-build-status.json` 自动更新状态（运行中/失败/陈旧头部）。通过 `graphify.auto_update` 选择启用（#3347）。 |
| `planner-interface-context.md` | 执行器的接口上下文规则 — 如何从现有代码中提取关键接口/类型/导出，并记录下游计划将使用的新接口。 |
| `skeleton-template.md` | 为新项目行走骨架（阶段 1 + `--mvp`）生成的 SKELETON.md 模板。 |
| `user-story-template.md` | MVP 规划的用户故事格式 — "作为 / 我想要 / 以便" 结构化字段。 |
| `spidr-splitting.md` | 用于在 MVP 模式下处理大型用户故事的 SPIDR 拆分分解规则。 |

> **子目录：** `evolv-coder-lite/references/few-shot-examples/` 包含额外的少样本示例（`plan-checker.md`、`verifier.md`），这些示例从特定代理中引用。它们不计入 62 个顶级参考资料。

---

## CLI 模块 (81 shipped)

完整清单：`evolv-coder-lite/bin/lib/*.cjs`。

| 模块 | 职责 |
|------|------|
| `active-workstream-store.cjs` | 工作流来源优先级和选择（CLI `--ws` > `ECL_WORKSTREAM` 环境变量 > 存储的指针）；名称验证和环境传播 |
| `adr-parser.cjs` | 用于 plan-phase 摄取快速路径的 ADR 决策解析器；规范化章节同义词，解析状态/决策/范围围栏，并强制执行状态拒绝关卡 |
| `agent-command-router.cjs` | `ecl-tools agent` 的轻量 CJS 子命令路由适配器 |
| `artifacts.cjs` | 规范产物注册表 — 已知的 `.planning/` 根文件名；被 `ecl-health` W019 lint 使用 |
| `audit.cjs` | 审计分发、审计开放会话、审计存储帮助器 |
| `check-command-router.cjs` | `ecl-tools check` 的轻量 CJS 子命令路由适配器 |
| `cjs-command-router-adapter.cjs` | 清单支持的 CJS 命令族路由器的共享兼容性适配器 |
| `clock.cjs` | 用于确定性锁测试的可注入时钟接缝（now/sleep） |
| `clusters.cjs` | 运行时 surface 模块的技能集群定义（ADR-0011 阶段 2） |
| `code-review-flags.cjs` | `/ecl:code-review` 的类型化标志解析器；导出 `parseCodeReviewFlags(argv)`（→ `{ fix, all, auto, depth, files }`）和 `resolveCodeReviewWorkflow(flags)`（→ `'code-review.md' \| 'code-review-fix.md'`）；`--fix`/`--all`/`--auto` 路由的规范分发接缝 |
| `command-aliases.cjs` | 清单支持的族路由器的别名/子命令元数据 |
| `command-arg-projection.cjs` | 跨命令族路由器共享的类型化标志和位置参数投影帮助器 |
| `command-routing-hub.cjs` | 纯结果分发中心，集中了所有命令族路由器的模式决策（SDK vs CJS）、错误分类和无抛出契约（#3788） |
| `commands.cjs` | 杂项 CLI 命令（slug、时间戳、todo、脚手架、统计信息） |
| `config-schema.cjs` | `VALID_CONFIG_KEYS` 和动态键模式的单一真实来源；由验证器和 config-schema-docs 奇偶性测试导入 |
| `config.cjs` | `config.json` 读写、章节初始化；从 `config-schema.cjs` 导入验证器 |
| `config-types.cjs` | `model_policy` 配置块的 TypeScript 类型定义 — `ModelPolicyConfig`、`TierEntry`、`RuntimeTiers`；在发布时从 `src/config-types.cts` 编译（ADR-457） |
| `configuration.cjs` | 配置模块 — 规范的配置加载、旧版键规范化、默认值合并和显式磁盘迁移；SDK 和 CJS 消费者的真实来源 |
| `context-utilization.cjs` | `ecl-health --context` 的纯分类器 — 根据 60%/70% 断裂点阈值将（tokensUsed, contextWindow）转换为 `{ percent, state }` 分类结果（#2792） |
| `core.cjs` | 错误处理、输出格式化、共享工具、运行时回退；规划工作区帮助器的兼容性重新导出 |
| `decisions.cjs` | 解析 CONTEXT.md `<decisions>` 块；接受数字（D-42）和字母数字（D-INFRA-01）ID；返回 `{id, text, category, tags, trackable}` |
| `docs.cjs` | 文档更新工作流初始化、Markdown 扫描、单体仓库检测 |
| `drift.cjs` | 执行后代码库结构漂移检测器（#2003）：将文件更改分类为新目录/桶/迁移/路由类别，并循环处理 `last_mapped_commit` frontmatter |
| `fallow-runner.cjs` | `/ecl-code-review` 的 fallow 审计适配器：二进制解析（`PATH` 然后 `node_modules/.bin`）、可操作的缺少二进制错误和结构性发现规范化 |
| `frontmatter.cjs` | YAML frontmatter 增删改查操作 |
| `gap-checker.cjs` | 规划后间隙分析（#2493）：REQUIREMENTS.md + CONTEXT.md 决策 vs PLAN.md 覆盖率报告（`ecl-tools gap-analysis`） |
| `graphify.cjs` | `/ecl-graphify` 的知识图谱构建/查询/状态/差异 |
| `ecl2-import.cjs` | `/ecl-import --from-ecl2` 的外部计划摄取 |
| `init-command-router.cjs` | `ecl-tools init` 的轻量 CJS 子命令路由适配器 |
| `init.cjs` | 每种工作流类型的复合上下文加载 |
| `install-profiles.cjs` | `--minimal` 安装的安装配置文件允许列表和技能暂存（#2762）；哪些 `ecl-*` 技能/代理落入运行时配置目录的单一真实来源 |
| `installer-migration-authoring.cjs` | 记录元数据、显式范围、所有权证据和运行时契约引用的安装程序迁移创作守卫 |
| `installer-migration-report.cjs` | 安装/更新集成的安装程序迁移报告投影和阻止操作守卫 |
| `installer-migrations.cjs` | 安装程序迁移规划、产物分类、安装状态持久化、日志化应用和回滚帮助器 |
| `intel.cjs` | 支持 `/ecl-map-codebase --query` 和 `ecl-intel-updater` 的代码库 intel 存储 |
| `learnings.cjs` | `/ecl-extract-learnings` 的跨阶段学习提取 |
| `milestone.cjs` | 里程碑归档、需求标记 |
| `model-catalog.cjs` | 共享模型目录 JSON 上的 CJS 适配器；导出所有 CLI 消费者的规范运行时层级默认值、代理配置文件映射、别名映射和路由元数据 |
| `model-profiles.cjs` | 源自 `model-catalog.cjs` 的向后兼容配置文件帮助器；不再拥有自己的模型表 |
| `package-identity.cjs` | eCL 已发布包坐标（npm 名称、bin 名称、仓库 slug、变更日志 URL、手动安装命令）的生成单一来源，源自 package.json；由更新工作进程、`check-latest-version` 和安装程序读取（#498） |
| `phase-command-router.cjs` | `ecl-tools phase` 的轻量 CJS 子命令路由适配器 |
| `phase-lifecycle.cjs` | 从 phase-lifecycle SDK 处理程序中提取的纯计算阶段生命周期帮助器 |
| `phase.cjs` | 阶段目录操作、十进制编号、计划索引 |
| `phases-command-router.cjs` | `ecl-tools phases` 的轻量 CJS 子命令路由适配器 |
| `plan-scan.cjs` | 用于检测平面和嵌套布局中计划和摘要文件的规范阶段计划扫描器（k014） |
| `planning-workspace.cjs` | 规划路径/工作流接缝（`planningDir`、`planningPaths`、活跃工作流路由、`.planning/.lock` 编排） |
| `project-root.cjs` | 使用四种启发式方法从起始目录解析项目根目录（自己的 `.planning/` 守卫、`sub_repos` 配置、`multiRepo` 标志、`.git` 启发式） |
| `profile-output.cjs` | 档案渲染、USER-PROFILE.md 和 dev-preferences.md 生成 |
| `profile-pipeline.cjs` | 用户行为档案数据流水线、会话文件扫描 |
| `prompt-budget.cjs` | 审查提示的纯令牌预算核算 — 估算令牌，应用确定性修剪优先级（缩减 PROJECT.md 头部、按比例截断计划、删除上下文/研究/需求、硬失败守卫），返回 `review.max_prompt_tokens` 的结构化元数据（#3081） |
| `review-reviewer-selection.cjs` | `/ecl-review` 默认审查者策略和优先级的审查者选择/规范化帮助器 |
| `roadmap-command-router.cjs` | `ecl-tools roadmap` 的轻量 CJS 子命令路由适配器 |
| `roadmap-upgrade.cjs` | 将旧版 `Phase N` 条目转换为里程碑前缀 `Phase M-NN` 约定的迁移工具；`computeMigrationPlan` + `applyMigration`，默认为试运行并具有原子回滚 |
| `roadmap.cjs` | ROADMAP.md 解析、阶段提取、计划进度 |
| `runtime-artifact-layout.cjs` | 运行时产物布局模块 — 解析每个受支持运行时的产物目录形状（命令、代理、技能）；每个运行时产物放置的单一真实来源（#3663） |
| `runtime-name-policy.cjs` | 运行时名称规范化策略 — 用于路径构建和显示的运行时标识符的规范令牌清理 |
| `runtime-homes.cjs` | 规范的运行时 → 全局配置/技能目录映射；对所有 15 个运行时的一流支持，包括 Hermes 嵌套布局和 Cline 基于规则的排除（#3126） |
| `runtime-slash.cjs` | 运行时感知的斜杠命令格式化器 — 在面向用户的输出和持久化产物中发出 `/ecl-<cmd>`（基于技能的运行时）和 `$ecl-<cmd>`（codex）的单一真实来源（#3584） |
| `schema-detect.cjs` | ORM 模式的模式漂移检测（Prisma、Drizzle、Supabase、TypeORM、Payload）；导出 `detectSchemaFiles`、`detectSchemaOrm`、`checkSchemaDrift`、`SCHEMA_PATTERNS`、`ORM_INFO` |
| `secrets.cjs` | 集成密钥的密钥配置掩码约定（`****<last-4>`）；导出 `SECRET_CONFIG_KEYS`、`isSecretKey`、`maskSecret`、`maskIfSecret` |
| `semver-compare.cjs` | 共享 semver 比较策略帮助器（`compareSemverCore`、稳定三元组验证、规范化元组解析），由更新检查钩子、statusline 开发安装检测和变更集提取范围逻辑使用（#10） |
| `security.cjs` | 路径遍历防护、提示注入检测、安全 JSON/shell 帮助器 |
| `shell-command-projection.cjs` | 托管钩子序列化的运行时感知 shell 命令投影：根据运行时/平台决定 PowerShell 调用操作符使用，并规范化 Windows 脚本路径令牌 |
| `state-command-router.cjs` | `ecl-tools state` 的轻量 CJS 子命令路由适配器 |
| `state.cjs` | STATE.md 解析、更新、进度推进、指标 |
| `state-document.cjs` | 纯 STATE.md 字段提取、替换、状态规范化和进度计算转换 |
| `surface.cjs` | 运行时 surface 模块 — 独立于安装时配置文件标记管理运行时启用/禁用 surface 状态（ADR-0011 阶段 2） |
| `task-command-router.cjs` | `ecl-tools task` 的轻量 CJS 子命令路由适配器 |
| `template.cjs` | 带变量替换的模板选择和填充 |
| `uat.cjs` | UAT 文件解析、验证债务跟踪、audit-uat 支持 |
| `ui-safety-gate.cjs` | 无 shell 的词边界 UI 令牌检测器（#3706，#3718）；从 stdin 读取阶段章节文本，退出 0（找到 UI）或 1（未找到 UI）；也部署到 `evolv-coder-lite/bin/lib/`，以便 eCL 安装程序将其传送到 `$RUNTIME_DIR`（#448） |
| `update-context.cjs` | `/ecl:update` 的纯安装上下文解析器 — 从 update.md bash 移植的运行时/范围/配置目录/版本检测（LOCAL/GLOBAL/UNKNOWN）；支持 `ecl-tools update-context`（#498） |
| `validate-command-router.cjs` | `ecl-tools validate` 的轻量 CJS 子命令路由适配器 |
| `validate.cjs` | 纯阶段变体规范化帮助器（`phaseVariants`、`buildRoadmapPhaseVariants`、`buildNotStartedPhaseVariants`），被 `verify.cjs` 用于 W006/W007 检查；无 I/O，无异步 |
| `verify-command-router.cjs` | `ecl-tools verify` 的轻量 CJS 子命令路由适配器 |
| `verify.cjs` | 计划结构、阶段完整性、参考、提交验证 |
| `workstream-inventory-builder.cjs` | 纯工作流清单投影构建器 |
| `workstream-inventory.cjs` | 共享工作流清单投影：状态字段、阶段/计划/摘要计数、路线图阶段计数和活跃标记 — 将纯投影委托给 `workstream-inventory-builder.cjs` 的轻量编排器 |
| `workstream-name-policy.cjs` | 规范的工作流名称验证（`isValidActiveWorkstreamName`、`hasInvalidPathSegment`、`validateWorkstreamName`）和 slug 规范化（`toWorkstreamSlug`） |
| `workstream.cjs` | 工作流增删改查、迁移、会话作用域活跃指针 |
| `worktree-safety.cjs` | Worktree 根目录解析和非破坏性清理策略决策；拥有 W017 健康检查逻辑 |

[`docs/CLI-TOOLS.md`](CLI-TOOLS.md) 可能描述这些模块的子集；当其与文件系统不一致时，本表和目录清单为准。

---

## 钩子 (14 shipped)

完整清单：`hooks/`。

| 钩子 | 事件 | 目的 |
|------|------|------|
| `ecl-statusline.js` | `statusLine` | 显示模型、任务、目录、上下文使用情况 |
| `ecl-context-monitor.js` | `PostToolUse` / `AfterTool` | 在剩余 35%/25% 时注入面向代理的上下文警告 |
| `ecl-check-update.js` | `SessionStart` | 后台检查新的 eCL 版本 |
| `ecl-check-update-worker.js` | （工作进程） | check-update 的后台工作进程帮助器 |
| `ecl-update-banner.js` | `SessionStart` | 当未使用 eCL statusline 时选择性地显示更新可用横幅（PR #2795） |
| `ecl-prompt-guard.js` | `PreToolUse` | 扫描 `.planning/` 写入中的提示注入模式（建议性） |
| `ecl-workflow-guard.js` | `PreToolUse` | 检测 eCL 工作流上下文之外的文件编辑（建议性，可选启用） |
| `ecl-read-guard.js` | `PreToolUse` | 防止对未读文件执行 Edit/Write 的建议性守卫 |
| `ecl-read-injection-scanner.js` | `PostToolUse` | 扫描工具 Read 结果中的提示注入模式（v1.36+，PR #2201） |
| `ecl-worktree-path-guard.js` | `PreToolUse` | 硬性阻止对 worktree 根目录之外绝对路径执行 Edit/Write/MultiEdit（PR #579，#260） |
| `ecl-session-state.sh` | `PostToolUse` | 基于 shell 运行时的会话状态跟踪 |
| `ecl-validate-commit.sh` | `PostToolUse` | 常规提交强制执行的提交验证 |
| `ecl-phase-boundary.sh` | `PostToolUse` | 工作流过渡的阶段边界检测 |
| `ecl-graphify-update.sh` | `PostToolUse` | 在主 HEAD 推进后自动重建知识图谱（可选启用，默认关闭 — #3347） |

---

## 维护

- 当新的命令、代理、工作流、参考资料、CLI 模块或钩子发布时，请在发布前更新此处对应的章节。
- `tests/` 下的漂移守卫测试（参见上方的"使用说明"）断言每个已发布文件都在此清单中列举。未在此处有对应行的新文件将导致 CI 失败。
- 当文件系统与 `docs/ARCHITECTURE.md` 的数量或精选子集文档（例如 `docs/AGENTS.md` 的主要名册）不一致时，本文件为准。

## 相关资料

- [命令](COMMANDS.md) — 面向用户的命令参考
- [架构](ARCHITECTURE.md) — 功能面如何协同工作
- [文档索引](README.md)
