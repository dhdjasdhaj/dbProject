# -*- coding: utf-8 -*-
"""qmjianli 简历模板爬虫 - 配置常量。"""

# 站点根地址
BASE_URL = "https://www.qmjianli.com"

# 模板列表根页（"热门"分类）
LIST_PAGE = "https://www.qmjianli.com/cv/jianlimoban/"

# 风格分类：(显示名, 路径slug)。slug 为空表示根分类页（热门）。
# "热门"放最前先抓，作为主列表；category_slug 记"首次发现该模板的分类页"。
# 说明：应届生/考研复试/程序员/英文 这几个分类页在服务端未真正过滤，会返回与热门
# 相同的全量列表，因此风格分类只靠卡片自带的"模板风格：X"文字（见 crawler.py），
# 分类页仅用于补全主列表之外、只出现在特定分类下的模板（如表格/中·小学生）。
CATEGORIES = [
    ("热门", ""),
    ("简洁", "jianjie"),
    ("应届生", "yingjiesheng"),
    ("左右分栏", "zuoyou"),
    ("考研复试", "kaoyan"),
    ("表格", "table"),
    ("程序员", "chengxuyuan"),
    ("英文", "english"),
    ("中/小学生", "student"),
]

# 输出目录与文件（相对脚本所在目录，因此数据会落在 D 盘）
IMAGE_DIR = "images"
OUTPUT_JSON = "templates.json"

# 请求参数（礼貌抓取）
REQUEST_INTERVAL = 1.5          # 页面请求间隔（秒）
IMAGE_DOWNLOAD_INTERVAL = 0.5   # 图片下载间隔（秒）
REQUEST_TIMEOUT = 15            # 请求超时（秒）
MAX_RETRIES = 2                 # 图片下载失败重试次数
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
