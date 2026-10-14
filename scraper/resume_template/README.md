# 简历模板爬虫（qmjianli.com）

课程设计演示用，非商用。爬取 `https://www.qmjianli.com/cv/jianlimoban/` 的简历模板预览图与元数据，按风格分类，输出 `templates.json` + 本地图片。数据与图片均落在本目录（D 盘）。

## 目录结构

- `crawler.py` — 主脚本
- `config.py` — 配置（分类、URL、请求参数）
- `schema.sql` — MySQL 建表脚本
- `requirements.txt` — 依赖
- `images/` — 下载的预览图（运行后生成）
- `templates.json` — 输出数据（运行后生成）

## 运行

```bash
pip install -r requirements.txt
python crawler.py
```

运行结束后：

- `images/*.png` 为各模板预览图（文件名 = 模板 source_id）
- `templates.json` 为元数据，字段含 `style_tags`、`category_slug`、`cover_url`、`local_image_path`，以及预留的 `word_download_url`、`word_local_path`

## 导入 MySQL

推荐用现成脚本（自动建表 + 幂等导入）：

```bash
# 先改 import_to_mysql.py 里的 DB_CONFIG（host/端口/账号/密码/库名）
pip install pymysql
python import_to_mysql.py
```

或者手动建表再导入：

```bash
mysql -u root -p 你的库名 < schema.sql
```

下面是用 Python 手动导入的示例（等价于 `import_to_mysql.py` 做的事，需 `pip install mysql-connector-python`）：

```python
import json, mysql.connector

with open("templates.json", encoding="utf-8") as f:
    rows = json.load(f)

conn = mysql.connector.connect(host="127.0.0.1", user="root", password="你的密码", database="你的库名")
cur = conn.cursor()
for r in rows:
    cur.execute(
        """INSERT INTO resume_template
           (source_id, title, style_tags, category_slug, usage_count,
            cover_url, local_image_path, detail_url, word_download_url, word_local_path)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title), style_tags = VALUES(style_tags),
             usage_count = VALUES(usage_count), updated_at = CURRENT_TIMESTAMP""",
        (r["source_id"], r["title"], json.dumps(r["style_tags"], ensure_ascii=False),
         r["category_slug"], r["usage_count"], r["cover_url"], r["local_image_path"],
         r["detail_url"], r["word_download_url"], r["word_local_path"]),
    )
conn.commit()
```

> 也可用 pymysql 或 SQLAlchemy 代替 mysql-connector。

## 扩展

- 需要岗位分类（如 Java开发、Python）的模板：在 `config.CATEGORIES` 里加 URL 编码的 slug，例如 `("Java开发", "Java%E5%BC%80%E5%8F%91")`。
- 预留的 Word 下载：后续拿到个别模板的 Word 文件后，把下载地址/本地路径回填到对应记录的 `word_download_url` / `word_local_path` 字段即可。

## 合规提示

仅用于个人学习与课程设计，脚本已对请求做了限速；请勿商用或大规模滥用，尊重目标站点 robots.txt 与版权。
