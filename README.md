# 综测计算工作台

面向学生综合测评的本地 Web 工作台。课程分数文件计算基础分、按结构化规则选择附加分、计算各科总分，预览并导出结果。

## 快速启动

### 方式一：直接运行可执行文件

从 [Releases](https://github.com/tacho-work/zufe-zongce/releases) 下载对应系统的文件，双击运行，浏览器访问 `http://localhost:3001`。

| 系统 | 文件 |
|------|------|
| Windows x64 | `zongce-win-x64.exe` |
| macOS ARM64 | `zongce-macos-arm64` |
| Linux x64 | `zongce-linux-x64` |

### 方式二：源码运行

```bash
# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 启动后端（终端 1）
cd backend && npm run dev

# 启动前端（终端 2）
cd frontend && npm run dev
```

前端开发服务器通过 `/api` 代理到后端 `localhost:3001`。

## 技术栈

- **前端**：React 18 + TypeScript + Vite 6 + React Router 6 + lucide-react
- **后端**：Node.js + TypeScript + Express 4 + sql.js
- **数据**：SQLite 文件存储，零配置启动

## 构建发布

```bash
# 构建前端 + 后端
cd backend && npm run build:release

# 打包当前平台可执行文件
npm run package:mac       # macOS ARM64
# npm run package:win     # Windows x64（需在 Windows 运行）
# npm run package:linux   # Linux x64（需在 Linux 运行）
```

推送 `v*` 标签到 GitHub 自动触发 CI 构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 目录结构

```text
zufe-zongce/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI 组件
│   │   ├── pages/            # 科目页 / 导出页 / 设置页
│   │   ├── services/api.ts   # API 请求层
│   │   ├── types/zongce.ts   # 类型定义
│   │   └── App.tsx           # 路由入口
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── db/               # SQLite 连接与种子
│   │   ├── routes/           # API 路由
│   │   ├── services/         # 业务逻辑
│   │   ├── utils/paths.ts    # 跨平台路径工具
│   │   └── index.ts          # 服务入口
│   ├── scripts/              # 构建脚本
│   └── package.json
├── output.json               # 规则 JSON 数据
└── .github/workflows/release.yml
```

## 页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/moral` | 德育 | 科目基础分/附加分计算 |
| `/academic` | 智育 | 同上 |
| `/sports` | 体育 | 同上 |
| `/aesthetic` | 美育 | 同上 |
| `/labor` | 劳育 | 同上 |
| `/export` | 导出 | 结果预览与导出 |
| `/settings` | 设置 | 基础分配置、规则上传 |

## 当前功能

- 五个科目：德育、智育、体育、美育、劳育
- 基础分：课程成绩文件上传解析并真实计算（智育/体育）
- 附加分：按结构化 JSON 规则选择计分项，支持倍率折算、同组取高、上限等约束
- 计算：规则选择后前端实时计算总分
- 导出：成绩汇总、Word 模板填充预览与 .docx 导出
- 设置：德育/美育/劳育基础分配置、规则文件上传
- 规则 JSON 导入：通过结构化 JSON 导入完整的计分规则
- 跨平台：打包为独立可执行文件，无需 Node.js 环境
