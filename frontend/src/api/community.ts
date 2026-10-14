import { request } from "./request";
export interface Comment {
  id: number;
  authorId: number;
  author: string;
  content: string;
  rating: number | null;
  createdAt: string;
  isExample?: boolean;
}
export interface Post {
  id: number;
  authorId: number;
  author: string;
  channel: string;
  title: string;
  content: string;
  status: string;
  pinned: boolean;
  fileName: string | null;
  fileSize: number | null;
  downloads: number;
  moderationNote: string;
  createdAt: string;
  commentCount: number;
  rating: number | null;
  comments?: Comment[];
  isExample: boolean;
  exampleCommentCount: number;
  topic: string;
  coverImage: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}
export interface Feed {
  items: Post[];
  total: number;
  page: number;
  pageSize?: number;
  topicCounts?: { topic: string; count: number }[];
}
export interface Report {
  id: number;
  postId: number;
  title: string;
  author: string;
  reason: string;
  createdAt: string;
}
export const communityApi = {
  gallery: () => request.get<Post[]>("/api/community/gallery"),
  list: (params: {
    topic?: string;
    channel?: string;
    q?: string;
    mine?: boolean;
    page?: number;
  }) => request.get<Feed>("/api/community/posts", { params }),
  detail: (id: number) => request.get<Post>(`/api/community/posts/${id}`),
  create: (form: FormData) =>
    request.upload<{ id: number }>("/api/community/posts", form),
  remove: (id: number) => request.delete(`/api/community/posts/${id}`),
  comment: (id: number, content: string, rating?: number) =>
    request.post(`/api/community/posts/${id}/comments`, { content, rating }),
  removeComment: (id: number) =>
    request.delete(`/api/community/comments/${id}`),
  report: (id: number, reason: string) =>
    request.post(`/api/community/posts/${id}/reports`, { reason }),
  adminList: (status: string, page: number) =>
    request.get<Feed>("/api/admin/community/posts", {
      params: { status, page },
    }),
  moderate: (id: number, action: string, note = "") =>
    request.put(`/api/admin/community/posts/${id}`, { action, note }),
  reports: () => request.get<Report[]>("/api/admin/community/reports"),
  resolve: (id: number) =>
    request.put(`/api/admin/community/reports/${id}/resolve`),
  download: async (post: Post) => {
    const res = await request
      .getInstance()
      .get(`/api/community/posts/${post.id}/download`, {
        responseType: "blob",
      });
    const blob = res.data as Blob;
    if (blob.type.includes("json")) {
      const result = JSON.parse(await blob.text());
      throw new Error(result.message || "下载失败");
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = post.fileName || "resume-template";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
