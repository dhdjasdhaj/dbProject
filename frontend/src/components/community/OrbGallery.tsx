import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Hand,
  MoveUpRight,
  Orbit,
  Pause,
  Play,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { communityApi, Post } from "../../api/community";

/** Local DOM sphere: original covers, inertial rotation, keyboard controls and reduced motion. */
export default function OrbGallery() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [dragged, setDragged] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const platesRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const reduced = useReducedMotion();
  const motionRef = useRef({
    yaw: 0,
    pitch: -0.08,
    vx: 0,
    vy: 0,
    down: false,
    x: 0,
    y: 0,
    total: 0,
    last: 0,
  });
  const flags = useRef({ paused, hovered, reduced });
  flags.current = { paused, hovered, reduced };
  useEffect(() => {
    let alive = true;
    communityApi
      .gallery()
      .then((p) => {
        if (alive) setPosts(p);
      })
      .catch(() => {
        if (alive) setError("精选画廊暂时无法加载，可继续浏览下方讨论。");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !posts.length) return;
    let frame = 0,
      shown = true;
    const positions = posts.map((_, i) => {
      const y = 1 - (2 * (i + 0.5)) / posts.length;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    });
    const render = (time: number) => {
      const state = motionRef.current;
      const dt = Math.min(32, Math.max(1, time - (state.last || time)));
      state.last = time;
      const f = flags.current;
      if (
        !state.down &&
        !f.paused &&
        f.hovered === null &&
        !f.reduced &&
        shown
      ) {
        state.yaw += 0.00008 * dt + state.vx;
        state.pitch = Math.max(-0.55, Math.min(0.55, state.pitch + state.vy));
        state.vx *= 0.94;
        state.vy *= 0.94;
      }
      const width = viewport.clientWidth,
        height = viewport.clientHeight;
      const radius = Math.min(width * 0.35, height * 0.4);
      const cy = Math.cos(state.yaw),
        sy = Math.sin(state.yaw),
        cp = Math.cos(state.pitch),
        sp = Math.sin(state.pitch);
      positions.forEach((p, i) => {
        const node = platesRef.current[i];
        if (!node) return;
        const x = p.x * cy + p.z * sy;
        const z0 = -p.x * sy + p.z * cy;
        const y = p.y * cp - z0 * sp;
        const z = p.y * sp + z0 * cp;
        const perspective = 1 / (1 - z * 0.19);
        const scale =
          (0.73 + (z + 1) * 0.22) * perspective * (f.hovered === i ? 1.25 : 1);
        node.style.transform = `translate(-50%,-50%) translate(${x * radius * perspective}px,${y * radius * perspective}px) scale(${scale})`;
        node.style.zIndex = String(
          Math.round((z + 1) * 100) + (f.hovered === i ? 400 : 0),
        );
        node.style.opacity = String(
          f.hovered !== null && f.hovered !== i ? 0.16 : 0.22 + (z + 1) * 0.39,
        );
        node.style.filter = z < -0.2 ? "blur(.35px)" : "none";
        node.style.pointerEvents =
          z < -0.1 && f.hovered !== i ? "none" : "auto";
        node.tabIndex = z < -0.1 ? -1 : 0;
      });
      if (shown) frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      shown = !document.hidden;
      motionRef.current.last = 0;
      if (shown) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [posts]);
  const rotate = (direction: number) => {
    motionRef.current.yaw += direction * 0.5;
    motionRef.current.vx = direction * 0.01;
  };
  return (
    <section className="orb-gallery" aria-labelledby="orb-gallery-title">
      <div className="orb-gallery-copy">
        <div className="orb-gallery-eyebrow">
          <Orbit size={18} /> COMMUNITY ORBIT / 话题星球
        </div>
        <h2 id="orb-gallery-title">
          每一个问题，
          <br />
          <em>都有值得交流的答案。</em>
        </h2>
        <p>
          旋转话题星球，发现简历表达、面试复盘与技术交流中的具体场景。点击一张卡片，加入讨论。
        </p>
        <div className="orb-gallery-note">
          <span>原创场景示例</span>
          <span>{posts.length} 张配图</span>
          <span>可评论交流</span>
        </div>
        <a href="#community-discussion-list" className="orb-gallery-browse">
          浏览全部讨论
          <MoveUpRight size={19} />
        </a>
        <small>场景与示例回复由编辑部整理，参考阅读见帖子详情。</small>
      </div>
      <div className="orb-gallery-stage">
        <div className="orb-gallery-sphere" aria-hidden="true" />
        <div
          className={`orb-gallery-viewport ${dragged ? "is-dragging" : ""}`}
          ref={viewportRef}
          aria-label="可拖拽的话题球形画廊"
          onPointerDown={(e) => {
            const s = motionRef.current;
            s.down = true;
            s.x = e.clientX;
            s.y = e.clientY;
            s.total = 0;
            s.vx = 0;
            s.vy = 0;
            setDragged(false);
          }}
          onPointerMove={(e) => {
            const s = motionRef.current;
            if (!s.down) return;
            const dx = e.clientX - s.x,
              dy = e.clientY - s.y;
            s.total += Math.abs(dx) + Math.abs(dy);
            s.yaw += dx * 0.004;
            s.pitch = Math.max(-0.55, Math.min(0.55, s.pitch + dy * 0.002));
            s.vx = dx * 0.001;
            s.vy = dy * 0.0004;
            s.x = e.clientX;
            s.y = e.clientY;
            if (s.total > 8) {
              if (!e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.setPointerCapture(e.pointerId);
              setDragged(true);
              setHovered(null);
            }
          }}
          onPointerUp={() => {
            motionRef.current.down = false;
            setTimeout(() => setDragged(false), 0);
          }}
          onPointerCancel={() => {
            motionRef.current.down = false;
            setDragged(false);
          }}
          onLostPointerCapture={() => {
            motionRef.current.down = false;
            setDragged(false);
          }}
          onClickCapture={(e) => {
            if (motionRef.current.total > 8) {
              e.preventDefault();
              e.stopPropagation();
              motionRef.current.total = 0;
            }
          }}
        >
          {posts.map((post, i) => (
            <Link
              key={post.id}
              ref={(node) => {
                platesRef.current[i] = node;
              }}
              to={`/community/posts/${post.id}`}
              className={`orb-gallery-plate ${hovered === i ? "is-focused" : ""}`}
              aria-label={`阅读讨论：${post.title}`}
              onMouseEnter={() => {
                if (!motionRef.current.down) setHovered(i);
              }}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            >
              <img
                src={post.coverImage || ""}
                alt={post.title}
                draggable={false}
              />
              <span>{post.topic}</span>
            </Link>
          ))}
          {!posts.length && (
            <p className="orb-gallery-loading" role="status">
              {error || (loading ? "正在装入话题星球…" : "暂无公开的精选话题，可浏览下方讨论。")}
            </p>
          )}
        </div>
        <div className="orb-gallery-controls">
          <button onClick={() => rotate(-1)} aria-label="向左旋转话题球">
            <ArrowLeft size={18} />
          </button>
          <span>
            <Hand size={15} />
            拖拽旋转 · 点击阅读
          </span>
          <button
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "继续自动旋转" : "暂停自动旋转"}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={() => rotate(1)} aria-label="向右旋转话题球">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
