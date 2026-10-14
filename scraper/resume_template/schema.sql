-- qmjianli 简历模板 - MySQL 建表脚本
-- 本表与 templates.json 一一对应；word_download_url / word_local_path 为预留字段。

CREATE TABLE IF NOT EXISTS resume_template (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_id         BIGINT NOT NULL UNIQUE,        -- 源站模板ID（去重键）
    title             VARCHAR(255) NOT NULL,         -- 模板标题
    style_tags        JSON,                          -- ["简洁","时尚","左右分栏"]
    category_slug     VARCHAR(64),                   -- 首次抓取到的分类
    usage_count       INT NOT NULL DEFAULT 0,        -- 使用次数
    cover_url         VARCHAR(512),                  -- 源站缩略图URL
    local_image_path  VARCHAR(255),                  -- 本地图片相对路径
    detail_url        VARCHAR(255),                  -- 源站详情页URL
    word_download_url VARCHAR(512),                  -- ★预留：Word模板下载地址
    word_local_path   VARCHAR(255),                  -- ★预留：Word模板本地文件路径
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 若 MySQL < 5.7 不支持 JSON 列，改用逗号分隔字符串：
--   style_tags VARCHAR(255)  -- 如 "简洁,时尚,左右分栏"
