# -*- coding: utf-8 -*-
"""
把 templates.json 导入 MySQL（resume_template 表）。

用法：
  1. pip install pymysql
  2. 修改下方 DB_CONFIG 为你的数据库连接
  3. python import_to_mysql.py

首次运行会自动建表（与 schema.sql 等价），重复运行按 source_id 幂等更新。
"""

import json
import os
import sys

import pymysql

# 数据库连接配置（按需修改）
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",                 # 改成你的密码
    "database": "interview_guide",  # 改成你的库名
    "charset": "utf8mb4",
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "templates.json")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS resume_template (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_id         BIGINT NOT NULL UNIQUE,
    title             VARCHAR(255) NOT NULL,
    style_tags        JSON,
    category_slug     VARCHAR(64),
    usage_count       INT NOT NULL DEFAULT 0,
    cover_url         VARCHAR(512),
    local_image_path  VARCHAR(255),
    detail_url        VARCHAR(255),
    word_download_url VARCHAR(512),
    word_local_path   VARCHAR(255),
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

UPSERT_SQL = """
INSERT INTO resume_template
    (source_id, title, style_tags, category_slug, usage_count,
     cover_url, local_image_path, detail_url, word_download_url, word_local_path)
VALUES
    (%(source_id)s, %(title)s, %(style_tags)s, %(category_slug)s, %(usage_count)s,
     %(cover_url)s, %(local_image_path)s, %(detail_url)s, %(word_download_url)s, %(word_local_path)s)
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    style_tags = VALUES(style_tags),
    category_slug = VALUES(category_slug),
    usage_count = VALUES(usage_count),
    cover_url = VALUES(cover_url),
    local_image_path = VALUES(local_image_path),
    detail_url = VALUES(detail_url),
    word_download_url = VALUES(word_download_url),
    word_local_path = VALUES(word_local_path),
    updated_at = CURRENT_TIMESTAMP
"""


def main():
    if not os.path.exists(JSON_PATH):
        sys.exit(f"未找到 {JSON_PATH}，请先运行 crawler.py")

    with open(JSON_PATH, encoding="utf-8") as f:
        rows = json.load(f)

    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            for r in rows:
                params = {
                    "source_id": r["source_id"],
                    "title": r["title"],
                    "style_tags": json.dumps(r["style_tags"], ensure_ascii=False),
                    "category_slug": r["category_slug"],
                    "usage_count": r["usage_count"],
                    "cover_url": r["cover_url"],
                    "local_image_path": r["local_image_path"],
                    "detail_url": r["detail_url"],
                    "word_download_url": r["word_download_url"],
                    "word_local_path": r["word_local_path"],
                }
                cur.execute(UPSERT_SQL, params)
        conn.commit()
        print(f"导入完成：{len(rows)} 条记录已写入 resume_template 表")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
