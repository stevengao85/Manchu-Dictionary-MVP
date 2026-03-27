# 满语词典 MVP（静态版）

这是一个可直接部署到 Netlify / Cloudflare Pages / GitHub Pages 的静态网站脚本包。

当前版本实现了 5 个核心功能：

1. 基础查词
2. 词形反查
3. 鼠标取词
4. 例句阅读
5. 简版句子分析

## 这版包含什么

- 一个可直接运行的静态前端
- 示例词库 `data/entries.json`
- 规则库 `data/rules.json`
- 2000 行词条导入模板 `data/import_template_2000.csv`
- 一个把 CSV 转成 JSON 的辅助脚本 `tools/csv_to_entries.py`

## 先说明白的一点

这版的重点是“**程序骨架已经搭好**”。

当前词库里放的是一批示范词条，用来验证：
- 查词
- 反查变格变位
- 例句悬停
- 短句分析

它**不是**一部已经填满 2000 个经过严格校勘的满语词典。

如果你要把词库扩充到 2000 条，推荐走下面两条路之一：

### 方案 A：直接改 `data/entries.json`
适合少量、高质量人工录入。

### 方案 B：先填 `data/import_template_2000.csv`
再运行转换脚本批量生成 JSON。
适合持续扩写。

---

## 文件结构

```text
manchu_dictionary_mvp/
├── index.html
├── styles.css
├── app.js
├── README.md
├── data/
│   ├── entries.json
│   ├── rules.json
│   └── import_template_2000.csv
└── tools/
    └── csv_to_entries.py
```

---

## 如何本地运行

由于前端要 `fetch()` JSON 文件，**不要直接双击 `index.html` 打开**。
请用本地静态服务器打开。

### 方法 1：Python

```bash
cd manchu_dictionary_mvp
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

### 方法 2：Node

如果你装了一个简单静态服务器，也可以直接用。

---

## 如何部署到 Netlify / Cloudflare Pages

这版没有构建步骤，直接上传整个文件夹即可。

### Netlify
- 新建站点
- 直接把整个 `manchu_dictionary_mvp` 文件夹拖上去
- 不需要 build command
- 不需要 publish directory 额外配置；根目录就是发布目录

### Cloudflare Pages
- 创建一个静态项目
- 上传整个项目文件
- Build command 留空
- Output directory 设为根目录或直接按静态项目处理

---

## 词条 JSON 结构说明

`entries.json` 中每个词条大致长这样：

```json
{
  "id": "E0001",
  "headword": "abka",
  "headword_script": "ᠠᠪᡴᠠ",
  "stem": "abka",
  "pos": "名词",
  "core_meaning": "天；天空；上天",
  "senses": [
    "本义为天、天空、上天。"
  ],
  "forms": [
    {
      "surface": "abkai",
      "type": "属格",
      "explanation": "天的；上天的"
    }
  ],
  "derivations": [
    {
      "term": "abkai jui",
      "relation": "复合",
      "meaning": "天子；皇帝"
    }
  ],
  "examples": [
    {
      "latin": "abka tusihiyen oho",
      "translation": "天阴了。",
      "notes": "可用于演示句子分析。"
    }
  ],
  "related": ["abkai", "na"],
  "tags": ["自然", "高频"]
}
```

---

## 规则库说明

`data/rules.json` 中包含三部分：

- `noun_suffixes`：名词常见格位词尾
- `verb_suffixes`：动词常见词尾
- `irregular_forms`：高频不规则形式

当前版本的规则是 **MVP 级别**，用于支持：
- 常见词形反查
- 简单句子分析
- 悬停取词说明

它不是完整满语形态学引擎。

---

## 如何扩充到 2000 条

### 第一步：填 CSV 模板

打开：

```text
data/import_template_2000.csv
```

建议先填这些列：

- `id`
- `headword`
- `headword_script`
- `stem`
- `citation_form`
- `pos`
- `core_meaning`
- `senses`
- `forms`
- `derivations`
- `examples`
- `related`
- `tags`

其中：
- `senses` 用 `||` 分隔多条
- `related` 用 `||` 分隔多条
- `tags` 用 `||` 分隔多条
- `forms` 用 `surface::type::explanation`，多个条目之间用 `||`
- `derivations` 用 `term::relation::meaning`，多个条目之间用 `||`
- `examples` 用 `latin::translation::notes`，多个条目之间用 `||`

### 第二步：运行转换脚本

```bash
cd manchu_dictionary_mvp
python tools/csv_to_entries.py data/import_template_2000.csv data/entries.json
```

这样会把 CSV 转成网站直接可读取的 `entries.json`。

---

## 这版适合做什么

- 快速搭一个可演示、可部署、可迭代的满语词典原型
- 先验证交互体验是否符合你的预期
- 再逐步扩充词条、规则和例句

## 这版不适合做什么

- 直接当作学术定本级词典发布
- 处理特别复杂的长句句法
- 覆盖所有满语词形变化

---

## 后续最自然的升级路径

### 第一步升级
- 把示范词条扩到 300–500 条高频词
- 补全例句
- 完善高频不规则形式

### 第二步升级
- 扩到 1000–2000 条
- 丰富名词格和动词词尾规则
- 增加更多固定搭配和派生词

### 第三步升级
- 再考虑上后台、数据库和审核流
- 做成真正长期维护的平台

---

## 备注

当前站点中部分示范词条和例句是为了验证功能而放入的 MVP 数据。正式扩词时，建议逐条做来源校核、统一转写规范，并区分：

- 真正的语法形式
- 已词汇化形式
- 复合词
- 相关词

这样后期词库才不会乱。
