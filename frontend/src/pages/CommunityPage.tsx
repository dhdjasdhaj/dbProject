import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Hash,
  MessageCircle,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
  Flag,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { communityApi, Feed, Post, Report } from "../api/community";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import OrbGallery from "../components/community/OrbGallery";
import { useProfile } from "../hooks/useProfile";

const channels = [
  {
    id: "DISCUSSION",
    name: "交流讨论",
    description: "聊求职经验、面试准备与简历修改",
    icon: MessageCircle,
  },
  {
    id: "ANNOUNCEMENTS",
    name: "社区公告",
    description: "来自社区管理员的更新与提醒",
    icon: Sparkles,
  },
];
const topics = ["简历表达", "面试复盘", "技术交流", "成长计划", "求职沟通"];
const statusNames: Record<string, string> = {
  PENDING: "待审核",
  PUBLISHED: "已公开",
  REJECTED: "已驳回",
  HIDDEN: "已下架",
};
const date = (s: string) =>
  new Date(s.replace(" ", "T")).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function Avatar({ name }: { name: string }) {
  return (
    <span className="community-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function CommunityPage() {
  const { profile, error: profileError } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const { postId } = useParams();
  const admin = location.pathname === "/community/admin";
  const canAdmin = profile?.role === "ADMIN";
  const [channel, setChannel] = useState("DISCUSSION");
  const [topic, setTopic] = useState("");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [feed, setFeed] = useState<Feed>({ items: [], total: 0, page: 0 });
  const [post, setPost] = useState<Post | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [moderation, setModeration] = useState<{
    post: Post;
    action: string;
  } | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!posting && !reporting && !moderation) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".community-modal");
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setPosting(false);
        setReporting(false);
        setModeration(null);
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea, select, a[href]",
        ),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [posting, reporting, moderation, busy]);
  useEffect(() => {
    setPage(0);
  }, [channel, topic, mine, search, status, admin]);
  useEffect(() => {
    if (!profile) return;
    if (admin && !canAdmin) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setPost(null);
    const load = postId
      ? communityApi.detail(Number(postId)).then((p) => {
          if (active) setPost(p);
        })
      : admin
        ? Promise.all([
            communityApi.adminList(status, page),
            communityApi.reports(),
          ]).then(([f, r]) => {
            if (active) {
              setFeed(f);
              setReports(r);
            }
          })
        : communityApi
            .list({
              channel: mine ? "" : channel,
              topic: mine || channel !== "DISCUSSION" ? "" : topic,
              q: search,
              mine,
              page,
            })
            .then((f) => {
              if (active) setFeed(f);
            });
    load
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    profile,
    canAdmin,
    admin,
    postId,
    channel,
    topic,
    mine,
    search,
    status,
    page,
    refresh,
  ]);
  const reload = () => setRefresh((v) => v + 1);
  const action = async (fn: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      reload();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!post) return;
    if (
      await action(
        () => communityApi.comment(post.id, comment, rating || undefined),
        "评论已发布",
      )
    ) {
      setComment("");
      setRating(0);
    }
  };
  const removePost = async (p: Post) => {
    if (!window.confirm("确定删除这篇帖子？删除后将不再公开。")) return;
    if ((await action(() => communityApi.remove(p.id), "帖子已删除")) && postId)
      navigate("/community");
  };
  const moderate = async (p: Post, a: string) => {
    if (a === "REJECT" || a === "HIDE") {
      setNote("");
      setModeration({ post: p, action: a });
      return;
    }
    await action(() => communityApi.moderate(p.id, a), "管理操作已保存");
  };
  const toggleMode = () => navigate(admin ? "/community" : "/community/admin");
  if (profileError)
    return (
      <div className="community-state" role="alert">
        {profileError}
      </div>
    );
  if (!profile)
    return (
      <div className="community-state" role="status">
        正在确认登录身份…
      </div>
    );
  if (admin && !canAdmin)
    return (
      <div className="community-state">
        <ShieldCheck size={44} />
        <h1>需要管理员身份</h1>
        <p>当前账户可以浏览社区、分享经验和参与讨论。</p>
        <Link to="/community" className="community-primary">
          返回社区
        </Link>
      </div>
    );
  return (
    <div className="community">
      <header className="community-heading">
        <div>
          <div className="community-eyebrow">
            <span className="community-online-dot" /> COMMUNITY / TOGETHER WE
            GROW
          </div>
          <h1>{admin ? "社区管理中心" : "让每次交流，都离机会更近。"}</h1>
          <p>
            {admin
              ? "审核分享、维护讨论，让有价值的内容被更多人看见。"
              : "聊真实的问题，分享具体的经验，在讨论中找到下一步。"}
          </p>
        </div>
        <div className="community-heading-actions">
          {canAdmin && (
            <button className="community-secondary" onClick={toggleMode}>
              <ShieldCheck size={19} />
              {admin ? "切换用户视图" : "切换管理员"}
            </button>
          )}
          <button
            className="community-primary"
            onClick={() => setPosting(true)}
          >
            <Plus size={20} />
            发布分享
          </button>
        </div>
      </header>
      {!admin && !postId && !mine && channel === "DISCUSSION" && <OrbGallery />}
      <div className="community-workspace" id="community-discussion-list">
        <aside className="community-sidebar">
          <div className="community-server">
            <span className="community-server-orb">
              <Users />
            </span>
            <strong>Interview 社区</strong>
            <span>好问题 · 好经验 · 好伙伴</span>
          </div>
          <div className="community-sidebar-label">
            {admin ? "管理工作台" : "社区频道"}
          </div>
          {admin
            ? Object.entries(statusNames).map(([id, name]) => (
                <button
                  key={id}
                  className={`community-channel ${status === id ? "is-active" : ""}`}
                  onClick={() => {
                    setStatus(id);
                    navigate("/community/admin");
                  }}
                >
                  <ShieldCheck size={19} />
                  <span>{name}</span>
                  {id === "PENDING" && status === id && (
                    <small>{feed.total}</small>
                  )}
                </button>
              ))
            : channels.map((c) => (
                <button
                  key={c.id}
                  className={`community-channel ${!mine && channel === c.id ? "is-active" : ""}`}
                  onClick={() => {
                    setChannel(c.id);
                    setMine(false);
                    navigate("/community");
                  }}
                >
                  <Hash size={19} />
                  <span>{c.name}</span>
                </button>
              ))}
          {!admin && (
            <>
              <div className="community-sidebar-label">个人空间</div>
              <button
                className={`community-channel ${mine ? "is-active" : ""}`}
                onClick={() => {
                  setMine(true);
                  navigate("/community");
                }}
              >
                <FileText size={19} />
                我的分享
              </button>
            </>
          )}
          <div className="community-guidelines">
            <Sparkles size={22} />
            <strong>让每次分享都有价值</strong>
            <p>
              分享真实经历与具体问题，移除姓名、联系方式等隐私信息。示例帖子与回复已标注，欢迎补充你的实际经验。
            </p>
            <span>友善交流 · 具体建议 · 尊重隐私</span>
          </div>
          <div className="community-member">
            <Avatar name={profile.username} />
            <div>
              <strong>{profile.username}</strong>
              <span>{admin ? "管理员模式" : "社区成员"}</span>
            </div>
          </div>
        </aside>
        <section className="community-content">
          {postId ? (
            <>
              <Link className="community-back" to="/community">
                <ArrowLeft size={19} />
                返回频道
              </Link>
              {loading ? (
                <div className="community-state" role="status">
                  正在加载分享…
                </div>
              ) : error ? (
                <div className="community-state" role="alert">
                  {error}
                  <button onClick={reload}>重新加载</button>
                </div>
              ) : (
                post && (
                  <>
                    <article className="community-detail">
                      <div className="community-post-tags">
                        <span>
                          {channels.find((c) => c.id === post.channel)?.name}
                        </span>
                        {post.pinned && (
                          <span>
                            <Pin size={14} />
                            置顶
                          </span>
                        )}
                        <span>{post.topic}</span>
                        {post.isExample && (
                          <span className="community-example-tag">
                            原创讨论示例
                          </span>
                        )}
                        <span className={`status-${post.status.toLowerCase()}`}>
                          {statusNames[post.status]}
                        </span>
                      </div>
                      <h2>{post.title}</h2>
                      <div className="community-author">
                        <Avatar name={post.author} />
                        <strong>{post.author}</strong>
                        <time>{date(post.createdAt)}</time>
                      </div>
                      {post.coverImage && (
                        <figure className="community-detail-cover">
                          <img
                            src={post.coverImage}
                            alt={post.title + "的讨论示意图"}
                          />
                          <figcaption>
                            原创配图 · 场景与示例回复供交流参考
                          </figcaption>
                        </figure>
                      )}
                      <div className="community-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {post.content}
                        </ReactMarkdown>
                      </div>
                      {post.sourceUrl && /^https:\/\//.test(post.sourceUrl) && (
                        <div className="community-source-reading">
                          <strong>延伸阅读</strong>
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {post.sourceTitle} ↗
                          </a>
                          <span>
                            参考话题与方法；本文场景、分析和示例回复为原创整理。
                          </span>
                        </div>
                      )}
                      {post.moderationNote && (
                        <div className="community-review-note">
                          管理反馈：{post.moderationNote}
                        </div>
                      )}
                      {post.fileName && (
                        <div className="community-attachment">
                          <span className="community-file-icon">
                            <FileText />
                          </span>
                          <div>
                            <strong>{post.fileName}</strong>
                            <span>
                              {((post.fileSize || 0) / 1024).toFixed(1)} KB ·{" "}
                              {post.downloads} 次下载
                              {post.rating ? ` · ${post.rating} 星评价` : ""}
                            </span>
                          </div>
                          <button
                            className="community-primary"
                            disabled={busy}
                            onClick={() =>
                              action(
                                () => communityApi.download(post),
                                "附件下载已开始",
                              )
                            }
                          >
                            <Download size={18} />
                            下载附件
                          </button>
                        </div>
                      )}
                      <div className="community-post-actions">
                        {post.status === "PUBLISHED" && (
                          <button
                            className="community-text-button"
                            onClick={() => {
                              setReason("");
                              setReporting(true);
                            }}
                          >
                            <Flag size={16} />
                            举报内容
                          </button>
                        )}
                        {(profile.userId === post.authorId || canAdmin) && (
                          <button
                            className="community-text-button danger"
                            disabled={busy}
                            onClick={() => removePost(post)}
                          >
                            <Trash2 size={16} />
                            删除帖子
                          </button>
                        )}
                        {canAdmin && (
                          <Link
                            className="community-text-button"
                            to="/community/admin"
                          >
                            <ShieldCheck size={17} />
                            前往管理中心
                          </Link>
                        )}
                      </div>
                    </article>
                    <section className="community-comments">
                      <h3>
                        评价与修改建议 <span>{post.commentCount}</span>
                      </h3>
                      {post.status === "PUBLISHED" ? (
                        <form
                          onSubmit={submitComment}
                          className="community-comment-form"
                        >
                          <label htmlFor="community-comment">
                            写下具体建议，让分享更有帮助
                          </label>
                          <textarea
                            id="community-comment"
                            placeholder="例如：工作经历可以增加可量化的成果，版面留白很舒服…"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            minLength={2}
                            maxLength={2000}
                            required
                            rows={3}
                          />
                          <div className="community-comment-footer">
                            <div
                              className="community-rating"
                              role="group"
                              aria-label="可选星级评价"
                            >
                              <span>评价</span>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  type="button"
                                  key={n}
                                  aria-label={`${n} 星`}
                                  aria-pressed={rating === n}
                                  onClick={() =>
                                    setRating(rating === n ? 0 : n)
                                  }
                                >
                                  <Star
                                    size={21}
                                    fill={rating >= n ? "#f59e0b" : "none"}
                                    color={rating >= n ? "#d97706" : "#64748b"}
                                  />
                                </button>
                              ))}
                            </div>
                            <button
                              className="community-primary"
                              disabled={busy || comment.trim().length < 2}
                            >
                              发表建议
                              <ArrowRight size={18} />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="community-review-note">
                          帖子公开后可以参与评价与讨论。
                        </p>
                      )}
                      {!post.comments?.length && (
                        <p className="community-empty-comment">
                          还没有评价，你的建议可以成为第一份帮助。
                        </p>
                      )}
                      {post.comments?.map((c) => (
                        <article key={c.id} className="community-comment">
                          <Avatar name={c.author} />
                          <div>
                            <div className="community-comment-meta">
                              <strong>{c.author}</strong>
                              {c.isExample && (
                                <span className="community-example-reply">
                                  示例回复
                                </span>
                              )}
                              <time>{date(c.createdAt)}</time>
                              {c.rating && (
                                <span className="community-stars">
                                  {"★".repeat(c.rating)}
                                </span>
                              )}
                            </div>
                            <p>{c.content}</p>
                            {(profile.userId === c.authorId || canAdmin) && (
                              <button
                                className="community-text-button danger"
                                disabled={busy}
                                onClick={() => {
                                  if (window.confirm("确定删除这条评论？"))
                                    action(
                                      () => communityApi.removeComment(c.id),
                                      "评论已删除",
                                    );
                                }}
                              >
                                删除评论
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </section>
                  </>
                )
              )}
            </>
          ) : (
            <>
              <div className="community-channel-heading">
                <div>
                  <span>
                    {admin
                      ? "MODERATION QUEUE"
                      : mine
                        ? "YOUR CONTRIBUTIONS"
                        : "CHANNEL / " + channel}
                  </span>
                  <h2>
                    <Hash />
                    {admin
                      ? statusNames[status] + "帖子"
                      : mine
                        ? "我的分享"
                        : channels.find((c) => c.id === channel)?.name}
                  </h2>
                  <p>
                    {admin
                      ? "每一次审核，都是对社区内容质量的守护。"
                      : mine
                        ? "查看分享状态、审核反馈与讨论。"
                        : channels.find((c) => c.id === channel)?.description}
                  </p>
                </div>
                <span className="community-feed-count">
                  {feed.total} 篇分享
                </span>
              </div>
              {!admin && !mine && channel === "DISCUSSION" && (
                <div
                  className="community-topic-filters"
                  role="group"
                  aria-label="讨论话题筛选"
                >
                  <button
                    className={!topic ? "is-active" : ""}
                    onClick={() => setTopic("")}
                  >
                    全部话题
                  </button>
                  {topics.map((t) => (
                    <button
                      key={t}
                      className={topic === t ? "is-active" : ""}
                      onClick={() => setTopic(t)}
                    >
                      {t}
                      <span>
                        {feed.topicCounts?.find((c) => c.topic === t)?.count ??
                          0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!admin && (
                <form
                  className="community-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPage(0);
                    setSearch(query.trim());
                  }}
                >
                  <Search size={20} />
                  <input
                    aria-label="搜索社区内容"
                    placeholder="搜索场景、经验或关键词…"
                    value={query}
                    maxLength={100}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button type="submit">搜索</button>
                </form>
              )}
              {loading ? (
                <div className="community-state" role="status">
                  正在加载频道内容…
                </div>
              ) : error ? (
                <div className="community-state" role="alert">
                  {error}
                  <button onClick={reload}>重新加载</button>
                </div>
              ) : !feed.items.length ? (
                <div className="community-state">
                  <span className="community-empty-orb">
                    <FileText size={36} />
                  </span>
                  <h3>
                    {admin
                      ? "当前没有" + statusNames[status] + "帖子"
                      : search
                        ? "没有找到相关分享"
                        : mine
                          ? "还没有发布分享"
                          : "成为这个频道的第一位分享者"}
                  </h3>
                  <p>
                    {admin
                      ? "新的投稿会显示在待审核列表。"
                      : search
                        ? "试试其他关键词，或切换频道。"
                        : "一个具体问题、一段经验、一条建议，都可能帮助到正在准备面试的人。"}
                  </p>
                  {!admin && (
                    <button
                      className="community-primary"
                      onClick={() => setPosting(true)}
                    >
                      <Plus size={18} />
                      发布我的分享
                    </button>
                  )}
                </div>
              ) : (
                <div className="community-feed">
                  {feed.items.map((p) => (
                    <article
                      className={`community-post-card ${p.coverImage ? "has-cover" : ""}`}
                      key={p.id}
                    >
                      {p.coverImage && (
                        <Link
                          to={`/community/posts/${p.id}`}
                          className="community-card-cover"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <img src={p.coverImage} alt="" loading="lazy" />
                          <span>{p.topic}</span>
                        </Link>
                      )}
                      <div className="community-post-tags">
                        <span>
                          {channels.find((c) => c.id === p.channel)?.name}
                        </span>
                        {p.isExample && (
                          <span className="community-example-tag">
                            原创示例
                          </span>
                        )}
                        {p.pinned && (
                          <span>
                            <Pin size={14} />
                            置顶
                          </span>
                        )}
                        {(mine || admin) && (
                          <span className={`status-${p.status.toLowerCase()}`}>
                            {statusNames[p.status]}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/community/posts/${p.id}`}
                        className="community-post-title"
                      >
                        {p.title}
                        <ArrowRight size={21} />
                      </Link>
                      <p className="community-excerpt">
                        {p.content.split("\n\n")[0]}
                      </p>
                      {p.fileName && (
                        <div className="community-file-caption">
                          <FileText size={16} />
                          <span>{p.fileName}</span>
                        </div>
                      )}
                      {p.moderationNote && (mine || admin) && (
                        <p className="community-review-note">
                          {p.moderationNote}
                        </p>
                      )}
                      {p.isExample && (
                        <p className="community-example-note">
                          含 {p.exampleCommentCount} 条示例回复 ·
                          欢迎补充真实经验
                        </p>
                      )}
                      <div className="community-card-footer">
                        <div className="community-author">
                          <Avatar name={p.author} />
                          <strong>{p.author}</strong>
                          <time>{date(p.createdAt)}</time>
                        </div>
                        <div className="community-metrics">
                          <span>
                            <MessageCircle size={16} />
                            {p.commentCount}
                          </span>
                          {p.fileName && (
                            <span>
                              <Download size={16} />
                              {p.downloads}
                            </span>
                          )}
                          {p.rating && (
                            <span>
                              <Star size={16} />
                              {p.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      {admin && (
                        <div className="community-moderation-actions">
                          {p.status !== "PUBLISHED" && (
                            <button
                              disabled={busy}
                              onClick={() => moderate(p, "APPROVE")}
                            >
                              <CheckCircle2 size={17} />
                              {p.status === "PENDING" ? "审核通过" : "恢复公开"}
                            </button>
                          )}
                          {p.status === "PENDING" && (
                            <button
                              disabled={busy}
                              onClick={() => moderate(p, "REJECT")}
                            >
                              驳回
                            </button>
                          )}
                          {p.status === "PUBLISHED" && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  moderate(p, p.pinned ? "UNPIN" : "PIN")
                                }
                              >
                                <Pin size={17} />
                                {p.pinned ? "取消置顶" : "置顶"}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => moderate(p, "HIDE")}
                              >
                                下架
                              </button>
                            </>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => removePost(p)}
                            className="danger"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {feed.total > (admin ? 20 : 12) && (
                <div className="community-pagination">
                  <button
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一页
                  </button>
                  <span>
                    {page + 1} / {Math.ceil(feed.total / (admin ? 20 : 12))}
                  </span>
                  <button
                    disabled={
                      (page + 1) * (admin ? 20 : 12) >= feed.total || loading
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </button>
                </div>
              )}
              {admin && (
                <section className="community-reports">
                  <h3>
                    <Flag size={20} />
                    待处理举报 <span>{reports.length}</span>
                  </h3>
                  {reports.length ? (
                    reports.map((r) => (
                      <article key={r.id}>
                        <Link to={`/community/posts/${r.postId}`}>
                          {r.title}
                        </Link>
                        <p>{r.reason}</p>
                        <small>
                          {r.author} · {date(r.createdAt)}
                        </small>
                        <button
                          disabled={busy}
                          onClick={() =>
                            action(
                              () => communityApi.resolve(r.id),
                              "举报已标记处理",
                            )
                          }
                        >
                          标记已处理
                        </button>
                      </article>
                    ))
                  ) : (
                    <p>暂无待处理举报。</p>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      </div>
      {posting && (
        <PublishDialog
          initialChannel={channel}
          canAdmin={canAdmin}
          onClose={() => setPosting(false)}
          onCreated={(id) => {
            setPosting(false);
            navigate(`/community/posts/${id}`);
            reload();
          }}
        />
      )}
      {reporting && post && (
        <div className="community-modal-backdrop">
          <section
            className="community-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <button
              className="community-modal-close"
              aria-label="关闭举报"
              onClick={() => setReporting(false)}
            >
              <X />
            </button>
            <h2 id="report-title">举报内容</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await action(
                    () => communityApi.report(post.id, reason),
                    "举报已提交给管理员",
                  )
                )
                  setReporting(false);
              }}
            >
              <label htmlFor="report-reason">请说明具体问题</label>
              <textarea
                id="report-reason"
                autoFocus
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              <button className="community-primary" disabled={busy}>
                提交举报
              </button>
            </form>
          </section>
        </div>
      )}
      {moderation && (
        <div className="community-modal-backdrop">
          <section
            className="community-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderate-title"
          >
            <button
              className="community-modal-close"
              aria-label="关闭管理操作"
              onClick={() => setModeration(null)}
            >
              <X />
            </button>
            <h2 id="moderate-title">
              {moderation.action === "REJECT" ? "驳回分享" : "下架分享"}
            </h2>
            <p>{moderation.post.title}</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await action(
                    () =>
                      communityApi.moderate(
                        moderation.post.id,
                        moderation.action,
                        note,
                      ),
                    "管理操作已保存",
                  )
                )
                  setModeration(null);
              }}
            >
              <label htmlFor="moderate-note">原因（作者可见）</label>
              <textarea
                id="moderate-note"
                autoFocus
                required
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
              <button className="community-primary" disabled={busy}>
                确认保存
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function PublishDialog({
  initialChannel,
  canAdmin,
  onClose,
  onCreated,
}: {
  initialChannel: string;
  canAdmin: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [channel, setChannel] = useState(
    initialChannel === "ANNOUNCEMENTS" && !canAdmin
      ? "DISCUSSION"
      : initialChannel,
  );
  const [topic, setTopic] = useState("面试复盘");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose, busy]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (file && file.size > 10 * 1024 * 1024) {
      setError("文件不能超过 10MB");
      return;
    }
    setBusy(true);
    try {
      const f = new FormData();
      f.set("channel", channel);
      f.set("title", title);
      f.set("content", content);
      f.set("topic", topic);
      if (file) f.set("file", file);
      const result = await communityApi.create(f);
      toast.success("分享已发布");
      onCreated(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="community-modal-backdrop">
      <section
        className="community-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
      >
        <button
          className="community-modal-close"
          disabled={busy}
          aria-label="关闭发布窗口"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="community-eyebrow">SHARE SOMETHING GREAT</div>
        <h2 id="publish-title">分享你的下一份灵感</h2>
        <p>上传前移除个人信息，只分享你有权公开的内容。</p>
        <form onSubmit={submit}>
          <label htmlFor="publish-channel">发布频道</label>
          <select
            id="publish-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {channels
              .filter((c) => canAdmin || c.id !== "ANNOUNCEMENTS")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <label htmlFor="publish-topic">讨论话题</label>
          <select
            id="publish-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label htmlFor="publish-name">标题</label>
          <input
            id="publish-name"
            autoFocus
            required
            minLength={3}
            maxLength={120}
            placeholder="例如：项目介绍总被打断，怎样讲清个人贡献？"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="publish-content">具体场景与讨论内容</label>
          <textarea
            id="publish-content"
            required
            minLength={10}
            maxLength={10000}
            rows={5}
            placeholder="说说遇到的具体场景、你尝试过的方法，以及希望大家讨论的问题。支持 Markdown 分段、列表与强调。"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <label htmlFor="publish-file">附件（可选）</label>
          <input
            id="publish-file"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <small>PDF / DOC / DOCX / UTF-8 TXT · 最大 10MB</small>
          {error && (
            <p className="community-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="community-primary" disabled={busy}>
            {busy ? "正在发布…" : "发布分享"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
