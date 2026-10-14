# -*- coding: utf-8 -*-
"""
qmjianli.com 简历模板爬虫（课程设计演示，非商用）

功能：
1. 按风格分类遍历列表页，解析每个模板卡片的元数据；
2. 按 source_id 去重，合并风格标签；
3. 下载预览图到本地 images/ 目录；
4. 输出 templates.json（含预留的 Word 下载字段）。

所有输出（图片 + JSON）都落在脚本所在目录下（D 盘）。
请遵守目标站点 robots.txt 与访问频率限制，仅用于个人学习/课程设计。
"""

import json
import os
import re
import time
from collections import Counter
from urllib.parse import urljoin

import requests
from lxml import html

import config


def build_category_url(slug):
    """由分类 slug 构造列表页 URL。"""
    if not slug:
        return config.LIST_PAGE
    return urljoin(config.LIST_PAGE, slug)


def fetch_page(url):
    """请求页面并返回 lxml HtmlElement。使用 UTF-8 显式解析。"""
    headers = {
        "User-Agent": config.USER_AGENT,
        "Referer": config.BASE_URL,
    }
    resp = requests.get(url, headers=headers, timeout=config.REQUEST_TIMEOUT)
    resp.raise_for_status()
    parser = html.HTMLParser(encoding="utf-8")
    return html.fromstring(resp.content, parser=parser)


def extract_source_id(cover_url, detail_href):
    """从图片 URL 或详情链接提取模板 ID。"""
    m = re.search(r"/online/(\d+)\.png", cover_url)
    if m:
        return int(m.group(1))
    m = re.search(r"/cv/details/(\d+)", detail_href)
    if m:
        return int(m.group(1))
    return None


def extract_style_tags(card_text):
    """从卡片全文提取"模板风格：X"（站点自身的风格标签）。

    注意：不把「分类页名」当作风格标签。部分分类页（如应届生/程序员/英文）
    实际不做服务端过滤、返回全量列表，若用分类页名会导致所有模板被错误打标。
    """
    tags = []
    m = re.search(r"模板风格\s*[:：]\s*([^\s]+)", card_text)
    if m:
        for tag in re.split(r"[,，、/;；]+", m.group(1)):
            tag = tag.strip()
            if tag and tag not in tags:
                tags.append(tag)
    return tags


def extract_usage_count(card_text):
    """提取使用次数。优先"使用"上下文，否则取文本中最大数字。"""
    m = (re.search(r"(\d[\d,]*)\s*(?:人|次)?\s*使用", card_text)
         or re.search(r"使用\s*(\d[\d,]*)\s*(?:人|次)?", card_text))
    if m:
        return int(m.group(1).replace(",", ""))
    nums = [int(x) for x in re.findall(r"\d+", card_text)]
    return max(nums) if nums else 0


def parse_cards(tree, category_name):
    """
    解析一个列表页中的所有模板卡片。

    卡片是包着模板缩略图的 <a>；缩略图 src 形如
    .../img/resume/template/online/{id}.png。用该特征定位卡片，
    比固定的 ul/li/div 层级（例如
    /html/body/div/div[2]/div/section/div[2]/ul/li[1]/a/div/img）
    更健壮。
    """
    cards = []
    for a in tree.xpath('//a[.//img[contains(@src, "template/online/")]]'):
        imgs = a.xpath('.//img[contains(@src, "template/online/")]')
        if not imgs:
            continue
        img = imgs[0]

        cover_url = (img.get("src") or "").strip()
        title = (img.get("alt") or "").strip()
        detail_href = (a.get("href") or "").strip()

        source_id = extract_source_id(cover_url, detail_href)
        if not source_id:
            continue

        card_text = " ".join(a.itertext())
        cards.append({
            "source_id": source_id,
            "title": title,
            "style_tags": extract_style_tags(card_text),
            "category_slug": category_name,
            "usage_count": extract_usage_count(card_text),
            "cover_url": cover_url,
            "detail_url": urljoin(config.BASE_URL, detail_href),
        })
    return cards


def download_image(url, local_path):
    """下载图片；已存在且非空则跳过；失败重试 config.MAX_RETRIES 次。"""
    if not url:
        return False
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return True  # 已下载，跳过
    headers = {
        "User-Agent": config.USER_AGENT,
        "Referer": config.BASE_URL,
    }
    for attempt in range(config.MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=config.REQUEST_TIMEOUT)
            if resp.status_code == 200 and resp.content:
                with open(local_path, "wb") as f:
                    f.write(resp.content)
                return True
        except Exception as exc:  # noqa: BLE001
            print(f"    [下载失败] {url} (第 {attempt + 1} 次): {exc}")
            time.sleep(config.REQUEST_INTERVAL)
    return False


def crawl():
    """主流程。"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    image_dir = os.path.join(base_dir, config.IMAGE_DIR)
    output_json = os.path.join(base_dir, config.OUTPUT_JSON)
    os.makedirs(image_dir, exist_ok=True)

    all_templates = {}      # source_id -> dict
    category_counts = {}    # 分类名 -> 该页卡片数

    for name, slug in config.CATEGORIES:
        url = build_category_url(slug)
        print(f"[抓取] {name}: {url}")
        try:
            tree = fetch_page(url)
            cards = parse_cards(tree, name)
        except Exception as exc:  # noqa: BLE001
            print(f"  [错误] {name} 抓取失败: {exc}")
            continue

        category_counts[name] = len(cards)
        for card in cards:
            sid = card["source_id"]
            if sid in all_templates:
                merged = set(all_templates[sid]["style_tags"]) | set(card["style_tags"])
                all_templates[sid]["style_tags"] = sorted(merged)
            else:
                all_templates[sid] = card
        print(f"  [完成] {name}: {len(cards)} 张卡片")
        time.sleep(config.REQUEST_INTERVAL)

    templates = list(all_templates.values())
    templates.sort(key=lambda x: x["source_id"])
    print(f"\n去重后共 {len(templates)} 个模板")

    # 下载图片
    ok = fail = 0
    for t in templates:
        local_path = os.path.join(image_dir, f'{t["source_id"]}.png')
        if download_image(t["cover_url"], local_path):
            ok += 1
        else:
            fail += 1
        time.sleep(config.IMAGE_DOWNLOAD_INTERVAL)

    # 补齐预留字段与本地图片相对路径（统一用正斜杠，便于 web 使用）
    for t in templates:
        t["local_image_path"] = f'{config.IMAGE_DIR}/{t["source_id"]}.png'
        t.setdefault("word_download_url", None)
        t.setdefault("word_local_path", None)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)

    # 汇总
    print("\n===== 汇总 =====")
    print(f"模板总数: {len(templates)}")
    print(f"图片下载成功: {ok} / 失败: {fail}")
    print("各分类页卡片数:")
    for name, n in category_counts.items():
        print(f"  {name}: {n}")
    print(f"\n数据已写入: {output_json}")


if __name__ == "__main__":
    crawl()
