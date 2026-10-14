"""Refresh ONLY manifest-listed DEMO records with plausible, explicitly fictional campus cases."""
import json
from employment_acceptance import ROOT,MANIFEST,OUT,sql

NAMES=['陈雨桐','林思远','周子涵','王梓晨','刘欣怡','李泽宇','赵佳宁','张昊然','黄诗雅','徐晨曦','孙语桐','吴嘉禾','郑安琪','何宇航','高若溪','梁俊熙','宋悦宁','许知远','唐芷晴','冯逸凡','韩沐阳','蒋书瑶','邓一诺','谢承安','曹雨薇','彭嘉乐','曾可欣','潘明轩','杜思齐','袁清和']
COMPANIES=[
 ('晨星数智科技有限公司（示例）','软件与信息服务','杭州','计算机学院','软件工程','林经理；hr@chenxing.example','面向中小企业提供数字化工具，设置导师带教与代码评审。'),
 ('仁和医疗健康服务中心（示例）','医疗健康','南京','护理学院','护理学','王老师；recruit@renhe.example','提供社区护理与健康管理，重视规范操作、患者沟通和岗位培训。'),
 ('启航教育咨询有限公司（示例）','教育服务','武汉','教育学院','教育技术学','刘主管；jobs@qihang.example','开展课程设计与学习服务，关注内容质量和教学反馈。'),
 ('华创精密制造有限公司（示例）','智能制造','苏州','机电工程学院','机械设计制造及其自动化','陈经理；hr@huachuang.example','从事精密零件制造，采用质量追溯和生产改善流程。'),
 ('汇诚企业服务有限公司（示例）','企业财务服务','成都','经济管理学院','会计学','赵主管；campus@huicheng.example','为企业提供财务与客户支持，要求遵守流程与保密规范。'),
 ('青禾文化传媒有限公司（示例）','文化传媒','上海','传媒学院','数字媒体艺术','周经理；hr@qinghe.example','服务品牌内容与视觉传播，通过项目实践培养应届毕业生。'),
 ('橙光电子商务有限公司（示例）','电子商务','深圳','管理学院','电子商务','许主管；jobs@chengguang.example','开展电商店铺和用户运营，以业务数据与服务反馈改进流程。'),
 ('远景建筑设计事务所（示例）','建筑设计','西安','建筑学院','建筑学','孙老师；recruit@yuanjing.example','承担建筑设计与工程协调，重视图纸规范和跨专业沟通。'),
 ('顺达供应链管理有限公司（示例）','物流与供应链','广州','交通运输学院','物流管理','李经理；hr@shunda.example','提供仓配与供应链服务，关注交付、库存和运营指标。'),
 ('博研技术服务有限公司（示例）','科研技术服务','合肥','理学院','应用化学','张老师；campus@boyan.example','开展实验与技术支持，执行实验记录、设备维护和样品管理流程。'),
]
REQUIREMENTS=[
 ('前端开发工程师','使用React维护业务页面，配合后端联调接口，参与代码评审。','本科及以上，掌握JavaScript和HTTP基础，提供课程项目或实习作品。','9000-14000'),
 ('数据分析助理','整理业务数据，编写SQL查询，维护指标报表并解释异常。','掌握SQL与Excel，能够说明统计口径，具备认真核对数据的习惯。','7000-11000'),
 ('护理岗位','在带教指导下完成护理记录、健康教育和患者沟通，遵守操作规程。','护理相关专业，满足入职所需资格条件，具备沟通与团队协作能力。','6000-9000'),
 ('医学检验助理','协助样本登记、实验准备和结果核对，记录设备使用情况。','医护或检验相关专业，熟悉实验基本操作，重视质量与安全。','6000-8500'),
 ('教学助理','整理课堂材料与学习反馈，协助活动组织和教学评价。','教育相关专业，表达清晰，能够使用办公软件并按时完成任务。','5500-8000'),
 ('课程运营','维护课程安排与学习服务，汇总反馈并协助优化流程。','具备文字整理和沟通能力，愿意学习教育产品和运营方法。','6000-9000'),
 ('自动化工程师','协助设备调试、程序维护与故障排查，形成现场记录。','机电或自动化相关专业，具备电气和控制基础，能够阅读技术资料。','8000-12000'),
 ('质量管理助理','协助检验、质量追溯与问题分析，维护作业规范和台账。','机械相关专业，细致负责，掌握基础数据分析与文档整理方法。','6500-9500'),
 ('财务助理','协助票据核对、费用审核和月度报表，按流程整理资料。','财会相关专业，熟悉表格软件，理解会计基础与保密要求。','5500-8000'),
 ('客户服务专员','记录客户需求与处理过程，配合业务部门跟进反馈。','沟通耐心，能够准确记录信息，熟悉常用办公工具。','5000-7500'),
 ('内容编辑','采集选题、撰写与校对文稿，复盘内容反馈。','文字表达扎实，具备信息核对习惯，提供写作或媒体作品。','6500-10000'),
 ('视觉设计助理','协助海报、界面与品牌物料设计，按规范整理源文件。','数字媒体相关专业，掌握设计工具，能够说明作品的设计依据。','7500-11000'),
 ('电商运营助理','维护商品资料、整理运营指标，配合活动执行与复盘。','电商或管理相关专业，熟悉表格工具，具备用户和数据意识。','6000-9500'),
 ('产品运营助理','收集用户反馈，维护内容与活动，协助制定改进方案。','逻辑清晰，能够沟通跨部门需求，愿意学习产品与运营流程。','7000-10000'),
 ('工程助理','整理工程进度、会议纪要与资料，协助协调现场问题。','建筑相关专业，具备图纸阅读与文档整理基础。','6500-9000'),
 ('建筑设计助理','协助建模、图纸表达与设计说明，按要求修订方案。','建筑学相关专业，掌握制图工具，提供课程设计作品。','7000-11000'),
 ('物流运营专员','跟进运输与仓配进度，整理时效和异常情况。','物流相关专业，能够使用表格工具，沟通主动且执行认真。','5500-8000'),
 ('供应链助理','协助采购、库存核对与供应商资料维护，汇总运营数据。','物流管理相关专业，掌握数据整理方法，理解交付与协作流程。','6500-9500'),
 ('实验助理','协助样品登记、实验操作与记录核对，遵守实验室规范。','理工科相关专业，具备实验课程基础，重视记录完整和安全。','6000-9000'),
 ('科研行政助理','整理项目材料、会议与经费资料，协助实验室日常协调。','文档整理能力良好，沟通细致，熟悉科研项目管理基本流程。','5500-8000'),
]

def quote(value):return "'"+str(value).replace('\\','\\\\').replace("'","''")+"'"

def refresh():
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 if not (len(manifest['companies'])==10 and len(manifest['jobs'])==20 and len(manifest['students'])==30):raise ValueError('Unexpected demo manifest')
 statements=['START TRANSACTION;']
 for i,key in enumerate(manifest['companies']):
  name,industry,city,college,major,contact,description=COMPANIES[i]
  statements.append(f"UPDATE companies SET name={quote(name)},industry={quote(industry)},contact={quote(contact)},description={quote('【课程虚构案例】'+description)} WHERE id={int(key)} AND code={quote(f'DEMO-C{i+1:03}')};")
  for j in range(2):
   jid=int(manifest['jobs'][i*2+j]);title,responsibility,requirement,salary=REQUIREMENTS[i*2+j]
   content=f'【课程虚构岗位，薪酬为教学设定，不代表市场报价】岗位职责：{responsibility}\n任职条件：{requirement}\n工作地点：{city}。样例薪酬：{salary}元/月。培养安排：导师带教、阶段反馈、毕业后按约定入职。'
   statements.append(f'UPDATE jobs SET title={quote(title)},category={quote(industry)},city={quote(city)},description={quote(content)} WHERE id={jid} AND company_id={int(key)};')
 for i,student in enumerate(manifest['students']):
  sid=int(student['id']);company=COMPANIES[i%10];name=NAMES[i];contact=f'课程样例邮箱：student{i+1:02}@campus.example'
  statements.append(f"UPDATE students SET full_name={quote(name)},college={quote(company[3])},major={quote(company[4])},contact={quote(contact)} WHERE id={sid} AND student_no={quote(f'DEMO2027{i+1:03}')};")
  apps=sorted([a for a in manifest['applications'] if a['student']==i],key=lambda a:a['slot'])
  original=sql(f'SELECT id,job_id FROM applications WHERE student_id={sid} ORDER BY id;').stdout.strip().splitlines()
  existing={int(line.split('\t')[0]):int(line.split('\t')[1]) for line in original}
  if len(apps)!=2:raise ValueError('Unexpected student applications')
  targets=[int(manifest['jobs'][(i%10)*2+j]) for j in range(2)]
  order=[1,0] if targets[0]==existing[int(apps[1]['id'])] else [0,1]
  for j in order:
   key=int(apps[j]['id']);note=f'【课程样例】{name}希望应聘{REQUIREMENTS[(i%10)*2+j][0]}，具有相关课程实践经历，愿意参加面试并接受导师指导。'
   statements.append(f'UPDATE applications SET job_id={targets[j]},note={quote(note)} WHERE id={key} AND student_id={sid};')
  for app in apps:
   feedback=f'【课程样例评价】{name}能够清楚描述课程项目和学习经历。建议进一步量化实践成果，结合岗位要求举例说明沟通与专业能力。'
   statements.append(f"UPDATE interview_rounds SET location={quote(company[2]+' · 企业会议室/线上会议（模拟）')},interviewer={quote(['张老师与林经理','李老师与王主管','陈老师与刘经理'][i%3])},comment=IF(status='COMPLETED',{quote(feedback)},comment) WHERE application_id={int(app['id'])};")
 for key in manifest['jobs']:
  statements.append(f'UPDATE jobs SET filled_count=(SELECT COUNT(*) FROM employment_results er JOIN applications a ON a.id=er.application_id WHERE a.job_id={int(key)}) WHERE id={int(key)};')
 statements.append('COMMIT;')
 sql('\n'.join(statements))
 (OUT/'realistic-samples.json').write_text(json.dumps({'result':'PASS','scope':'Only manifest-listed DEMO records','names':30,'companies':10,'jobs':20,'applications':60,'source':'Generated fictional campus cases; no real personal contact data'},ensure_ascii=False,indent=2),encoding='utf-8')
 print('Refreshed 30 fictional students, 10 companies, 20 realistic job descriptions and matching applications.')

if __name__=='__main__':refresh()
