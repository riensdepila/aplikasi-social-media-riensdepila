export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://be-social-media-api-production.up.railway.app/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof FormData !== "undefined" && !(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sociality_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" }); }
  catch { throw new ApiError("Could not connect to the server. Check your internet connection and try again.", 0); }
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
  if (!response.ok) {
    const message = payload?.message || payload?.error || (response.status === 401 ? "Your session has expired. Please sign in again." : response.status === 403 ? "You are not allowed to access this." : response.status === 404 ? "The requested data was not found." : response.status === 413 ? "The file is too large. Choose a smaller image." : response.status === 429 ? "Too many requests. Please wait a moment and try again." : response.status >= 500 ? "The server is having trouble. Please try again shortly." : "Something went wrong. Please try again.");
    throw new ApiError(typeof message === "string" ? message : "The request failed. Please try again.", response.status);
  }
  return payload as T;
}

export const unwrap = (response: any): any => response?.data ?? response?.result ?? response;
export function listFrom(response: any, keys: string[] = []): any[] {
  const root = unwrap(response);
  if (Array.isArray(root)) return root;
  const candidates = [...keys, "posts", "users", "comments", "followers", "following", "likes", "saved", "savedPosts", "likedPosts", "items", "results", "data"];
  for (const key of candidates) if (Array.isArray(root?.[key])) return root[key];
  for (const nest of [root?.data, root?.result, root?.payload]) {
    if (Array.isArray(nest)) return nest;
    if (nest && typeof nest === "object") for (const key of candidates) if (Array.isArray(nest[key])) return nest[key];
  }
  return [];
}

export function pageMeta(response: any, items: any[], page: number, limit: number) {
  const root = unwrap(response);
  const meta = root?.pagination ?? root?.meta ?? root?.pageInfo ?? root?.data?.pagination ?? {};
  const hasMore = meta.hasNextPage ?? meta.hasMore ?? (meta.nextPage != null ? true : meta.next != null ? true : undefined);
  const next = meta.nextPage ?? (meta.currentPage != null ? Number(meta.currentPage) + 1 : page + 1);
  return { items, nextPage: hasMore === true || (hasMore == null && items.length === limit) ? Number(next) : undefined };
}

export const userShape = (raw: any) => {
  const u = raw?.user ?? raw?.author ?? raw?.profile ?? raw ?? {};
  const stats = u.stats ?? u.counts ?? raw?.stats ?? raw?.counts ?? {};
  const followers = u.followersCount ?? u.followers_count ?? u.followerCount ?? u.follower_count ?? u.totalFollowers ?? stats.followersCount ?? stats.followers_count ?? stats.followers ?? stats.totalFollowers ?? (Array.isArray(u.followers) ? u.followers.length : 0);
  const following = u.followingCount ?? u.following_count ?? u.totalFollowing ?? stats.followingCount ?? stats.following_count ?? stats.following ?? stats.totalFollowing ?? (Array.isArray(u.following) ? u.following.length : 0);
  const toCount = (value: unknown) => {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  };

  return {
    ...u,
    id: u.id ?? u._id ?? u.userId ?? u.username,
    name: u.name ?? u.displayName ?? u.fullName ?? u.username ?? "User Sociality",
    username: String(u.username ?? u.handle ?? "unknown").replace(/^@/, ""),
    avatar: u.avatarUrl ?? u.avatar_url ?? u.avatar ?? u.profileImage ?? u.profile_image ?? u.profilePicture ?? u.profile_picture ?? "",
    bio: u.bio ?? u.about ?? "",
    followersCount: toCount(followers),
    followingCount: toCount(following),
    postsCount: u.postsCount ?? u.posts_count ?? u.postCount ?? u.post_count ?? u.totalPosts ?? u.total_posts ?? stats.posts ?? stats.postsCount ?? stats.posts_count ?? stats.totalPosts ?? stats.total_posts ?? (Array.isArray(u.posts) ? u.posts.length : 0),
    likesCount: u.likesCount ?? stats.likes ?? stats.likesCount ?? 0,
    savedCount: u.savedCount ?? stats.saved ?? stats.savedCount ?? 0,
    isFollowing: Boolean(u.isFollowing ?? u.is_following ?? u.followingStatus ?? raw?.isFollowing),
  };
};

export const postShape = (raw: any) => {
  const p = raw?.post ?? raw ?? {};
  const author = userShape(p.author ?? p.user ?? p.creator ?? {});
  return { ...p, id: String(p.id ?? p._id ?? p.postId ?? ""), image: p.image ?? p.imageUrl ?? p.photo ?? p.mediaUrl ?? p.url ?? "", caption: p.caption ?? p.description ?? "", author, createdAt: p.createdAt ?? p.created_at ?? p.timestamp ?? new Date().toISOString(), likesCount: p.likesCount ?? p.likeCount ?? (typeof p.likes === "number" ? p.likes : Array.isArray(p.likes) ? p.likes.length : 0), commentsCount: p.commentsCount ?? p.commentCount ?? (typeof p.comments === "number" ? p.comments : Array.isArray(p.comments) ? p.comments.length : 0), isLiked: Boolean(p.isLiked ?? p.liked ?? p.likedByMe ?? p.is_liked), isSaved: Boolean(p.isSaved ?? p.saved ?? p.savedByMe ?? p.is_saved) };
};

export const displayError = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
export function uniqueById<T extends { id?: string | number; username?: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) seen.set(String(item.id ?? item.username ?? seen.size), item);
  return [...seen.values()];
}


