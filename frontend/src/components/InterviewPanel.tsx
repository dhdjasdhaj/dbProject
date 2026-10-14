import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {formatDateOnly} from '../utils/date';
import {getScoreColor} from '../utils/score';
import type {InterviewItem} from '../api/history';
import {historyApi} from '../api/history';
import ConfirmDialog from './dialogs/ConfirmDialog';
import {Calendar, ChevronRight, Download, MessageSquare, Mic, Trash2, TrendingUp} from 'lucide-react';

interface InterviewPanelProps {
  interviews: InterviewItem[];
  onStartInterview: () => void;
  onViewInterview: (sessionId: string) => void;
  onExportInterview: (sessionId: string) => void;
  onDeleteInterview: (sessionId: string) => void;
  exporting: string | null;
  loadingInterview: boolean;
}

/**
 * 面试记录面板组件
 */
export default function InterviewPanel({
  interviews,
  onStartInterview,
  onViewInterview,
  onExportInterview,
  onDeleteInterview,
  exporting,
  loadingInterview
}: InterviewPanelProps) {
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sessionId: string } | null>(null);

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发卡片点击事件
    setDeleteConfirm({ sessionId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    const { sessionId } = deleteConfirm;
    setDeletingSessionId(sessionId);
    try {
      await historyApi.deleteInterview(sessionId);
      onDeleteInterview(sessionId);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败，请稍后重试');
    } finally {
      setDeletingSessionId(null);
    }
  };

  // 准备图表数据
  const chartData = useMemo(() => {
    return interviews
      .filter(i => i.overallScore !== null)
      .map((interview) => ({
        name: formatDateOnly(interview.createdAt),
        score: interview.overallScore || 0,
        index: interviews.length - interviews.indexOf(interview)
      }))
      .reverse();
  }, [interviews]);

  if (interviews.length === 0) {
    return (
        <div className="rounded-[26px] border border-white/12 bg-white/[0.06] p-12 text-center shadow-[0_18px_48px_rgba(2,6,23,0.36)] backdrop-blur-[22px]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-black/20 backdrop-blur-sm">
          <Mic className="h-8 w-8 text-white/60" strokeWidth={1.5} />
        </div>
          <h3 className="mb-2 text-xl font-bold text-white">暂无面试记录</h3>
          <p className="mb-6 text-white/68">开始模拟面试，获取专业评估</p>
        <motion.button
          type="button"
          onClick={onStartInterview}
          className="rounded-pill border border-white/12 bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-[0_12px_28px_rgba(255,255,255,0.16)]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          开始模拟面试
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* 面试表现趋势图 */}
      {chartData.length > 0 && (
          <motion.div
              className="rounded-[26px] border border-white/12 bg-white/[0.06] p-6 shadow-[0_18px_48px_rgba(2,6,23,0.36)] backdrop-blur-[22px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/72">
              <TrendingUp className="h-5 w-5 text-cyan-200" strokeWidth={1.75} />
              <span className="font-bold text-white">面试表现趋势</span>
            </div>
            <span className="text-sm text-white/60">共 {chartData.length} 场练习</span>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
                <XAxis
                    dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                    border: '1px solid #e7e9ea',
                    borderRadius: '9999px',
                    boxShadow: '0 1px 2px rgb(15 20 25 / 0.06)'
                  }}
                  formatter={(value) => [`${value} 分`, '得分']}
                />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#1d9bf0"
                  strokeWidth={2.5}
                  dot={{ fill: '#1d9bf0', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#1a8cd8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 历史面试场次 */}
      <motion.div
          className="rounded-[26px] border border-white/12 bg-white/[0.06] p-6 shadow-[0_18px_48px_rgba(2,6,23,0.36)] backdrop-blur-[22px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-bold text-white">历史面试场次</span>
        </div>

        <div className="space-y-4">
          {interviews.map((interview, index) => (
            <InterviewItemCard
              key={interview.id}
              interview={interview}
              index={index}
              total={interviews.length}
              exporting={exporting === interview.sessionId}
              deleting={deletingSessionId === interview.sessionId}
              onView={() => onViewInterview(interview.sessionId)}
              onExport={() => onExportInterview(interview.sessionId)}
              onDelete={(e) => handleDeleteClick(interview.sessionId, e)}
            />
          ))}
        </div>

        {/* 删除确认对话框 */}
        <ConfirmDialog
          open={deleteConfirm !== null}
          title="删除面试记录"
          message="确定要删除这条面试记录吗？删除后无法恢复。"
          confirmText="确定删除"
          cancelText="取消"
          confirmVariant="danger"
          loading={deletingSessionId !== null}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />

        {loadingInterview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/50">
              <div className="flex items-center gap-4 rounded-[24px] border border-white/12 bg-black/35 p-6 shadow-[0_18px_48px_rgba(2,6,23,0.36)] backdrop-blur-[22px]">
                <motion.div
                    className="h-8 w-8 rounded-full border-2 border-white/18 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
                <span className="text-white/78">加载面试详情…</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// 面试项卡片组件
function InterviewItemCard({
  interview,
  index,
  total,
  exporting,
  deleting,
  onView,
  onExport,
  onDelete
}: {
  interview: InterviewItem;
  index: number;
  total: number;
  exporting: boolean;
  deleting: boolean;
  onView: () => void;
  onExport: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onView}
      className="group flex cursor-pointer items-center gap-4 rounded-[22px] border border-white/10 bg-black/22 p-4 text-white transition-colors hover:bg-black/28 backdrop-blur-sm"
    >
      {/* 得分 */}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
        interview.overallScore !== null 
          ? getScoreColor(interview.overallScore, [85, 70])
            : 'bg-white/8 text-white/55'
      }`}>
        {interview.overallScore ?? '-'}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-white">
          模拟面试 #{total - index}
        </p>
        <div className="flex items-center gap-4 text-sm text-white/58">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDateOnly(interview.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {interview.totalQuestions} 题
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
      {/* 导出按钮 */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onExport(); }}
        disabled={exporting}
        className="rounded-pill px-3 py-2 text-white/58 transition-all hover:bg-white/10 hover:text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Download className="w-5 h-5" />
      </motion.button>

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          disabled={deleting}
          className="rounded-pill p-2 text-white/52 transition-colors hover:bg-red-500/16 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          title="删除面试记录"
        >
          {deleting ? (
            <motion.div
              className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 箭头 */}
      <ChevronRight className="h-5 w-5 shrink-0 text-white/34 transition-all group-hover:translate-x-0.5 group-hover:text-white/72" />
    </motion.div>
  );
}
