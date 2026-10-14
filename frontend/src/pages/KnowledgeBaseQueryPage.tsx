import {useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import {knowledgeBaseApi, type KnowledgeBaseItem, type SortOption} from '../api/knowledgebase';
import {ragChatApi, type RagChatSessionListItem} from '../api/ragChat';
import {formatDateOnly} from '../utils/date';
import DeleteConfirmDialog from '../components/dialogs/DeleteConfirmDialog';
import CodeBlock from '../components/CodeBlock';
import {ChevronLeft, ChevronRight, Edit, MessageSquare, Pin, Plus, Trash2, Bot, UserCircle2,} from 'lucide-react';

interface KnowledgeBaseQueryPageProps {
  onBack: () => void;
  onUpload: () => void;
}

interface Message {
  id?: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CategoryGroup {
  name: string;
  items: KnowledgeBaseItem[];
  isExpanded: boolean;
}

export default function KnowledgeBaseQueryPage({ onBack, onUpload }: KnowledgeBaseQueryPageProps) {
  // 知识库状态
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<Set<number>>(new Set());
  const [loadingList, setLoadingList] = useState(true);

  // 搜索和排序状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['未分类']));

  // 右侧面板状态
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // 会话状态
  const [sessions, setSessions] = useState<RagChatSessionListItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);
  const [sessionDeleteConfirm, setSessionDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<{ id: number; title: string } | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  // 消息状态
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // refs
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const rafRef = useRef<number>();

  const [, startTransition] = useTransition();

  useEffect(() => {
    loadKnowledgeBases();
    loadSessions();
  }, []);

  useEffect(() => {
    if (!searchKeyword) {
      loadKnowledgeBases();
    }
  }, [sortBy]);

  const loadKnowledgeBases = async () => {
    setLoadingList(true);
    try {
      // 问答助手只显示向量化完成的知识库
      const list = await knowledgeBaseApi.getAllKnowledgeBases(sortBy, 'COMPLETED');
      setKnowledgeBases(list);
    } catch (err) {
      console.error('加载知识库列表失败', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadKnowledgeBases();
      return;
    }
    setLoadingList(true);
    try {
      const list = await knowledgeBaseApi.search(searchKeyword.trim());
      setKnowledgeBases(list);
    } catch (err) {
      console.error('搜索知识库失败', err);
    } finally {
      setLoadingList(false);
    }
  };

  const groupedKnowledgeBases = useMemo((): CategoryGroup[] => {
    const groups: Map<string, KnowledgeBaseItem[]> = new Map();

    knowledgeBases.forEach(kb => {
      const category = kb.category || '未分类';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(kb);
    });

    const result: CategoryGroup[] = [];
    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      if (a === '未分类') return 1;
      if (b === '未分类') return -1;
      return a.localeCompare(b);
    });

    sortedCategories.forEach(name => {
      result.push({
        name,
        items: groups.get(name)!,
        isExpanded: expandedCategories.has(name),
      });
    });

    return result;
  }, [knowledgeBases, expandedCategories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const list = await ragChatApi.listSessions();
      setSessions(list);
    } catch (err) {
      console.error('加载会话列表失败', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleToggleKb = (kbId: number) => {
    setSelectedKbIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kbId)) {
        newSet.delete(kbId);
      } else {
        newSet.add(kbId);
      }
      if (newSet.size !== prev.size && currentSessionId) {
        setCurrentSessionId(null);
        setCurrentSessionTitle('');
        setMessages([]);
      }
      return newSet;
    });
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setCurrentSessionTitle('');
    setMessages([]);
  };

  const handleLoadSession = async (sessionId: number) => {
    setLoadingSessionDetail(true);
    try {
      const detail = await ragChatApi.getSessionDetail(sessionId);
      const restoredMessages = detail.messages.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));

      setCurrentSessionId(detail.id);
      setCurrentSessionTitle(detail.title);
      setSelectedKbIds(new Set(detail.knowledgeBases.map(kb => kb.id)));
      setMessages(restoredMessages);

      if (restoredMessages.length > 0) {
        requestAnimationFrame(() => {
          virtuosoRef.current?.scrollToIndex({
            index: restoredMessages.length - 1,
            align: 'end',
            behavior: 'auto',
          });
        });
      }
    } catch (err) {
      console.error('加载会话失败', err);
    } finally {
      setLoadingSessionDetail(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionDeleteConfirm) return;
    try {
      await ragChatApi.deleteSession(sessionDeleteConfirm.id);
      await loadSessions();
      if (currentSessionId === sessionDeleteConfirm.id) {
        handleNewSession();
      }
      setSessionDeleteConfirm(null);
    } catch (err) {
      console.error('删除会话失败', err);
    }
  };

  const handleEditSessionTitle = (sessionId: number, currentTitle: string) => {
    setEditingSessionTitle({ id: sessionId, title: currentTitle });
    setNewSessionTitle(currentTitle);
  };

  const handleSaveSessionTitle = async () => {
    if (!editingSessionTitle || !newSessionTitle.trim()) return;
    try {
      await ragChatApi.updateSessionTitle(editingSessionTitle.id, newSessionTitle.trim());
      await loadSessions();
      if (currentSessionId === editingSessionTitle.id) {
        setCurrentSessionTitle(newSessionTitle.trim());
      }
      setEditingSessionTitle(null);
      setNewSessionTitle('');
    } catch (err) {
      console.error('更新会话标题失败', err);
    }
  };

  const handleTogglePin = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ragChatApi.togglePin(sessionId);
      await loadSessions();
    } catch (err) {
      console.error('切换置顶状态失败', err);
    }
  };

  const formatMarkdown = (text: string): string => {
    if (!text) return '';
    return text
      // 处理转义换行符
      .replace(/\\n/g, '\n')
      // 确保标题 # 后有空格
      .replace(/^(#{1,6})([^\s#\n])/gm, '$1 $2')
      // 确保有序列表数字后有空格（如 1.xxx -> 1. xxx）
      .replace(/^(\s*)(\d+)\.([^\s\n])/gm, '$1$2. $3')
      // 确保无序列表 - 或 * 后有空格
      .replace(/^(\s*[-*])([^\s\n-])/gm, '$1 $2')
      // 压缩多余空行
      .replace(/\n{3,}/g, '\n\n');
  };

  const handleSubmitQuestion = async () => {
    if (!question.trim() || selectedKbIds.size === 0 || loading) return;

    const userQuestion = question.trim();
    setQuestion('');
    setLoading(true);

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const session = await ragChatApi.createSession(Array.from(selectedKbIds));
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        setCurrentSessionTitle(session.title);
      } catch (err) {
        console.error('创建会话失败', err);
        setLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      type: 'user',
      content: userQuestion,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: Message = {
      type: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    let fullContent = '';
    const updateAssistantMessage = (content: string) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].type === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: content,
          };
        }
        return newMessages;
      });
    };

    try {
      await ragChatApi.sendMessageStream(
        sessionId,
        userQuestion,
        (chunk: string) => {
          fullContent += chunk;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
          }
          rafRef.current = requestAnimationFrame(() => {
            startTransition(() => {
              updateAssistantMessage(fullContent);
            });
          });
        },
        () => {
          setLoading(false);
          loadSessions();
        },
        (error: Error) => {
          console.error('流式查询失败:', error);
          updateAssistantMessage(fullContent || error.message || '回答失败，请重试');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('发起流式查询失败:', err);
      updateAssistantMessage(err instanceof Error ? err.message : '回答失败，请重试');
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimeAgo = (dateStr: string): string => {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);

    const date = hasTimezone
      ? new Date(normalized)
      : (() => {
          const [datePart, timePart = '00:00:00'] = normalized.split('T');
          const [y, m, d] = datePart.split('-').map(Number);
          const [hh, mm, ss = 0] = timePart.split(':').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
        })();

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return formatDateOnly(hasTimezone ? normalized : `${normalized}+08:00`);
  };

  return (
    <div className="relative mx-auto max-w-[1320px] pb-8">
      <div className="pointer-events-none max-w-full absolute left-1/2 top-[-180px] h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.25)_0%,rgba(99,102,241,0.14)_42%,transparent_72%)] blur-2xl" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[clamp(2rem,4vw,3rem)] leading-[0.96] tracking-[-0.04em] text-white [font-family:'Playfair_Display','Times_New_Roman',serif]">问答助手</h1>
          <p className="text-sm text-white/68">选择知识库，向 AI 提问</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={onUpload}
            className="rounded-full border border-white/16 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/88 transition-all hover:bg-white/[0.10]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            上传知识库
          </motion.button>
          <motion.button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/16 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/88 transition-all hover:bg-white/[0.10]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            返回
          </motion.button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-10rem)] gap-3">
        {/* 左侧：对话历史 */}
        <div className="w-64 shrink-0">
          <div className="flex h-full flex-col rounded-[22px] border border-white/12 bg-white/[0.05] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.52)] backdrop-blur-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white dark:text-neutral-100">对话历史</h2>
              <motion.button
                type="button"
                onClick={handleNewSession}
                disabled={selectedKbIds.size === 0}
                className="rounded-pill p-1.5 text-ds-accent transition-colors hover:bg-ds-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-900"
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                title="新建对话"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </motion.button>
            </div>

            <div className="scrollbar-ds flex-1 overflow-y-auto">
              {loadingSessions ? (
                <div className="py-6 text-center">
                  <motion.div
                    className="mx-auto h-5 w-5 rounded-full border-2 border-white/12 border-t-ds-fg dark:border-neutral-800 dark:border-t-neutral-100"
                    animate={{rotate: 360}}
                    transition={{duration: 1, repeat: Infinity, ease: 'linear'}}
                  />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-6 text-center text-sm text-white-muted dark:text-neutral-500">暂无对话历史</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => handleLoadSession(session.id)}
                      className={`group cursor-pointer rounded-xl border p-3 transition-all ${
                        currentSessionId === session.id
                          ? 'border-ds-fg bg-ds-bg-subtle dark:border-neutral-100 dark:bg-neutral-900'
                          : 'border-transparent bg-ds-bg-subtle hover:bg-ds-bg dark:bg-neutral-900/50 dark:hover:bg-neutral-900'
                      } ${session.isPinned ? 'border-l-4 border-l-ds-accent' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {session.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-ds-accent text-ds-accent" />}
                            <p className="truncate text-sm font-semibold text-white dark:text-neutral-100">{session.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-white-muted dark:text-neutral-500">
                            {session.messageCount} 条消息 · {formatTimeAgo(session.createdAt || session.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={e => handleTogglePin(session.id, e)}
                            className={`rounded p-1 transition-colors ${
                              session.isPinned ? 'text-ds-accent hover:opacity-80' : 'text-white-muted hover:text-ds-accent'
                            }`}
                            title={session.isPinned ? '取消置顶' : '置顶'}
                          >
                            <Pin className={`h-4 w-4 ${session.isPinned ? 'fill-ds-accent' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleEditSessionTitle(session.id, session.title);
                            }}
                            className="rounded p-1 text-white-muted transition-colors hover:text-white dark:hover:text-neutral-200"
                            title="编辑标题"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSessionDeleteConfirm({id: session.id, title: session.title});
                            }}
                            className="rounded p-1 text-white-muted transition-colors hover:text-red-600 dark:hover:text-red-400"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 中间：聊天区域 */}
        <div className="min-w-0 flex-1">
          <div className="flex h-full flex-col rounded-card border border-white/18 bg-white/[0.16] shadow-[0_18px_60px_rgba(30,64,175,0.2)] backdrop-blur-[16px]">
            {selectedKbIds.size > 0 ? (
              <>
                <div className="border-b border-white/12 p-4 dark:border-neutral-800">
                  <h2 className="text-sm font-bold text-white dark:text-neutral-100">
                    {currentSessionTitle ||
                      (selectedKbIds.size === 1
                        ? knowledgeBases.find(kb => kb.id === Array.from(selectedKbIds)[0])?.name || '新对话'
                        : `${selectedKbIds.size} 个知识库 - 新对话`)}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.from(selectedKbIds).map(kbId => {
                      const kb = knowledgeBases.find(k => k.id === kbId);
                      return kb ? (
                        <span
                          key={kbId}
                          className="rounded-full border border-white/14 bg-white/[0.04] px-2 py-0.5 text-xs font-semibold text-white/70"
                        >
                          {kb.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="relative min-h-0 flex-1">
                  {loadingSessionDetail ? (
                    <div className="absolute inset-0 px-4 py-4">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/15" />
                          <div className="w-[72%] animate-pulse rounded-[18px] border border-white/10 bg-white/[0.08] p-4">
                            <div className="mb-2 h-3 w-5/6 rounded bg-white/12" />
                            <div className="h-3 w-2/3 rounded bg-white/12" />
                          </div>
                        </div>
                        <div className="flex items-start justify-end gap-3">
                          <div className="w-[62%] animate-pulse rounded-[18px] border border-white/10 bg-white/[0.10] p-4">
                            <div className="mb-2 h-3 w-4/5 rounded bg-white/14" />
                            <div className="h-3 w-3/5 rounded bg-white/14" />
                          </div>
                          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/15" />
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/15" />
                          <div className="w-[78%] animate-pulse rounded-[18px] border border-white/10 bg-white/[0.08] p-4">
                            <div className="mb-2 h-3 w-11/12 rounded bg-white/12" />
                            <div className="mb-2 h-3 w-4/5 rounded bg-white/12" />
                            <div className="h-3 w-2/3 rounded bg-white/12" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white-muted dark:text-neutral-500">
                      <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-40" strokeWidth={1.25} />
                      <p className="text-sm">开始提问吧！</p>
                    </div>
                  ) : (
                    <Virtuoso
                      key={currentSessionId ?? 'new-session'}
                      ref={virtuosoRef}
                      data={messages}
                      initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
                      followOutput="smooth"
                      className="h-full w-full"
                      itemContent={(index, msg) => (
                        <div className="px-4 pb-4 first:pt-4">
                          <motion.div
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.type === 'assistant' ? (
                              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/15 text-cyan-100">
                                <Bot className="h-5 w-5" strokeWidth={2} />
                              </div>
                            ) : null}

                            <div
                              className={`max-w-[85%] rounded-[18px] p-4 text-sm shadow-[0_10px_26px_rgba(2,6,23,0.28)] ${
                                msg.type === 'user'
                                  ? 'border border-indigo-300/40 bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_45%,#7c3aed_100%)] text-white'
                                  : 'border border-slate-300/20 bg-[linear-gradient(160deg,rgba(10,25,47,0.92)_0%,rgba(15,23,42,0.92)_100%)] text-slate-100'
                              }`}
                            >
                              {msg.type === 'user' ? (
                                <p className="whitespace-pre-wrap leading-relaxed text-white/95">{msg.content}</p>
                              ) : (
                                <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:text-slate-100 prose-p:text-slate-100 prose-strong:text-cyan-200 prose-li:text-slate-100 prose-code:text-cyan-100 prose-pre:my-2 prose-pre:bg-transparent prose-a:text-cyan-200">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code: ({className, children}) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isInline = !match;

                                        if (isInline) {
                                          return (
                                            <code className="rounded-md border border-cyan-200/20 bg-slate-900/70 px-1.5 py-0.5 text-sm font-normal text-cyan-100">
                                              {children}
                                            </code>
                                          );
                                        }

                                        return <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>;
                                      },
                                      pre: ({children}) => <>{children}</>
                                    }}
                                  >
                                    {formatMarkdown(msg.content)}
                                  </ReactMarkdown>
                                  {loading && index === messages.length - 1 && (
                                    <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-cyan-200" />
                                  )}
                                </div>
                              )}
                            </div>

                            {msg.type === 'user' ? (
                              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-200/45 bg-indigo-300/20 text-indigo-50">
                                <UserCircle2 className="h-5 w-5" strokeWidth={2} />
                              </div>
                            ) : null}
                          </motion.div>
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="border-t border-white/12 p-4 dark:border-neutral-800">
                  <div className="flex items-center gap-2 rounded-pill border border-white/12-strong bg-ds-bg-composer p-2 pl-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <input
                      type="text"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSubmitQuestion()}
                      placeholder="输入您的问题…"
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
                      disabled={loading}
                    />
                    <motion.button
                      type="button"
                      onClick={handleSubmitQuestion}
                      disabled={!question.trim() || selectedKbIds.size === 0 || loading}
                      className="shrink-0 rounded-full bg-[linear-gradient(90deg,#38bdf8,#4f46e5)] px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      whileHover={{scale: loading ? 1 : 1.02}}
                      whileTap={{scale: loading ? 1 : 0.98}}
                    >
                      发送
                    </motion.button>
                  </div>
                </div>
              </>
            ) : (
                <div className="flex flex-1 items-center justify-center text-white-muted dark:text-neutral-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm">请先在右侧选择知识库</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：知识库选择（简化版） */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="flex h-full w-[280px] flex-col rounded-[22px] border border-white/12 bg-white/[0.05] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.52)] backdrop-blur-[20px]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white dark:text-neutral-100">选择知识库</h2>
                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(false)}
                    className="rounded-pill p-1 text-white-muted transition-colors hover:bg-ds-bg-subtle hover:text-white dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索…"
                    className="flex-1 rounded-full border border-white/16 bg-white/[0.05] px-3 py-1.5 text-sm text-white focus:border-cyan-300/45 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="rounded-pill bg-ds-fg px-3 py-1.5 text-sm font-black text-ds-bg hover:opacity-90 dark:bg-neutral-100 dark:text-neutral-950"
                  >
                    搜索
                  </button>
                </div>

                <div className="mb-3">
                  <select
                    value={sortBy}
                    onChange={e => {
                      setSortBy(e.target.value as SortOption);
                      setSearchKeyword('');
                    }}
                    className="w-full rounded-full border border-white/16 bg-white/[0.05] px-2 py-1.5 text-xs font-semibold text-white focus:border-cyan-300/45 focus:outline-none [&>option]:bg-[#0f1a2a] [&>option]:text-white"
                  >
                    <option value="time">时间排序</option>
                    <option value="size">大小排序</option>
                    <option value="access">访问排序</option>
                    <option value="question">提问排序</option>
                  </select>
                </div>

                {/* 知识库列表 */}
                <div className="scrollbar-ds flex-1 overflow-y-auto">
                  {loadingList ? (
                    <div className="py-6 text-center">
                      <motion.div
                        className="mx-auto h-5 w-5 rounded-full border-2 border-white/12 border-t-ds-fg dark:border-neutral-800 dark:border-t-neutral-100"
                        animate={{rotate: 360}}
                        transition={{duration: 1, repeat: Infinity, ease: 'linear'}}
                      />
                    </div>
                  ) : knowledgeBases.length === 0 ? (
                    <div className="py-6 text-center text-white-muted dark:text-neutral-400">
                      <p className="mb-2 text-sm">{searchKeyword ? '未找到' : '暂无知识库'}</p>
                      {!searchKeyword && (
                        <button type="button" onClick={onUpload} className="text-sm font-bold text-ds-accent hover:underline">
                          立即上传
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupedKnowledgeBases.map(group => (
                        <div key={group.name} className="overflow-hidden rounded-lg border border-white/12 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => toggleCategory(group.name)}
                            className="flex w-full items-center justify-between bg-ds-bg-subtle px-3 py-2 transition-colors hover:bg-ds-bg dark:bg-neutral-900/60 dark:hover:bg-neutral-900"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight
                                className={`h-3.5 w-3.5 text-white-muted transition-transform ${group.isExpanded ? 'rotate-90' : ''}`}
                              />
                              <span className="text-sm font-semibold text-white dark:text-neutral-200">{group.name}</span>
                            </div>
                            <span className="text-xs text-white-faint dark:text-neutral-500">{group.items.length}</span>
                          </button>

                          <AnimatePresence>
                            {group.isExpanded && (
                              <motion.div
                                initial={{height: 0, opacity: 0}}
                                animate={{height: 'auto', opacity: 1}}
                                exit={{height: 0, opacity: 0}}
                                transition={{duration: 0.2}}
                                className="overflow-hidden"
                              >
                                <div className="space-y-1 p-2">
                                  {group.items.map(kb => (
                                    <div
                                      key={kb.id}
                                      onClick={() => handleToggleKb(kb.id)}
                                      className={`cursor-pointer rounded-lg border p-2 transition-all ${
                                        selectedKbIds.has(kb.id)
                                          ? 'border-ds-fg bg-ds-bg-subtle dark:border-neutral-100 dark:bg-neutral-900'
                                          : 'border-transparent bg-ds-bg hover:bg-ds-bg-subtle dark:bg-neutral-950 dark:hover:bg-neutral-900'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={selectedKbIds.has(kb.id)}
                                          onChange={() => handleToggleKb(kb.id)}
                                          onClick={e => e.stopPropagation()}
                                          className="h-3.5 w-3.5 rounded border-white/12 text-ds-accent focus:ring-ds-accent dark:border-neutral-700"
                                        />
                                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white dark:text-neutral-100">{kb.name}</span>
                                      </div>
                                      <p className="ml-5 mt-0.5 text-xs text-white-faint dark:text-neutral-500">{formatFileSize(kb.fileSize)}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 收起状态下的展开按钮 */}
        {!rightPanelOpen && (
          <button
            type="button"
            onClick={() => setRightPanelOpen(true)}
            className="flex h-full w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/12 bg-white/[0.05] shadow-[0_12px_40px_rgba(2,6,23,0.4)] transition-colors hover:bg-white/[0.1]"
            title="展开知识库面板"
          >
            <ChevronRight className="h-5 w-5 text-white-muted" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* 删除会话确认弹窗 */}
      <DeleteConfirmDialog
        open={!!sessionDeleteConfirm}
        item={sessionDeleteConfirm ? { id: 0, title: sessionDeleteConfirm.title } : null}
        itemType="对话"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionDeleteConfirm(null)}
      />

      {/* 编辑会话标题弹窗 */}
      <AnimatePresence>
        {editingSessionTitle && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setEditingSessionTitle(null);
                setNewSessionTitle('');
              }}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-card border border-white/12 bg-ds-bg p-6 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <h3 className="mb-4 text-xl font-black tracking-tight text-white dark:text-neutral-50">编辑标题</h3>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={e => setNewSessionTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSaveSessionTitle()}
                  placeholder="请输入新标题"
                  className="mb-4 w-full rounded-full border border-white/16 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-cyan-300/45 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSessionTitle(null);
                      setNewSessionTitle('');
                    }}
                    className="rounded-pill px-4 py-2 text-sm font-bold text-white-muted hover:text-white dark:text-neutral-400 dark:hover:text-neutral-100"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSessionTitle}
                    disabled={!newSessionTitle.trim()}
                    className="rounded-pill bg-ds-fg px-4 py-2 text-sm font-black text-ds-bg hover:opacity-90 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
                  >
                    保存
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
