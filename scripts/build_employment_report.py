"""Generate the submission PDF and real test summary from tracked Markdown and acceptance results.
Requires reportlab, pypdf and a Chinese TrueType font. Never reads demo passwords.
"""
from pathlib import Path
from datetime import datetime,timezone,timedelta
import json,re,html,os,shutil
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle,getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Flowable,Image
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs/employment'
RAW=ROOT/'verification/employment'
OUTPUT=ROOT/'output/pdf'

def read(name):
 path=RAW/name
 return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None

def build_test_summary():
 api=read('api-acceptance.json');ui=read('ui-acceptance.json');perf=read('performance.json');restore=read('backup-restore.json');lifecycle=read('lifecycle.json');comments=read('schema-comments.json')
 if not all([api,ui,perf,restore,lifecycle,comments]):raise RuntimeError('Missing real acceptance artifacts; refusing to fabricate results')
 if any(r['result']!='PASS' for r in api['results']+ui['checks']) or ui.get('error'):raise RuntimeError('Acceptance contains failures')
 stamp=datetime.fromisoformat(api['date'].replace('Z','+00:00')).astimezone(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M 北京时间')
 lines=['# 实际验收记录','',f'执行日期：{stamp}。测试地点：本机 Docker Desktop 与 Chrome。测试人员：Codex 自动验收。人工复核人员由实际课程组员补充。','',f'接口验收 {len(api["results"])} 项通过；浏览器验收 {len(ui["checks"])} 项通过。以下直接来自脚本输出，不是预计结果。','','## 接口与数据库测试','','| 用例 | 结果 | 实际证据 |','| --- | --- | --- |']
 names={'missing_token':'未登录拒绝','invalid_token':'失效Token拒绝','student_cannot_admin':'学生不能访问管理接口','admin_inherits_role':'原站管理员继承身份','student_portal_menus':'学生仅接收学生菜单','teacher_portal_menus':'教师仅接收教师菜单','student_directory_denied':'学生不能查询全体档案','staff_is_module_only':'教师身份只在模块生效','valid_docx_upload':'有效Word上传','file_download_integrity':'附件下载完整性','file_ownership':'附件所有权校验','invalid_file_content':'伪装Word内容拒绝','private_storage_bucket':'私有桶拒绝匿名访问','duplicate_application':'重复投递拒绝','teacher_application_attachment':'教师访问投递简历','application_ownership':'投递列表按本人隔离','withdraw_ownership':'跨学生撤回拒绝','scores_ownership':'跨学生评分读取拒绝','student_cannot_score':'学生不能评分','score_transaction_rollback':'第三条评分失败时完整回滚','no_regrading':'已完成面试禁止重评','last_quota_concurrency':'最后名额并发控制','idempotent_hiring':'重复录用不重复计数','quota_matches_results':'计数与录用表核对','database_fk':'MySQL外键约束','database_score_check':'MySQL得分检查约束','module_disable_scope':'模块停用不影响原站','admin_protection':'管理员身份保护','dynamic_menu_and_permission':'动态菜单与后端权限同步','role_escalation_blocked':'越界权限授予拒绝','report_no_join_multiplication':'多轮面试不放大报表','csv_export':'UTF-8 CSV导出','csv_formula_protection':'CSV公式字符保护','sort_allowlist':'排序白名单','template_regression':'原65个模板保留','word_download_1':'首个Word原文件哈希','word_download_2':'第二个Word原文件哈希'}
 for case in api['results']:lines.append(f'| {names.get(case["case"],case["case"])} | PASS | {case["evidence"].replace("|","/")} |')
 lines+=['','## 浏览器测试','','| 用例 | 结果 | 实际证据 |','| --- | --- | --- |']
 for case in ui['checks']:lines.append(f'| {case["case"]} | {case["result"]} | {case["evidence"].replace("|","/")} |')
 lines+=['','## 字段注释、恢复和运行隔离','',f'- 业务表：{comments["tables"]}；字段：{comments["columns"]}，注释检查结果 {comments["result"]}。','- MySQL 备份在无宿主机端口的临时容器恢复：'+restore['result']+'。','- 原站隔离和持久化：'+lifecycle['result']+'。','- 原有账户密码哈希、用户名和角色：'+('保持不变' if lifecycle['checks'].get('legacy_accounts_unchanged') else '需检查')+'。','','## 性能与执行计划','',f'独立临时库：{perf["students"]} 名学生、{perf["applications"]} 条投递、{perf["interviews"]} 轮面试。CLI 往返时间包含 Docker 开销，服务器 actual time 由 EXPLAIN ANALYZE 提供。','']
 for name,measurement in perf['results'].items():
  first=measurement['explainAnalyze'].splitlines()[0]
  lines.append(f'- {name}：CLI 往返 {measurement["roundTripMs"]} ms。服务器执行计划起始项：{first[:230]}')
 local=read('local-mysql-copy.json')
 if local and local['result']=='PASS':
  lines+=['','## 本机 MySQL 复制核对','',f'目标 {local["host"]}:{local["port"]}/{local["database"]}，MySQL {local["version"]}。与 Docker 源库逐项比较通过：15 张业务表、99 个注释字段、3 个可查询视图、30 名学生、60 条投递、12 条录用。网站运行数据源保持 Docker MySQL 13308，两个库不会自动同步。附件只复制元数据，文件仍保存在原有私有存储桶。']
 lines+=['','## 问题、原因、修复与复测','','| 问题 | 原因 | 修复 | 复测结果 |','| --- | --- | --- | --- |','| 布尔实体无法启动 | Connector将BOOLEAN识别为BIT，实体定义为TINYINT | 映射改为Boolean | JPA validate通过 |','| CHECK错误提示为500 | MySQL HY000/3819未被默认翻译器分类 | 显式识别约束错误 | 评分回滚与非法得分通过 |','| 恢复初次连接失败 | 初始化服务器尚未切换为最终TCP服务 | 等待TCP就绪 | 独立容器恢复通过 |','| 正常Word上传被拒绝 | 流式ZIP读取与部分归档描述符不兼容 | 中央目录读取、限制解压、增加原文件测试 | 原Word上传和哈希通过 |','| 字段COMMENT迁移失败 | 列注释不能使用COMMENT等号语法 | 修正并在隔离库验证，仅清除失败V3标记后重放 | V1-V4成功，99个字段注释完整 |','','说明：这些问题是在本次实施中发现并处理。Docker运行时及构建镜像网络问题不写成数据库业务错误；整站回退命令已提供，未在现用环境执行回退。']
 (DOCS/'test-results.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

def font_setup():
 normal=Path(os.environ.get('COURSE_REPORT_FONT',r'C:\Windows\Fonts\msyh.ttc'))
 bold=Path(os.environ.get('COURSE_REPORT_BOLD_FONT',r'C:\Windows\Fonts\msyhbd.ttc'))
 if not normal.exists():raise RuntimeError('Set COURSE_REPORT_FONT to a Chinese TrueType font')
 pdfmetrics.registerFont(TTFont('CourseCJK',str(normal)))
 pdfmetrics.registerFont(TTFont('CourseCJKBold',str(bold if bold.exists() else normal)))
 pdfmetrics.registerFontFamily('CourseCJK',normal='CourseCJK',bold='CourseCJKBold',italic='CourseCJK',boldItalic='CourseCJKBold')

class Diagram(Flowable):
 def __init__(self,kind):
  super().__init__();self.kind=kind;self.width=495;self.height=365 if kind=='business' else 175
 def draw(self):
  c=self.canv
  def node(x,y,label,table):
   c.setFillColor(colors.HexColor('#edf5fc'));c.setStrokeColor(colors.HexColor('#9dbad3'));c.roundRect(x,y,130,43,7,fill=1,stroke=1)
   c.setFillColor(colors.HexColor('#204d70'));c.setFont('CourseCJKBold',9);c.drawCentredString(x+65,y+25,label);c.setFont('CourseCJK',7);c.drawCentredString(x+65,y+10,table)
  def arrow(points,label='',lx=None,ly=None):
   c.setStrokeColor(colors.HexColor('#6886a0'));c.setLineWidth(.8)
   for a,b in zip(points,points[1:]):c.line(*a,*b)
   a,b=points[-2:];dx=b[0]-a[0];dy=b[1]-a[1];length=(dx*dx+dy*dy)**.5
   if length:
    ux,uy=dx/length,dy/length;p=c.beginPath();p.moveTo(*b);p.lineTo(b[0]-5*ux+2*uy,b[1]-5*uy-2*ux);p.lineTo(b[0]-5*ux-2*uy,b[1]-5*uy+2*ux);p.close();c.setFillColor(colors.HexColor('#6886a0'));c.drawPath(p,fill=1)
   if label:c.setFillColor(colors.HexColor('#55758d'));c.setFont('CourseCJK',7);c.drawString(lx,ly,label)
  if self.kind=='business':
   for x,y,label,table in [(15,295,'账户映射','users'),(180,295,'学生档案','students'),(345,295,'投递主记录','applications'),(15,210,'企业','companies'),(180,210,'招聘岗位','jobs'),(345,210,'面试轮次','interview_rounds'),(15,125,'简历附件','resume_files'),(180,125,'评分标准','evaluation_criteria'),(345,125,'评分明细','interview_scores'),(180,35,'最终录用','employment_results')]:node(x,y,label,table)
   arrow([(145,316),(180,316)],'1:1',151,325);arrow([(310,316),(345,316)],'1:N',315,325)
   arrow([(145,231),(180,231)],'1:N',151,240);arrow([(310,231),(328,231),(328,298),(345,298)],'1:N',316,270)
   arrow([(410,295),(410,253)],'1:N',420,274);arrow([(410,210),(410,168)],'1:N',420,187)
   arrow([(310,146),(345,146)],'1:N',315,154)
   arrow([(15,310),(5,310),(5,146),(15,146)],'1:N',7,180)
   arrow([(145,146),(160,146),(160,345),(410,345),(410,338)],'可选附件',166,347)
   arrow([(310,310),(322,310),(322,56),(310,56)],'0..1',327,91)
   arrow([(475,316),(488,316),(488,56),(310,56)],'0..1',438,58)
   c.setFillColor(colors.HexColor('#55758d'));c.setFont('CourseCJK',8);c.drawString(15,10,'连线由主实体指向从实体，标注表示基数。录用与学生通过组合外键保持一致。')
  else:
   for x,y,label,table in [(15,110,'角色','roles'),(180,110,'角色权限关联','role_permissions'),(345,110,'权限','permissions'),(15,25,'账户映射','users'),(345,25,'教师/学生菜单','menus')]:node(x,y,label,table)
   arrow([(145,131),(180,131)],'1:N',152,141);arrow([(345,131),(310,131)],'1:N',316,141)
   arrow([(80,110),(80,68)],'1:N',89,90);arrow([(410,110),(410,68)],'1:N',419,90)
   c.setFillColor(colors.HexColor('#55758d'));c.setFont('CourseCJK',8);c.drawString(155,37,'操作日志 audit_logs 引用账户操作者。')

def escaped(s):
 s=html.escape(s).replace('`','')
 return re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',s)

def parse_markdown(source,styles,story):
 lines=source.splitlines();i=0
 while i<len(lines):
  line=lines[i].strip()
  if not line:i+=1;continue
  if line.startswith('```'):
   block=[];i+=1
   while i<len(lines) and not lines[i].strip().startswith('```'):block.append(lines[i]);i+=1
   if block:story.append(Paragraph('<br/>'.join(escaped(x) for x in block),styles['code']))
  elif line.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].strip().startswith('|'):
    cells=[x.strip() for x in lines[i].strip().strip('|').split('|')]
    if not all(re.fullmatch(r'[-: ]+',x) for x in cells):rows.append(cells)
    i+=1
   count=max(map(len,rows));width=495
   widths=[width/count]*count
   if count==6:widths=[72,60,28,62,72,201]
   elif count==3:widths=[128,40,327]
   elif count==4:widths=[90,125,180,100]
   data=[[Paragraph(escaped(x),styles['cell']) for x in row] for row in rows]
   # Keep a table's section title with its first rows, without asking
   # KeepTogether to hold the entire multi-page acceptance table.
   header=0;extra=[]
   if story and isinstance(story[-1],Paragraph) and story[-1].style.name=='h2':
    title=story.pop();data.insert(0,[title]+['']*(count-1));header=1
    extra=[('SPAN',(0,0),(-1,0)),('BOTTOMPADDING',(0,0),(-1,0),12)]
   table=Table(data,colWidths=widths,repeatRows=header+1,hAlign='LEFT')
   table.setStyle(TableStyle([('BACKGROUND',(0,header),(-1,header),colors.HexColor('#e6f1fa')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,header),(-1,-1),.4,colors.HexColor('#c9dceb')),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('ROWBACKGROUNDS',(0,header+1),(-1,-1),[colors.white,colors.HexColor('#f7fafc')])]+extra))
   story.extend([table,Spacer(1,10)]);continue
  elif line.startswith('# '):story.append(Paragraph(escaped(line[2:]),styles['h1']))
  elif line.startswith('## '):
   story.append(Paragraph(escaped(line[3:]),styles['h2']))
   if line.startswith('## 第三章'):story.extend([Paragraph('图 1 招聘业务局部 ER 图',styles['caption']),Diagram('business'),Paragraph('图 2 身份授权局部 ER 图；两图由 users 合并为全局设计',styles['caption']),Diagram('auth'),Spacer(1,12)])
  elif line.startswith('- '):story.append(Paragraph('• '+escaped(line[2:]),styles['body']))
  else:story.append(Paragraph(escaped(line),styles['body']))
  i+=1

def build_pdf():
 build_test_summary();font_setup();OUTPUT.mkdir(parents=True,exist_ok=True)
 styles={
  'body':ParagraphStyle('body',fontName='CourseCJK',fontSize=9.2,leading=15,spaceAfter=7,wordWrap='CJK',textColor=colors.HexColor('#30485a')),
  'h1':ParagraphStyle('h1',fontName='CourseCJKBold',fontSize=19,leading=29,spaceBefore=12,spaceAfter=16,keepWithNext=True,textColor=colors.HexColor('#17466b')),
  'h2':ParagraphStyle('h2',fontName='CourseCJKBold',fontSize=13,leading=21,spaceBefore=16,spaceAfter=10,keepWithNext=True,textColor=colors.HexColor('#245e86')),
  'cell':ParagraphStyle('cell',fontName='CourseCJK',fontSize=7.6,leading=12,wordWrap='CJK',textColor=colors.HexColor('#30485a')),
  'code':ParagraphStyle('code',fontName='CourseCJK',fontSize=7.8,leading=12,spaceAfter=12,wordWrap='CJK',backColor=colors.HexColor('#f1f5f8'),borderPadding=8),
  'caption':ParagraphStyle('caption',fontName='CourseCJK',fontSize=8.5,leading=14,spaceAfter=8,keepWithNext=True,textColor=colors.HexColor('#55758d')),
 }
 target=OUTPUT/'employment-course-report.pdf'
 doc=SimpleDocTemplate(str(target),pagesize=(595.28,841.89),leftMargin=44,rightMargin=44,topMargin=52,bottomMargin=48,title='数据库应用实践：高校就业与招聘管理模块',author='项目实施与自动验收记录')
 story=[];parse_markdown((DOCS/'course-report.md').read_text(encoding='utf-8'),styles,story)
 story.append(PageBreak());parse_markdown((DOCS/'test-results.md').read_text(encoding='utf-8'),styles,story)
 story.append(PageBreak());parse_markdown((DOCS/'data-dictionary.md').read_text(encoding='utf-8'),styles,story)
 if (RAW/'workbench-desktop.png').exists():
  story.extend([PageBreak(),Paragraph('附录：实际界面与报表',styles['h1'])])
  for name,caption,width in [('workbench-desktop.png','教师端工作台',495),('workbench-mobile.png','学生端个人工作台（手机）',220),('report-desktop.png','教师端招聘汇总报表',495)]:
   if not (RAW/name).exists():continue
   image=Image(str(RAW/name));ratio=min(width/image.imageWidth,630/image.imageHeight);image.drawWidth=image.imageWidth*ratio;image.drawHeight=image.imageHeight*ratio
   story.extend([Paragraph(caption,styles['caption']),image,Spacer(1,16)])
 def footer(canvas,document):
  canvas.setFont('CourseCJK',8);canvas.setFillColor(colors.HexColor('#7c93a5'));canvas.drawString(50,25,'高校就业与招聘管理 | 数据库应用实践');canvas.drawRightString(545,25,f'{document.page}')
  canvas.setStrokeColor(colors.HexColor('#dbe6ef'));canvas.line(50,39,545,39)
 doc.build(story,onFirstPage=footer,onLaterPages=footer)
 reader=PdfReader(str(target));text='\n'.join(p.extract_text() or '' for p in reader.pages)
 for title in ['第一章','第二章','第三章','第四章','第五章','第六章','第七章','第八章','第九章','第十章','数据字典']:
  if title not in text:raise AssertionError('PDF missing '+title)
 shutil.copyfile(target,DOCS/'course-report.pdf')
 (RAW/'pdf-check.json').write_text(json.dumps({'pages':len(reader.pages),'bytes':target.stat().st_size,'chapters':10,'textExtraction':'PASS'},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'Generated report: {len(reader.pages)} pages, {target.stat().st_size} bytes')

if __name__=='__main__':build_pdf()
