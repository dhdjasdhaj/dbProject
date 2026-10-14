import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { BriefcaseBusiness, ArrowUpRight, Plus, Search, RefreshCw, Download, Printer, X, ShieldCheck, Check, FileText, Building2, Users, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { courseApi, type CourseUser, type Menu, type Row, type Page } from './api';
import { getStoredToken } from '../authStorage';
import EmploymentDock from './EmploymentDock';
import './employment.css';

type Field = { key: string; label: string; type?: string; required?: boolean; locked?: boolean; max?: number; min?: number; options?: { value: string; label: string }[] };
type Editor = { title: string; path: string; method?: 'put' | 'post'; fields: Field[]; data?: Row };
function JobDetails({ row, close }: { row: Row; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="employment-dialog" onCancel={close}>
    <div className="employment-dialog-heading"><div><small>JOB OPPORTUNITY</small><h2>{String(row.title)}</h2></div><button onClick={close} aria-label="关闭"><X size={21} /></button></div>
    <div className="employment-job-details"><p>{String(row.companyName)} · {String(row.city)} · {String(row.category)}</p><p>招聘 {text(row.plannedCount)} 人，已录用 {text(row.filledCount)} 人</p><p className="employment-job-description">{String(row.description || '暂无岗位说明')}</p><p>投递截止：{text(row.deadline)}</p></div>
    <footer><button className="primary" onClick={close}>我知道了</button></footer>
  </dialog>;
}
const roleNames = { USER: '学生', STAFF: '教师', ADMIN: '管理员' };
const labels: Record<string, string> = {
  id: '编号', username: '账户', moduleRole: '模块身份', role: '原站身份', studentNo: '学号', fullName: '姓名', college: '学院', major: '专业', graduationYear: '毕业年份', contact: '联系方式', profileState: '档案状态',
  code: '企业代码', name: '名称', industry: '行业', description: '说明', enabled: '启用状态', title: '岗位名称', companyName: '企业', category: '岗位类别', city: '城市', plannedCount: '招聘名额', filledCount: '已录用', remainingCount: '剩余名额', deadline: '截止时间', status: '状态',
  jobTitle: '岗位', note: '说明', submittedAt: '投递时间', roundNo: '轮次', scheduledAt: '面试时间', location: '地点', interviewer: '面试官', totalScore: '总分', latestScore: '最新得分', comment: '评价', confirmedAt: '录用时间', startDate: '入职日期', remarks: '备注',
  applicationCount: '投递数', interviewCount: '完成面试人数', hiredCount: '录用人数', employmentId: '录用编号', originalName: '附件名称', fileSize: '字节数', action: '操作', resourceType: '对象类型', resourceId: '对象编号', detail: '内容', createdAt: '创建时间',
  submitted: '投递总数', reviewed: '已审核', interviewed: '完成面试', hired: '已录用', score: '得分', maxScore: '项目上限', applicationId: '投递编号', companyId: '企业编号', resumeFileId: '附件编号', completedAt: '评分时间',
};
const states: Record<string, string> = { OPEN: '开放', CLOSED: '关闭', ARCHIVED: '归档', SUBMITTED: '已提交', REVIEWING: '审核中', INTERVIEWING: '面试中', ACCEPTED: '已录用', REJECTED: '未通过', WITHDRAWN: '已撤回', SCHEDULED: '待进行', COMPLETED: '已完成', CANCELLED: '已取消', DRAFT: '待完善', COMPLETE: '已完善', USER: '学生', STAFF: '教师', ADMIN: '管理员' };
const num = (row: Row, key: string) => Number(row[key] || 0);
const truth = (value: unknown) => value === true || value === 1;
const text = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '启用' : '停用';
  const s = String(value); if (states[s]) return states[s];
  if (/^\d{4}-\d\d-\d\dT/.test(s)) return new Date(s).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  return s;
};
const localDate = (value: unknown) => {
  if (!value) return ''; const date = new Date(String(value)); if (isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const studentFields: Field[] = [
  { key: 'studentNo', label: '学号', required: true, max: 32 }, { key: 'fullName', label: '姓名', required: true, max: 64 },
  { key: 'college', label: '学院', required: true, max: 100 }, { key: 'major', label: '专业', required: true, max: 100 },
  { key: 'graduationYear', label: '毕业年份', type: 'number', required: true, min: 2000, max: 2100 }, { key: 'contact', label: '联系方式', max: 100 },
];
const companyFields: Field[] = [
  { key: 'code', label: '企业代码', required: true, max: 32 }, { key: 'name', label: '企业名称', required: true, max: 120 },
  { key: 'industry', label: '所属行业', required: true, max: 64 }, { key: 'contact', label: '联系信息', required: true, max: 100 },
  { key: 'description', label: '企业说明', type: 'textarea', max: 5000 }, { key: 'enabled', label: '允许发布招聘岗位', type: 'checkbox' },
];
const jobFields: Field[] = [
  { key: 'companyId', label: '所属企业（创建后不可变更）', type: 'number', required: true, min: 1 },
  { key: 'title', label: '岗位名称', required: true, max: 120 }, { key: 'category', label: '岗位类别', required: true, max: 64 },
  { key: 'city', label: '工作城市', required: true, max: 64 }, { key: 'plannedCount', label: '招聘名额', type: 'number', required: true, min: 1, max: 100000 },
  { key: 'deadline', label: '截止时间', type: 'datetime-local', required: true },
  { key: 'status', label: '岗位状态', required: true, options: ['OPEN', 'CLOSED', 'ARCHIVED'].map(value => ({ value, label: states[value] })) },
  { key: 'description', label: '岗位要求', type: 'textarea', required: true, max: 5000 },
];

function EditorDialog({ editor, close, saved }: { editor: Editor; close: () => void; saved: () => void }) {
  const [data, setData] = useState<Row>(editor.data || {}), [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const payload: Row = {};
    for (const f of editor.fields) {
      const value = data[f.key];
      if (f.type === 'checkbox') payload[f.key] = truth(value);
      else if (f.type === 'number') payload[f.key] = value === '' || value == null ? null : Number(value);
      else if (f.type === 'datetime-local') payload[f.key] = value ? new Date(String(value)).toISOString() : null;
      else payload[f.key] = value ?? '';
    }
    setBusy(true);
    try { await courseApi[editor.method || 'post'](editor.path, payload); toast.success('已保存'); saved(); close(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="employment-dialog" onCancel={e => { if (busy) e.preventDefault(); else close(); }}>
    <form onSubmit={submit}>
      <div className="employment-dialog-heading"><div><small>EMPLOYMENT CENTER</small><h2>{editor.title}</h2></div><button type="button" aria-label="关闭" disabled={busy} onClick={close}><X size={21} /></button></div>
      <div className="employment-form">
        {editor.fields.map(f => <label key={f.key} className={f.type === 'textarea' ? 'wide' : ''}>
          <span>{f.label}{f.required && <b> *</b>}</span>
          {f.type === 'hidden' ? <input type="hidden" value={String(data[f.key] || '')} /> : f.options ? <select required={f.required} disabled={f.locked} value={String(data[f.key] || '')} onChange={e => setData({ ...data, [f.key]: e.target.value })}><option value="">{f.required ? '请选择' : '不使用附件'}</option>{f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : f.type === 'textarea' ? <textarea rows={4} maxLength={f.max} required={f.required} value={String(data[f.key] || '')} onChange={e => setData({ ...data, [f.key]: e.target.value })} />
              : f.type === 'checkbox' ? <input type="checkbox" checked={truth(data[f.key])} onChange={e => setData({ ...data, [f.key]: e.target.checked })} />
                : <input type={f.type || 'text'} required={f.required} min={f.min} max={f.type === 'number' ? f.max : undefined} maxLength={f.type !== 'number' ? f.max : undefined} value={f.type === 'datetime-local' ? localDate(data[f.key]) : String(data[f.key] ?? '')} onChange={e => setData({ ...data, [f.key]: e.target.value })} />}
        </label>)}
      </div>
      <footer><button type="button" disabled={busy} onClick={close}>取消</button><button className="primary" disabled={busy}>{busy ? '保存中…' : '确认保存'}</button></footer>
    </form>
  </dialog>;
}

function Table({ rows, columns, actions }: { rows: Row[]; columns: string[]; actions?: (row: Row) => React.ReactNode }) {
  return <div className="employment-table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{labels[c] || c}</th>)}{actions && <th className="employment-action-column">操作</th>}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={String(row.id || i)}>{columns.map(c => <td key={c}>{['status', 'profileState', 'moduleRole'].includes(c) ? <span className={`employment-state state-${String(row[c])}`}>{text(row[c])}</span> : text(row[c])}</td>)}{actions && <td><div className="employment-row-actions">{actions(row)}</div></td>}</tr>)}</tbody></table>
    {!rows.length && <div className="employment-empty"><FileText size={30} /><strong>暂无记录</strong><span>可以调整筛选条件，或完成新的业务操作。</span></div>}
  </div>;
}

export default function EmploymentPage() {
  const location = useLocation(), parts = location.pathname.split('/'), portal = parts[2];
  const tab = ['teacher', 'student'].includes(portal) ? parts[3] || 'dashboard' : portal || 'dashboard';
  const [user, setUser] = useState<CourseUser | null>(null), [menus, setMenus] = useState<Menu[]>([]), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [rows, setRows] = useState<Row[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(0);
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [report, setReport] = useState('jobs');
  const [extra, setExtra] = useState<Record<string, string>>({}), [sort, setSort] = useState('id'), [direction, setDirection] = useState('desc');
  const [dashboard, setDashboard] = useState<Row>({}), [coverage, setCoverage] = useState<Row>({}), [grants, setGrants] = useState<Row[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null), [revision, setRevision] = useState(0), [mutating, setMutating] = useState(false);
  const [details, setDetails] = useState<Row | null>(null);
  const token = getStoredToken(), permission = (code: string) => !!user?.permissions.includes(code);
  const teacher = user?.portal === 'teacher', basePath = teacher ? '/employment/teacher' : '/employment/student';
  const allowedPath = !!user && portal === user.portal && (menus.some(m => m.path === location.pathname) || location.pathname === '/employment/teacher/audit' && permission('admin'));
  const refresh = () => setRevision(v => v + 1);
  const resource = tab === 'review' ? 'applications' : tab === 'my-interviews' ? 'interviews' : tab === 'my-results' || tab === 'results' ? 'employment-results' : tab;
  const params = { page, size: 20, q: search, status, sort, direction, ...extra, ...(tab === 'students' ? { profileState: status } : {}) };
  useEffect(() => {
    let alive = true; setUser(null); setMenus([]); setRows([]); setError('');
    Promise.all([courseApi.get<CourseUser>('me'), courseApi.get<Menu[]>('menus')]).then(([me, navigation]) => {
      if (alive) { setUser(me); setMenus(navigation); }
    }).catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [token, revision]);
  useEffect(() => { setPage(0); setQuery(''); setSearch(''); setStatus(tab === 'students' ? 'COMPLETE' : ''); setSort('id'); setExtra({}); setEditor(null); setDetails(null); }, [tab, report]);
  const filterKey = JSON.stringify(params);
  useEffect(() => {
    if (!user || !allowedPath) return; let alive = true; setLoading(true); setError(''); setRows([]);
    async function load() {
      if (tab === 'dashboard') return { dashboard: await courseApi.get<Row>('dashboard') };
      if (tab === 'profile') return {};
      if (tab === 'reports') {
        const [data, ratio] = await Promise.all([courseApi.get<Page>(`reports/${report}`, params), courseApi.get<Row>('reports/coverage', extra)]);
        return { data, ratio };
      }
      if (tab === 'admin') {
        const [data, permissions] = await Promise.all([courseApi.get<Page>('admin/users', { page, q: search }), courseApi.get<Row[]>('admin/permissions')]);
        return { data, permissions };
      }
      if (tab === 'audit') return { data: await courseApi.get<Page>('admin/audit', params) };
      return { data: await courseApi.get<Page>(resource, params) };
    }
    load().then(result => {
      if (!alive) return;
      if (result.data) { setRows(result.data.items); setTotal(result.data.total); }
      if (result.dashboard) setDashboard(result.dashboard);
      if (result.ratio) setCoverage(result.ratio);
      if (result.permissions) setGrants(result.permissions);
    }).catch(e => { if (alive) { setError(e.message); setTotal(0); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // Serialized filters avoid refetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, report, filterKey, resource, allowedPath]);
  const mutate = async (path: string, payload?: unknown) => {
    if (mutating) return; setMutating(true);
    try { await courseApi.post(path, payload); toast.success('操作成功'); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setMutating(false); }
  };
  const download = async (path: string, name: string, filters?: Record<string, string | number>) => { try { await courseApi.download(path, name, filters); } catch (e) { toast.error((e as Error).message); } };
  const title = menus.find(m => m.path === location.pathname)?.label || (tab === 'dashboard' ? teacher ? '教师工作台' : '学生工作台' : tab === 'audit' ? '操作记录' : '就业管理');
  const schedule = (row: Row) => setEditor({ title: '安排面试', path: 'interviews', data: { applicationId: row.id, scheduledAt: new Date(Date.now() + 86400000).toISOString() }, fields: [
    { key: 'applicationId', label: '投递记录', type: 'hidden' }, { key: 'scheduledAt', label: '面试时间', type: 'datetime-local', required: true },
    { key: 'location', label: '面试地点或会议链接', required: true, max: 200 }, { key: 'interviewer', label: '面试官', required: true, max: 64 },
  ] });
  const hire = async (row: Row) => {
    try {
      const candidates = row.id ? [] : await courseApi.get<Row[]>('options/applications');
      setEditor({ title: '登记最终录用', path: 'employment-results', data: { applicationId: row.id, startDate: new Date().toISOString().slice(0, 10) }, fields: [
        row.id ? { key: 'applicationId', label: '投递记录', type: 'hidden' } : { key: 'applicationId', label: '选择已完成面试的申请', type: 'number', required: true, options: candidates.map(c => ({ value: String(c.id), label: `${c.fullName} · ${c.companyName} · ${c.jobTitle}` })) },
        { key: 'startDate', label: '入职日期', type: 'date', required: true }, { key: 'remarks', label: '录用备注', type: 'textarea', max: 1000 },
      ] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const editJob = async (row?: Row) => {
    try {
      const companies = await courseApi.get<Row[]>('options/companies');
      if (row && !companies.some(c => c.id === row.companyId)) companies.push({ id: row.companyId, name: row.companyName });
      setEditor({ title: row ? '编辑岗位' : '新增招聘岗位', path: row ? `jobs/${row.id}` : 'jobs', method: row ? 'put' : 'post',
        fields: jobFields.map(f => f.key === 'companyId' ? { ...f, locked: !!row, options: companies.map(c => ({ value: String(c.id), label: String(c.name) })) } : f),
        data: row || { status: 'OPEN', plannedCount: 5 } });
    } catch (e) { toast.error((e as Error).message); }
  };
  const openApply = async (row: Row) => {
    try {
      const files: Row[] = []; let page = 0, data: Page;
      do { data = await courseApi.get<Page>('files', { page, size: 100 }); files.push(...data.items); page++; } while (files.length < data.total && data.items.length);
      setEditor({ title: `投递：${row.title}`, path: 'applications', data: { jobId: row.id }, fields: [
        { key: 'jobId', label: '招聘岗位', type: 'hidden' },
        { key: 'resumeFileId', label: '简历附件（可选，可在我的投递中上传）', type: 'number', options: files.map(f => ({ value: String(f.id), label: String(f.originalName) })) },
        { key: 'note', label: '求职说明', type: 'textarea', max: 1000 },
      ] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const actions = (row: Row) => {
    const id = num(row, 'id'), active = ['SUBMITTED', 'REVIEWING', 'INTERVIEWING'].includes(String(row.status));
    const attachment = row.resumeFileId ? <button onClick={() => download(`files/${row.resumeFileId}/download`, `简历附件-${row.resumeFileId}`)}><Download size={14} />附件</button> : null;
    if (tab === 'students') return <button onClick={() => setEditor({ title: '维护学生档案', path: `students/${id}`, method: 'put', fields: studentFields, data: row })}>编辑档案</button>;
    if (tab === 'companies') return <button onClick={() => setEditor({ title: '维护企业', path: `companies/${id}`, method: 'put', fields: companyFields, data: { ...row, enabled: truth(row.enabled) } })}>编辑 / 停用</button>;
    if (tab === 'jobs') return <>
      <button onClick={() => setDetails(row)}>岗位要求</button>
      {permission('jobs.manage') && <button onClick={() => editJob(row)}>编辑 / 关闭</button>}
      {!teacher && permission('apply') && <button disabled={mutating} onClick={() => openApply(row)}>投递岗位<ArrowUpRight size={14} /></button>}
    </>;
    if (resource === 'applications') return <>{attachment}
      {tab === 'applications' && active && <button disabled={mutating} onClick={() => { if (confirm('确认撤回此申请？')) void mutate(`applications/${id}/withdraw`); }}>撤回</button>}
      {permission('applications.manage') && row.status === 'SUBMITTED' && <button disabled={mutating} onClick={() => mutate(`applications/${id}/review`)}>开始审核</button>}
      {permission('applications.manage') && active && <button onClick={() => setEditor({ title: '拒绝申请', path: `applications/${id}/reject`, fields: [{ key: 'note', label: '拒绝原因', type: 'textarea', required: true, max: 1000 }] })}>未通过</button>}
      {permission('interviews.manage') && ['REVIEWING', 'INTERVIEWING'].includes(String(row.status)) && <button onClick={() => schedule(row)}>安排面试</button>}
      {permission('employment.manage') && row.status === 'INTERVIEWING' && <button onClick={() => hire(row)}>录用登记</button>}
    </>;
    if (resource === 'interviews') return <>{attachment}
      {row.status === 'COMPLETED' && <button onClick={async () => { try { const scores = await courseApi.get<Row[]>(`interviews/${id}/scores`); toast.info(scores.map(s => `${s.name}：${s.score}/${s.maxScore}`).join('；') + (row.comment ? `。评价：${row.comment}` : ''), { duration: 10000 }); } catch (e) { toast.error((e as Error).message); } }}>查看评价</button>}
      {permission('interviews.manage') && row.status === 'SCHEDULED' && <>
        <button onClick={() => setEditor({ title: '提交面试评分（完成后不可修改）', path: `interviews/${id}/scores`, fields: [
          { key: 'communication', label: '沟通表达 / 30', type: 'number', min: 0, max: 30, required: true }, { key: 'professional', label: '专业能力 / 40', type: 'number', min: 0, max: 40, required: true },
          { key: 'fit', label: '岗位匹配 / 30', type: 'number', min: 0, max: 30, required: true }, { key: 'comment', label: '面试评价', type: 'textarea', max: 1000 },
        ] })}>评分</button>
        <button disabled={mutating} onClick={() => { if (confirm('确认取消此轮面试？')) void mutate(`interviews/${id}/cancel`); }}>取消</button>
      </>}
    </>;
    if (tab === 'admin' && row.moduleRole !== 'ADMIN') return <button onClick={() => setEditor({ title: `模块权限：${row.username}`, path: `admin/users/${id}`, method: 'put', data: { role: row.moduleRole, enabled: truth(row.enabled) }, fields: [
      { key: 'role', label: '就业模块角色', required: true, options: [{ value: 'USER', label: '学生' }, { value: 'STAFF', label: '教师' }] }, { key: 'enabled', label: '允许进入就业模块', type: 'checkbox' },
    ] })}>分配身份</button>;
    return null;
  };
  const columns = (() => {
    if (tab === 'students') return ['id', 'username', 'studentNo', 'fullName', 'college', 'major', 'graduationYear', 'profileState'];
    if (tab === 'companies') return ['id', 'name', 'code', 'industry', 'contact', 'enabled'];
    if (tab === 'jobs') return ['id', 'title', 'companyName', 'city', 'plannedCount', 'filledCount', 'deadline', 'status'];
    if (resource === 'applications') return ['id', 'fullName', 'jobTitle', 'companyName', 'status', 'latestScore', 'submittedAt', 'note'];
    if (resource === 'interviews') return ['id', 'fullName', 'jobTitle', 'roundNo', 'scheduledAt', 'location', 'interviewer', 'status', 'totalScore'];
    if (resource === 'employment-results') return ['id', 'fullName', 'jobTitle', 'companyName', 'confirmedAt', 'startDate', 'remarks'];
    if (tab === 'admin') return ['id', 'username', 'role', 'moduleRole', 'enabled', 'createdAt'];
    if (tab === 'audit') return ['id', 'username', 'action', 'resourceType', 'resourceId', 'detail', 'createdAt'];
    if (tab === 'reports' && report === 'jobs') return ['id', 'companyName', 'title', 'plannedCount', 'filledCount', 'remainingCount', 'applicationCount', 'interviewCount', 'hiredCount'];
    if (tab === 'reports' && report === 'students') return ['id', 'studentNo', 'fullName', 'college', 'major', 'graduationYear', 'applicationCount', 'companyName', 'jobTitle', 'employmentId'];
    return ['submitted', 'reviewed', 'interviewed', 'hired'];
  })();
  const upload = async (file?: File) => { if (!file) return; if (file.size > 10 * 1024 * 1024) { toast.error('附件不能超过 10MB'); return; } setMutating(true);
    try { await courseApi.upload(file); toast.success('上传完成，可在投递岗位时选择此附件', { duration: 8000 }); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setMutating(false); } };
  const statusOptions = tab === 'students' ? ['COMPLETE', 'DRAFT'] : tab === 'jobs' ? ['OPEN', 'CLOSED', 'ARCHIVED'] : resource === 'applications' ? ['SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] : resource === 'interviews' ? ['SCHEDULED', 'COMPLETED', 'CANCELLED'] : [];
  const updateExtra = (key: string, value: string) => { setExtra(v => ({ ...v, [key]: value })); setPage(0); };

  if (user && !allowedPath) {
    const destination = !['teacher', 'student'].includes(portal) && tab !== 'dashboard' ? menus.find(m => m.path.endsWith('/' + tab))?.path || basePath : basePath;
    return <Navigate to={destination} replace />;
  }
  return <section className={`employment-shell employment-${teacher ? 'teacher' : 'student'}`}>
    <EmploymentDock menus={menus} teacher={!!teacher} />
    <div className="employment-content">
      <header className="employment-heading"><div><span className="employment-eyebrow">{teacher ? 'GUIDE EVERY STUDENT FORWARD' : 'YOUR NEXT OPPORTUNITY'}</span><h1>{title}</h1><p>{teacher ? '查看学生档案与简历投递，跟进面试和录用。' : '完善自己的资料，发现岗位，跟进求职进度。'}</p></div>
        {user && <span className="employment-role"><ShieldCheck size={16} />{user.username} · {roleNames[user.role]}</span>}
      </header>
      {error && <div className="employment-error" role="alert"><strong>{error}</strong><p>就业模块采用独立服务。暂不可用时仍可使用原站其他功能。</p><button onClick={refresh}><RefreshCw size={16} />重新连接</button></div>}
      {loading && <div className="employment-loading" role="status"><RefreshCw size={20} className="animate-spin" />正在加载…</div>}
      {user && !error && !loading && tab === 'dashboard' && <>
        <div className="employment-welcome"><div><span>{teacher ? 'TEACHER WORKSPACE' : 'CAREER JOURNEY'}</span><h2>{teacher ? '看见每一份努力，连接每一个机会。' : '你的下一站，从这里开始。'}</h2><p>{teacher ? '集中查看学生资料、简历投递与面试结果，让就业指导更有依据。' : '完善档案，发现岗位，跟进面试。每一次准备，都更接近理想的工作。'}</p><Link to={`${basePath}/${permission('applications.manage') ? 'review' : permission('profile') ? 'profile' : 'jobs'}`}>{teacher ? '查看学生投递' : '完善个人档案'}<ArrowUpRight size={18} /></Link></div><BriefcaseBusiness className="employment-hero-icon" /></div>
        <div className="employment-stats">{[
          { label: teacher && permission('students.manage') ? '已完善学生档案' : '开放岗位', value: teacher && permission('students.manage') ? dashboard.studentCount : dashboard.openJobs, icon: Building2 },
          { label: permission('applications.manage') ? '待审核投递' : '我的投递', value: dashboard.pendingReview ?? dashboard.applications, icon: Users },
          { label: permission('interviews.manage') ? '待进行面试' : '面试中的申请', value: dashboard.scheduledInterviews ?? dashboard.interviewing, icon: CalendarDays },
          { label: permission('reports') ? '已登记录用' : '我的录用', value: dashboard.totalHired ?? dashboard.hired, icon: Check },
        ].map(stat => <article key={stat.label}><stat.icon size={23} /><span>{stat.label}</span><strong>{text(stat.value)}</strong></article>)}</div>
        <div className="employment-guide"><h2>{teacher ? '教师就业指导流程' : '我的求职流程'}</h2><div>{(teacher ? ['查看学生档案', '跟进简历投递', '安排面试与评价', '登记与统计录用'] : ['完善个人资料', '选择岗位并投递', '查看面试安排', '跟进录用结果']).map((step, i) => <span key={step}><b>0{i + 1}</b>{step}</span>)}</div><p>{teacher ? '通过学生档案、投递状态和面试评价，为学生提供针对性的就业指导。' : '这里仅展示你本人的资料和申请，教师端的全体学生档案与管理功能不对学生开放。'}</p></div>
      </>}
      {user && !error && !loading && tab === 'profile' && <div className="employment-card"><h2>我的学生档案 <span className="employment-state">{text(user.profile.profileState)}</span></h2><p>完成以下资料后即可投递岗位。</p><dl className="employment-profile">{studentFields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{text(user.profile[f.key])}</dd></div>)}</dl><button className="primary" onClick={() => setEditor({ title: '完善个人档案', path: 'students/me', method: 'put', fields: studentFields, data: user.profile })}>编辑个人档案</button></div>}
      {user && !['dashboard', 'profile'].includes(tab) && <div className="employment-card employment-list-card">
        {tab === 'reports' && <>
          <div className="employment-report-tabs">{[{ id: 'jobs', name: '岗位招聘汇总' }, { id: 'students', name: '学生就业明细' }, { id: 'funnel', name: '投递批次统计' }].map(r => <button key={r.id} className={r.id === report ? 'selected' : ''} onClick={() => setReport(r.id)}>{r.name}</button>)}</div>
          <div className="employment-report-note">{report === 'funnel' ? '按投递时间选定批次，展示这些投递截至查询时的处理情况。日期采用北京时间，结束日期包含当天。' : '统计根据数据库中的投递、完成面试及最终录用记录计算。'}{report === 'students' && <p>系统登记录用比例：<strong>{text(coverage.percentage)}%</strong>（{text(coverage.hired)} / {text(coverage.eligible)} 名已完善档案且启用的学生），不是学校实际就业率。</p>}</div>
        </>}
        <div className="employment-toolbar">
          <form onSubmit={e => { e.preventDefault(); setSearch(query); setPage(0); }}><Search size={17} /><input aria-label="搜索" placeholder="搜索姓名、企业或岗位…" value={query} onChange={e => setQuery(e.target.value)} maxLength={tab === 'admin' ? 64 : 100} /><button>查询</button></form>
          {statusOptions.length > 0 && <select aria-label="状态筛选" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">全部状态</option>{statusOptions.map(s => <option key={s} value={s}>{states[s]}</option>)}</select>}
          <select aria-label="排序方向" value={direction} onChange={e => { setDirection(e.target.value); setPage(0); }}><option value="desc">编号降序</option><option value="asc">编号升序</option></select>
          <button onClick={refresh} aria-label="刷新"><RefreshCw size={17} /></button>
          {tab === 'companies' && permission('companies.manage') && <button className="primary" onClick={() => setEditor({ title: '新增企业', path: 'companies', fields: companyFields, data: { enabled: true } })}><Plus size={17} />新增企业</button>}
          {tab === 'jobs' && permission('jobs.manage') && <button className="primary" onClick={() => editJob()}><Plus size={17} />新增岗位</button>}
          {tab === 'results' && permission('employment.manage') && <button className="primary" onClick={() => hire({})}><Plus size={17} />登记录用</button>}
          {tab === 'applications' && permission('apply') && <label className="employment-upload"><FileText size={17} />{mutating ? '上传中…' : '上传简历附件'}<input type="file" accept=".pdf,.docx" disabled={mutating} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>}
          {tab === 'reports' && permission('reports') && <><button onClick={() => download(`reports/${report}/export`, `就业报表-${report}.csv`, params)}><Download size={17} />导出全部结果</button><button onClick={() => window.print()}><Printer size={17} />打印当前页</button></>}
        </div>
        {(tab === 'students' || tab === 'reports' && report === 'students') && <div className="employment-filter-row"><input aria-label="学院筛选" placeholder="学院（精确匹配）" value={extra.college || ''} onChange={e => updateExtra('college', e.target.value)} /><input aria-label="毕业年份" placeholder="毕业年份" type="number" min="2000" max="2100" value={extra.graduationYear || ''} onChange={e => updateExtra('graduationYear', e.target.value)} /></div>}
        {tab === 'reports' && report === 'funnel' && <div className="employment-filter-row"><label>开始日期<input type="date" onChange={e => updateExtra('start', e.target.value ? `${e.target.value}T00:00:00+08:00` : '')} /></label><label>结束日期<input type="date" onChange={e => { const d = e.target.value ? new Date(`${e.target.value}T00:00:00+08:00`) : null; updateExtra('end', d ? new Date(d.getTime() + 86400000).toISOString() : ''); }} /></label></div>}
        {!loading && !error && <><Table rows={rows} columns={columns} actions={['reports', 'audit', 'results', 'my-results'].includes(tab) ? undefined : actions} /><footer className="employment-pagination"><span>共 {total} 条 · 第 {page + 1} 页</span><div><button disabled={page === 0} onClick={() => setPage(v => v - 1)}>上一页</button><button disabled={(page + 1) * 20 >= total} onClick={() => setPage(v => v + 1)}>下一页</button></div></footer></>}
      </div>}
      {user && tab === 'applications' && permission('apply') && !loading && !error && <Attachments revision={revision} download={download} />}
      {user && tab === 'admin' && !loading && !error && <>
        <Permissions grants={grants} saved={refresh} /><div className="employment-card"><h2>模块管理说明</h2><p>这里分配的教师身份与停用设置仅影响就业模块。管理员身份由原站认证决定。</p><Link to="/employment/teacher/audit">查看操作记录 <ArrowUpRight size={15} /></Link></div>
      </>}
    </div>
    {editor && <EditorDialog key={editor.path} editor={editor} close={() => setEditor(null)} saved={refresh} />}
    {details && <JobDetails row={details} close={() => setDetails(null)} />}
  </section>;
}

function Attachments({ revision, download }: { revision: number; download: (path: string, name: string) => Promise<void> }) {
  const [files, setFiles] = useState<Row[]>([]), [page, setPage] = useState(0), [total, setTotal] = useState(0);
  useEffect(() => { let alive = true; courseApi.get<Page>('files', { page }).then(data => { if (alive) { setFiles(data.items); setTotal(data.total); } }).catch(e => toast.error(e.message)); return () => { alive = false; }; }, [revision, page]);
  return <div className="employment-card"><h2>我的简历附件</h2><p>投递岗位时可选择附件；仅向本人和处理投递的工作人员开放。</p><Table rows={files} columns={['id', 'originalName', 'fileSize', 'createdAt']} actions={row => <button onClick={() => download(`files/${row.id}/download`, String(row.originalName))}><Download size={14} />下载</button>} /><footer className="employment-pagination"><span>共 {total} 个附件</span><div><button disabled={!page} onClick={() => setPage(p => p - 1)}>上一页</button><button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</button></div></footer></div>;
}

function Permissions({ grants, saved }: { grants: Row[]; saved: () => void }) {
  const [role, setRole] = useState('STAFF'), [selected, setSelected] = useState<string[]>([]), [busy, setBusy] = useState(false);
  const allowed = role === 'USER' ? ['dashboard', 'profile', 'jobs.read', 'apply'] : ['dashboard', 'jobs.read', 'students.manage', 'companies.manage', 'jobs.manage', 'applications.manage', 'interviews.manage', 'employment.manage', 'reports'];
  const names: Record<string, string> = { dashboard: '工作台', profile: '个人档案', 'jobs.read': '岗位浏览', apply: '本人投递', 'students.manage': '学生管理', 'companies.manage': '企业维护', 'jobs.manage': '岗位维护', 'applications.manage': '投递审核', 'interviews.manage': '面试安排与评分', 'employment.manage': '录用登记', reports: '统计报表' };
  useEffect(() => setSelected(grants.filter(g => g.role === role).map(g => String(g.code))), [grants, role]);
  const save = useCallback(async () => { setBusy(true); try { await courseApi.put(`admin/permissions/${role}`, { permissions: selected }); toast.success('角色权限已更新'); saved(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }, [role, selected, saved]);
  return <div className="employment-card employment-permissions"><h2>角色权限与动态菜单</h2><p>管理员权限固定保留，其他角色仅能在各自业务范围内调整。</p><select aria-label="配置角色" value={role} onChange={e => setRole(e.target.value)}><option value="STAFF">教师</option><option value="USER">学生</option></select><div>{allowed.map(code => <label key={code}><input type="checkbox" checked={selected.includes(code)} disabled={code === 'dashboard'} onChange={e => setSelected(v => e.target.checked ? [...v, code] : v.filter(p => p !== code))} />{names[code]}</label>)}</div><button className="primary" disabled={busy} onClick={save}>{busy ? '保存中…' : '保存权限'}</button></div>;
}
