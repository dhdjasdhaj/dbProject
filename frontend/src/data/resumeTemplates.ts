export type ResumeTemplateId = 'minimal' | 'technical' | 'creative' | 'management';

export interface ResumeTemplateSection {
  key: string;
  label: string;
  /** 模板默认正文（用户可在编辑器中覆盖） */
  defaultValue: string;
}

export interface ResumeTemplate {
  id: ResumeTemplateId;
  name: string;
  summary: string;
  /** 卡片角标/风格提示 */
  tag: string;
  sections: ResumeTemplateSection[];
}

function baseSections(overrides: Partial<Record<string, string>>): ResumeTemplateSection[] {
  const defs: ResumeTemplateSection[] = [
    {
      key: 'profile',
      label: '个人信息',
      defaultValue:
        overrides.profile ??
        '姓名：\n手机：\n邮箱：\n求职意向：\n现居城市：'
    },
    {
      key: 'summary',
      label: '个人简介',
      defaultValue:
        overrides.summary ??
        '用 3～5 句话概括你的优势、经验年限与擅长方向。'
    },
    {
      key: 'experience',
      label: '工作经历',
      defaultValue:
        overrides.experience ??
        '公司 · 职位 · 时间\n- 负责…\n- 成果（尽量量化）\n\n公司 · 职位 · 时间\n- …'
    },
    {
      key: 'projects',
      label: '项目经历',
      defaultValue:
        overrides.projects ??
        '项目名 · 角色 · 时间\n- 背景与目标\n- 技术方案 / 关键难点\n- 结果指标\n'
    },
    {
      key: 'education',
      label: '教育背景',
      defaultValue:
        overrides.education ?? '学校 · 专业 · 学历 · 时间\n主修课程 / 荣誉（可选）'
    },
    {
      key: 'skills',
      label: '技能与其他',
      defaultValue:
        overrides.skills ??
        '技能栈：\n语言 / 证书 / 开源贡献 / 社区（按需补充）'
    }
  ];
  return defs;
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'minimal',
    name: '极简清爽',
    summary: '信息分区清晰，适合大多数岗位投递。',
    tag: '通用',
    sections: baseSections({})
  },
  {
    id: 'technical',
    name: '工程师向',
    summary: '突出技术栈、系统设计与性能数据。',
    tag: '研发',
    sections: baseSections({
      summary: 'X 年后端/全栈经验；熟悉高并发、分布式与可观测性；擅长把业务问题抽象成稳定的技术方案。',
      experience:
        '某互联网公司 · 高级后端工程师 · 20XX.XX - 至今\n- 负责核心交易链路，峰值 QPS xxx，P99 延迟优化 xx%\n- 推动缓存/消息队列治理，故障率下降 xx%\n\n某创业公司 · 后端工程师 · 20XX.XX - 20XX.XX\n- 从 0 到 1 搭建服务与 CI/CD；主导数据库建模与接口规范',
      projects:
        '订单结算系统 · Owner · 20XX\n- 背景：活动大促期间结算延迟与一致性问题\n- 方案：异步化 + 幂等 + 对账补偿；引入链路追踪\n- 结果：结算耗时 P99 从 xxms 降到 xxms；0 资金差错事件',
      skills: '语言：Java / Go / TypeScript\n中间件：MySQL、Redis、Kafka、Elasticsearch\n工程：Docker、K8s、Prometheus、Grafana、JUnit'
    })
  },
  {
    id: 'creative',
    name: '创意表达',
    summary: '语气更活泼，适合互联网产品、设计、运营等岗位。',
    tag: '产品 / 设计',
    sections: baseSections({
      summary: '我相信好的协作来自清晰目标与快速迭代。擅长把复杂需求拆成可交付里程碑，并用数据验证假设。',
      experience:
        '某产品团队 · 产品负责人 · 20XX - 至今\n- 主导 xx 功能从调研到上线，DAU +xx%\n- 建立需求评审模板与埋点规范，迭代周期缩短 xx%',
      projects:
        '增长实验平台 · PM · 20XX\n- 目标：提升新用户激活率\n- 动作：漏斗分析 + A/B 实验矩阵\n- 结果：激活率 +xx%（统计显著）'
    })
  },
  {
    id: 'management',
    name: '管理导向',
    summary: '强调团队规模、业务结果与跨部门协同。',
    tag: '管理',
    sections: baseSections({
      summary: 'X 年团队管理经验；擅长目标拆解、人才梯队与跨部门推进；关注业务结果与组织效率的平衡。',
      experience:
        '某事业部 · 研发经理 · 20XX - 至今\n- 管理 xx 人团队，负责 xx 业务线交付与稳定性\n- 通过 OKR/复盘机制，关键项目按期率提升至 xx%\n\n某公司 · Tech Lead · 20XX - 20XX\n- 带领 xx 人小组完成核心系统重构，故障下降 xx%',
      projects:
        '研发效能提升专项 · 负责人\n- 痛点：需求排队、发布风险高\n- 方案：分层排期 + 灰度发布 + 质量门禁\n- 结果：交付周期 -xx%；线上缺陷 -xx%'
    })
  }
];

export function getResumeTemplateById(id: string): ResumeTemplate | undefined {
  return RESUME_TEMPLATES.find(t => t.id === id);
}

export function defaultSectionsMap(template: ResumeTemplate): Record<string, string> {
  return Object.fromEntries(template.sections.map(s => [s.key, s.defaultValue]));
}
