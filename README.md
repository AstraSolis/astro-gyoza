# Gyoza

基于 Astro 和 React 构建的静态博客模板

![astro version](https://img.shields.io/badge/astro-5.14.1-red)
![node version](https://img.shields.io/badge/node-20.3.0-green)

本仓库是基于 [MIT](LICENSE) 许可证修改的自用版本，原仓库 [@lxchapu/astro-gyoza](https://github.com/lxchapu/astro-gyoza)

演示站点：

- [gyoza.lxchapu.com](https://gyoza.lxchapu.com)
- [www.lxchapu.com](https://www.lxchapu.com)

## 📷 截图

![Preview](https://s2.loli.net/2024/05/06/A9rzC3Uym7RwdQc.webp)

## 🎉 特性

- ✅ 有着规范的 URL 和 OpenGraph 信息，对 SEO 友好
- ✅ 支持站点地图
- ✅ 支持 RSS 订阅
- ✅ 支持夜间模式
- ✅ 特殊日期变灰
- ✅ 简单干净的配色和主题
- ✅ 支持评论系统
- ✅ 支持代码高亮

## 🔧 技术栈

- [Astro](https://astro.build/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Jotai](https://jotai.org/)

## 📖 文档

前往：[Documentation](https://gyoza.lxchapu.com/posts/guide)

## 🚀 项目结构

```text
├── public/                     # 静态资源
├── src/
│   ├── assets/                 # 资源文件
│   ├── components/             # React/Astro 组件
│   │   ├── comment/            # 评论组件
│   │   ├── footer/             # 页脚组件
│   │   ├── head/               # Head 标签组件
│   │   ├── header/             # 页眉导航组件
│   │   ├── hero/               # 首页 Hero 区域
│   │   ├── jottings/           # 随记组件
│   │   ├── post/               # 文章相关组件
│   │   ├── provider/           # Context Provider
│   │   └── ui/                 # 通用 UI 组件
│   ├── content/                # 内容集合
│   │   ├── posts/              # 博客文章 (.md)
│   │   ├── projects/           # 项目数据 (.yaml)
│   │   ├── spec/               # 特殊页面 (.md)
│   │   ├── friends/            # 友链数据 (.yaml)
│   │   ├── jottings/           # 随记数据 (.yaml)
│   │   └── config.ts           # 内容集合配置
│   ├── hooks/                  # React Hooks
│   ├── layouts/                # Astro 布局组件
│   ├── pages/                  # 页面路由
│   ├── plugins/                # Remark/Rehype 插件
│   ├── scripts/                # 脚本工具
│   ├── store/                  # Jotai 状态管理
│   ├── styles/                 # 全局样式
│   ├── utils/                  # 工具函数
│   └── config.yaml             # 网站配置文件
├── astro.config.js             # Astro 配置
├── package.json
├── tsconfig.json
└── README.md
```

网站配置保存在 `src/config.yaml` 文件。

## 🧞 常用命令

| 命令               | 说明             |
| :----------------- | :--------------- |
| `pnpm i`           | 安装依赖         |
| `pnpm dev`         | 启动开发服务器   |
| `pnpm build`       | 构建生产版本     |
| `pnpm preview`     | 本地预览构建结果 |
| `pnpm new-post`    | 创建新文章       |
| `pnpm new-project` | 创建新项目       |
| `pnpm new-friend`  | 添加友链         |

## 📝 文章管理

### 📁 文章位置

所有博客文章存放在 `src/content/posts/` 目录下，文件格式为 `.md` (Markdown)

### 📋 Front Matter 字段说明

- `title`: 标题（必填）
- `date`: 发布日期（必填）
- `lastMod`: 最后修改时间（可选）
- `summary`: 文章摘要（可选）
- `category`: 分类（可选）
- `tags`: 标签数组（可选）
- `sticky`: 置顶优先级，数字越大越靠前（可选）
- `comments`: 是否启用评论（可选）
- `draft`: 是否为草稿（可选）

## 💬 随记管理

### 📁 随记文件位置

随记数据存放在 `src/content/jottings/jottings.yaml` 文件中

### 📋 数据格式说明

```yaml
items:
  - text: '当第一颗卫星飞向大气层外,我们便以为自己终有一日会征服宇宙'
    date: 2025-10-01
    from: 示例来源
    author: 示例作者

  - text: '生而为人,我很抱歉。'
    date: 2024-04-02
    from: 人间失格
    author: 太宰治
```

### 📝 字段说明

- `text`: 随记内容（必填）
- `date`: 记录日期（必填）
- `from`: 来源/出处（可选）
- `author`: 作者（可选）

随记会按日期降序排列，并自动按年份分组显示
