# 满文字典静态脚本包（GitHub / Vercel 可直接部署）

这是一个可直接上传到 **GitHub**、并可用 **Vercel** 发布的静态版满文字典脚本包。

这版重点实现了：

1. 基础查词
2. 非辞典形反查
3. 鼠标取词
4. 例句阅读
5. 简版句子分析
6. 词条中的变化形式 / 派生层可各自带例句

## 目录结构

```text
manchu_dictionary_github_vercel_ready/
├── index.html
├── styles.css
├── app.js
├── vercel.json
├── README.md
├── data/
│   ├── entries.json
│   ├── rules.json
│   └── import_template_2000.csv
└── tools/
    └── csv_to_entries.py
```

## 这版的内容边界

这是一套 **可直接运行的程序骨架 + 一批示范词条**。

它已经能演示你目前确认过的核心逻辑：

- 查辞典形
- 输入非辞典形后，优先显示“它是 XXX 的 YYY 形式”
- 对已词汇化的形式，允许独立展示
- 主词条与部分变化形式各自配例句
- 句子分析时显示辞典形与变化类型

它还不是一部已经填满、并经过系统校勘的大型满语辞典。

## 本地运行

不要直接双击 `index.html`。请用静态服务器打开。

### Python

```bash
cd manchu_dictionary_github_vercel_ready
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 上传到 GitHub

1. 解压整个项目包。
2. 新建 GitHub 仓库。
3. 上传解压后的全部文件和文件夹内容。
4. 确认仓库根目录能直接看到：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `vercel.json`
   - `data/`
   - `tools/`

## 发布到 Vercel

1. 在 Vercel 中导入该 GitHub 仓库。
2. `Application Preset` 选 `Other`。
3. `Root Directory` 保持根目录即可。
4. `Build Command` 留空。
5. `Output Directory` 留空。
6. 点击 `Deploy`。

## 数据结构说明

### 主词条字段

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
- `lexicalized_from`

### forms 中单项字段

- `surface`
- `type`
- `explanation`
- `example`

### derivations 中单项字段

- `term`
- `relation`
- `meaning`
- `example`

### example 字段

- `latin`
- `translation`
- `notes`
- `level`

## 反查逻辑（当前版）

默认规则：

- 如果输入的是非辞典形，系统优先显示：
  - “它是 XXX 的 YYY 形式”
- 如果该形式本身已词汇化并被单独收录，则也可以作为独立词条展示

## 词库扩充方式

### 方案 A：直接编辑 `data/entries.json`
适合少量、高质量手工录入。

### 方案 B：先编辑 `data/import_template_2000.csv`
再运行转换脚本：

```bash
python tools/csv_to_entries.py data/import_template_2000.csv data/entries.json
```

## 后续最自然的升级路径

1. 继续补高频词头
2. 继续补变化形式例句
3. 逐步加入文献 / 档案风格例句
4. 后续再接教学录入后台
