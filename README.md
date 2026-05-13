# 综测计算工作台

面向学生综合测评的本地 Web 工作台。当前项目重点是把综测流程拆成清晰的页面：课程分数文件计算基础分、证明文件生成附加分、按结构化规则计算各科总分，最后预览并导出结果。

## 技术栈

- **前端**：React 18 + TypeScript + Vite 6 + React Router 6 + lucide-react
- **后端**：Node.js + TypeScript + Express 4 + sql.js
- **数据**：SQLite 文件存储，零配置启动

## 目录结构

```text
综测/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell / Sidebar / TopNav / MobileNav
│   │   │   ├── BaseScoreCard.tsx          # 基础分计算卡片
│   │   │   ├── BonusScoreCard.tsx         # 附加分计算卡片
│   │   │   ├── AcademicBonusRulePanel.tsx # 智育附加分规则搜索与添加
│   │   │   ├── CourseScoreImportPanel.tsx # 课程分数文件导入
│   │   │   ├── BonusFileUploadPanel.tsx   # 证明文件上传
│   │   │   ├── FloatingTotalBar.tsx       # 悬浮总分栏 + 快速定位按钮
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── SubjectPage.tsx
│   │   │   ├── ExportPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/api.ts
│   │   ├── styles/
│   │   ├── types/zongce.ts
│   │   └── App.tsx
│   └── ...
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   │   ├── extract.ts
│   │   │   ├── subjects.ts
│   │   │   ├── academicRules.ts
│   │   │   ├── calculate.ts
│   │   │   ├── exportRoutes.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── academicBaseScore.ts
│   │   │   └── academicRules.ts
│   │   ├── types/zongce.ts
│   │   └── index.ts
│   └── ...
├── output.json                   # 当前 AI 提取后的规则 JSON 测试数据
├── DESIGN.md
└── README.md
```

## 快速启动

安装依赖：

```bash
cd backend && npm install
cd ../frontend && npm install
```

启动后端：

```bash
cd backend
npm run dev
```

启动前端：

```bash
cd frontend
npm run dev
```

前端开发服务器通过 `/api` 代理到后端 `localhost:3001`。

构建检查：

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## 页面结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/moral` | 德育 | 科目基础分/附加分计算工作台 |
| `/academic` | 智育 | 科目基础分/附加分计算工作台 |
| `/sports` | 体育 | 科目基础分/附加分计算工作台 |
| `/aesthetic` | 美育 | 科目基础分/附加分计算工作台 |
| `/labor` | 劳育 | 科目基础分/附加分计算工作台 |
| `/export` | 导出 | 结果预览、学生明细、Excel/CSV 导出入口 |
| `/settings` | 设置 | AI API 配置、五科基础分配置、积分规则上传、默认参数 |

根路径 `/` 重定向到 `/moral`。

## 科目页设计

五个科目页共用 `SubjectPage`，只替换科目名称。科目页直接面向分数录入、规则选择和总分计算。

科目页当前使用同一套规则计算工作台：基础分区域承接课程成绩文件，附加分区域按当前科目的 `output.json` 规则进行选择、确认、添加和前端二次计算。智育和体育基础分已接入真实课程成绩文件解析；五科基础分配置已在设置页保存到 `subject_configs.base_score`，这是当前系统的科目基础分配置来源。

桌面端结构是两行两列：

```text
┌───────────────────────────────┬────────────────────────┐
│ 基础分                         │ 课程分数文件导入        │
│ - 课程成绩文件                  │ - 上传课程分数文件       │
│ - 课程数 / 总学分               │ - 已导入文件列表         │
│ - ∑ 公式计算明细                │ - 重新导入              │
│ [复制]              基础分：80.08│                        │
└───────────────────────────────┴────────────────────────┘

┌───────────────────────────────┬────────────────────────┐
│ 附加分 / 科目计分               │ 科目规则添加              │
│ - 附加分项目或计分摘要           │ - 按规则结构化选择        │
│ - 点击记录查看来源与约束详情     │ - 补充确认信息并添加      │
│ [复制]              附加分：15  │ - 自动同步附加分/总分     │
└───────────────────────────────┴────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ [基础分/附加分]         智育总分：80.08 + 15 = 95.08    │
└────────────────────────────────────────────────────────┘
```

关键交互：

- **基础分卡片**只复制基础分的完整 `∑` 公式。
- **附加分卡片**只复制附加分项目文本和附加分合计。
- **课程分数文件导入**当前用于智育和体育基础分：智育只计算非体育部课程，体育只计算开课学院/部门为体育部的课程；德育、美育、劳育基础分由设置页配置保存。
- **科目规则添加**通过规则 JSON 加载当前科目的可选计分项。智育保持原有的比赛、论文、证书/考试、课题/著作/专利、课程减分结构化选择；体育、德育、美育、劳育使用同一面板按各自 `category` 和规则项选择。
- 添加规则后，会生成一行计分摘要，只展示项目名称和实际计入分；点击记录会弹出详情，查看原始分、来源页码、约束、确认信息和调整原因。
- 智育规则中需要人工事实的信息会在添加前补充确认，例如团队比赛角色比例、科研作者排名、材料核验、比赛级别认定、考试时间归属、论文录用证明资格和历史已计入分值。
- 智育附加分前端会执行明确可计算的约束：倍率折算、同组取高、上限和最高 5 项；同一项目/成果取高规则会以红色提示展示，提醒用户避免重复上传或重复选择。
- **悬浮总分栏**展示当前科目总分，并带一个快速定位按钮。
- 快速定位按钮显示当前区域文字：`基础分` 或 `附加分`；点击后在两个卡片之间平滑滚动切换。

窄屏下页面变为上下排列：

```text
基础分
课程分数文件导入
附加分
科目规则添加
悬浮总分栏
```

## 计算展示格式

基础分计算明细必须保持为一条可复制公式，而不是课程列表或表格。智育和体育基础分当前已接入真实 Excel 计算，课程顺序按学期从前往后排序，但公式文本中不插入学期分组标签：

```text
∑（课程名称1转换后成绩1×学分1+课程名称2转换后成绩2×学分2+...）÷总学分=平均基础分
```

智育和体育基础分使用同一个课程成绩文件，只使用“总评”行，并读取课程名称、学期、学分、成绩、开课学院/部门参与计算。五级制成绩按以下规则转为百分制：优/优秀 95，良/良好 85，中/中等 75，及格 65，不及格/不合格 40。智育会排除开课学院/部门包含“体育部”或“体育”的课程；体育只保留开课学院/部门包含“体育部”或“体育”的课程。

五科基础分配置已接入设置页保存/读取；科目附加分已改为从 `output.json` 读取规则并在前端计算。

## 业务边界

- 五个科目固定：德育、智育、体育、美育、劳育。
- 具体规则不固定，发布版通过结构化 JSON 规则文件导入后使用。
- 科目页只展示基础分和附加分计算过程，不展示规则表格。
- 规则文件上传放在 `/settings` 页面。
- 导出相关能力放在 `/export` 页面。
- 设置相关能力放在 `/settings` 页面。

## API 端点

### 基础端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/setup` | 初始化/重置数据库 |
| GET | `/api/parts` | 获取导航 part |
| GET | `/api/dashboard/summary` | 仪表盘摘要 |
| GET | `/api/records` | 记录列表 |
| GET | `/api/materials` | 材料列表 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/timeline` | 时间线 |

### 综测端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/subjects` | 五科目配置摘要 |
| GET | `/api/subjects/:subjectId` | 单科目配置 |
| PATCH | `/api/subjects/:subjectId` | 修改科目配置 |
| POST | `/api/subjects/:subjectId/rules` | 新增规则 |
| PATCH | `/api/rules/:ruleId` | 修改规则 |
| DELETE | `/api/rules/:ruleId` | 删除规则 |
| POST | `/api/subjects/:subjectId/base-score` | 上传课程成绩文件并计算基础分，目前支持 `academic` 和 `sports` |
| GET | `/api/rules/:subjectId` | 读取指定科目规则 JSON，缺少科目时返回空 `scoreItems` 和 `constraints` |
| GET | `/api/rules/academic` | 兼容旧调用，读取智育规则 JSON |
| GET | `/api/settings/ai` | 获取 AI API 配置，Token 仅返回配置状态 |
| PATCH | `/api/settings/ai` | 保存 AI Provider、Base URL、Model |
| GET | `/api/settings/base-scores` | 获取五科基础分配置 |
| PATCH | `/api/settings/base-scores` | 保存五科基础分配置，支持部分科目更新 |
| POST | `/api/calculate` | 执行计算 |
| GET | `/api/export/preview` | 导出预览 |
| POST | `/api/export` | 导出 Excel/CSV |

## 规则 JSON 协议

当前根目录 `output.json` 是 AI 提取后的规则 JSON 测试数据，结构为 `zongce-rules-v1`，包含德育、智育、体育、美育、劳育五个科目的 `scoreItems` 和 `constraints`。

核心约定：

- `scoreItems` 是前端可选择的原子计分项，包含 `id`、`name`、`direction`、`baseScore`、`scoreUnit`、`category`、`groupKey`、`keywords`、`constraintIds`、`sourceText`、`sourcePage`。
- `constraints` 是独立约束项，包含 `id`、`name`、`type`、`scope`、`calculation`、`message`、`sourceText`、`sourcePage`。
- `constraintIds` 负责把计分项和约束关联起来，前端运行时把规则和约束合并后计算。
- 当前前端计算框架支持 `notice_only`、`exclusive_max`、`cap_total`、`cap_group`、`multiplier`、`per_time`。
- 前端不解析中文原文来猜规则；可计算逻辑必须由 JSON 的结构化字段表达。

当前已知限制：

- 根目录 `output.json` 基本符合协议，但仍有部分占位约束和 `notice_only` 约束需要继续清理。
- 后端当前规则读取路径需要与最终规则文件位置保持一致；是否直接读取根目录 `output.json` 留待后续任务处理。
- “智育加分仅取最高 5 项”已由前端执行；同一项目/作品/比赛是否重复目前交给用户根据红色约束提示自行判断，后续如要全自动识别仍需引入具体项目/成果标识。

## 当前状态

- 智育基础分：已接入课程成绩文件上传解析并真实计算，过滤掉体育部课程。
- 体育基础分：已接入同一课程成绩文件上传解析，只计算体育部课程。
- 科目附加分：已接入规则 JSON 和前端计算框架，支持结构化选择、补充确认信息、倍率折算、同组取高、上限和最高 5 项。
- 课程分数文件导入面板：当前只对智育和体育启用。
- 五科基础分配置：已接入设置页保存/读取，落库到 `subject_configs.base_score`。
- AI API 配置：已接入设置页保存/读取。

## 真实接入预留

- 导出文件生成接入点：`backend/src/routes/exportRoutes.ts`
- 课程 Excel 解析可接入到 `CourseScoreImportPanel` 对应 API。
- 证明文件匹配可接入到 `BonusFileUploadPanel` 对应 API。

敏感信息要求：

- AI Token 仍通过后端环境变量读取，前端不得输入、保存或展示真实 AI Token。
- 前端不得展示真实 Token 明文。
- README、日志、测试和截图中不得出现真实 Token。

## 设计规范

遵循 `DESIGN.md` 的安静工具风格：

- 浅灰背景 `#f5f5f7`
- 白色内容卡片
- 浅灰边框
- 大圆角
- 克制排版
- 不使用营销页、复杂装饰或高饱和视觉

## 当前验收重点

开发或验收科目页时，请优先检查：

- 基础分和附加分是否是两张独立卡片。
- 第一行左右卡片高度是否一致。
- 第二行左右卡片高度是否一致。
- 悬浮总分栏是否展示总分，而不是基础分。
- 快速定位按钮是否位于悬浮总分栏上。
- 点击快速定位按钮是否能在基础分和附加分之间滚动切换。
- 上传证明文件后，附加分和总分是否同步更新。
