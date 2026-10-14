# -*- coding: utf-8 -*-
"""
把 templates.json 导入 PostgreSQL（resume_template 表）。

适用于把爬虫数据导入 Spring Boot 主项目使用的 PostgreSQL（库 interview_guide）。
用法：
  1. pip install psycopg2-binary
  2. 修改下方 DB_CONFIG 为你的数据库连接
  3. python import_to_postgresql.py

首次运行会自动建表（与后端 ResumeTemplateEntity 对应），重复运行按 source_id 幂等更新。
"""

import json
import os
import sys

import psycopg2

# 数据库连接配置（与正在运行的 Docker 容器 interview-submit-postgres 一致）
# docker-compose.override.yml 把 PG 映射到宿主机 127.0.0.1:15434（不是 5432）
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 15434,
    "user": "postgres",
    "password": "password",         # docker-compose.yml 里 POSTGRES_PASSWORD=password
    "dbname": "interview_guide",    # POSTGRES_DB=interview_guide
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "templates.json")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS resume_template (
    id                BIGSERIAL PRIMARY KEY,
    source_id         BIGINT NOT NULL UNIQUE,
    title             VARCHAR(255) NOT NULL,
    style_tags        TEXT,
    category_slug     VARCHAR(64),
    usage_count       INTEGER NOT NULL DEFAULT 0,
    cover_url         VARCHAR(512),
    local_image_path  VARCHAR(255),
    detail_url        VARCHAR(512),
    word_download_url VARCHAR(512),
    word_local_path   VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

UPSERT_SQL = """
INSERT INTO resume_template
    (source_id, title, style_tags, category_slug, usage_count,
     cover_url, local_image_path, detail_url, word_download_url, word_local_path)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (source_id) DO UPDATE SET
    title = EXCLUDED.title,
    style_tags = EXCLUDED.style_tags,
    category_slug = EXCLUDED.category_slug,
    usage_count = EXCLUDED.usage_count,
    cover_url = EXCLUDED.cover_url,
    local_image_path = EXCLUDED.local_image_path,
    detail_url = EXCLUDED.detail_url,
    word_download_url = EXCLUDED.word_download_url,
    word_local_path = EXCLUDED.word_local_path,
    updated_at = now()
"""


def main():
    if not os.path.exists(JSON_PATH):
        sys.exit(f"未找到 {JSON_PATH}，请先运行 crawler.py")

    with open(JSON_PATH, encoding="utf-8") as f:
        rows = json.load(f)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            for r in rows:
                cur.execute(UPSERT_SQL, (
                    r["source_id"], r["title"],
                    json.dumps(r["style_tags"], ensure_ascii=False),
                    r["category_slug"], r["usage_count"], r["cover_url"],
                    r["local_image_path"], r["detail_url"],
                    r["word_download_url"], r["word_local_path"],
                ))
        conn.commit()
        print(f"导入完成：{len(rows)} 条记录已写入 resume_template 表")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
