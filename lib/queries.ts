"use client";

import { type QueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, listFrom, pageMeta, postShape, userShape, unwrap } from "@/lib/api";

export const qk = {
  feed: ["posts", "feed"] as const,
  explore: ["posts", "explore"] as const,
  profile: (username: string) => ["profile", username] as const,
  profilePosts: (username: string, tab = "posts") => ["posts", "profile", username, tab] as const,
  myPosts: ["posts", "mine"] as const,
  detail: (id: string) => ["post", id] as const,
  saved: ["posts", "saved"] as const,
  likes: ["posts", "liked"] as const,
  comments: (id: string) => ["comments", id] as const,
};

const fetchPostPages = async (path: string, keys: string[], page: number) => {
  const limit = 20;
  const result = await api<any>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`);
  return pageMeta(result, listFrom(result, keys).map(postShape), page, limit);
};
const fetchUserPages = async (path: string, keys: string[], page: number) => {
  const limit = 20;
  const result = await api<any>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`);
  return pageMeta(result, listFrom(result, keys).map(userShape), page, limit);
};

export function usePostPages(key: readonly unknown[], path: string, keys: string[] = ["posts", "items"], enabled = true) {
  return useInfiniteQuery({ queryKey: key, enabled, queryFn: ({ pageParam }) => fetchPostPages(path, keys, Number(pageParam)), initialPageParam: 1, getNextPageParam: (last) => last.nextPage });
}
export function useUserPages(key: readonly unknown[], path: string, keys: string[] = ["users", "followers", "following", "items"], enabled = true) {
  return useInfiniteQuery({ queryKey: key, enabled, queryFn: ({ pageParam }) => fetchUserPages(path, keys, Number(pageParam)), initialPageParam: 1, getNextPageParam: (last) => last.nextPage });
}
export function useFeedPosts() { return usePostPages(qk.feed, "/feed"); }
export function useExplorePosts() { return usePostPages(qk.explore, "/posts"); }
export function useMyPosts(enabled = true) { return usePostPages(qk.myPosts, "/me/posts", ["posts", "items"], enabled); }
export function useSavedPosts() { return usePostPages(qk.saved, "/me/saved"); }
export function useLikedPosts() { return usePostPages(qk.likes, "/me/likes"); }
export function usePublicPosts(username: string, mode: "posts" | "likes" = "posts", enabled = true) { return usePostPages(qk.profilePosts(username, mode), `/users/${encodeURIComponent(username)}/${mode}`, ["posts", "items"], enabled); }
export function useComments(id: string) {
  return useInfiniteQuery({ queryKey: qk.comments(id), queryFn: async ({ pageParam }) => {
    const page = Number(pageParam), limit = 10;
    const response = await api<any>(`/posts/${encodeURIComponent(id)}/comments?page=${page}&limit=${limit}`);
    const comments = listFrom(response, ["comments", "items"]).map((c) => ({ ...c, id: String(c.id ?? c._id ?? c.commentId ?? ""), text: c.text ?? c.content ?? "", author: userShape(c.author ?? c.user ?? {}) }));
    return pageMeta(response, comments, page, limit);
  }, initialPageParam: 1, getNextPageParam: (last) => last.nextPage });
}
export function useProfile(username: string, enabled = true) { return useQuery({ queryKey: qk.profile(username), enabled, queryFn: async () => userShape(unwrap(await api<any>(`/users/${encodeURIComponent(username)}`))) }); }
export function useMyProfile(enabled = true) { return useQuery({ queryKey: ["profile", "me"], enabled, queryFn: async () => userShape(unwrap(await api<any>("/me"))) }); }

export function syncUserAvatarInCache(queryClient: QueryClient, user: any, previousUser?: any) {
  const identities = [user?.id, user?._id, user?.userId, previousUser?.id, previousUser?._id, previousUser?.userId]
    .filter((value) => value != null && String(value).length > 0)
    .map(String);
  const usernames = [user?.username, user?.handle, previousUser?.username, previousUser?.handle]
    .filter((value) => typeof value === "string" && value.length > 0)
    .map((value) => value.replace(/^@/, "").toLowerCase());
  const avatar = [user?.avatarUrl, user?.avatar_url, user?.avatar, user?.profileImage, user?.profile_image, user?.profilePicture, user?.profile_picture]
    .find((value) => typeof value === "string" && value.length > 0);
  if (!avatar || (!identities.length && !usernames.length)) return;

  const sync = (value: any): any => {
    if (Array.isArray(value)) {
      let changed = false;
      const next = value.map((item) => {
        const updated = sync(item);
        if (updated !== item) changed = true;
        return updated;
      });
      return changed ? next : value;
    }
    if (!value || typeof value !== "object" || value instanceof Date) return value;

    const id = value.id ?? value._id ?? value.userId;
    const username = value.username ?? value.handle;
    const matchesId = id != null && identities.includes(String(id));
    const matchesUsername = typeof username === "string" && usernames.includes(username.replace(/^@/, "").toLowerCase());
    const matchesUser = matchesId || matchesUsername;
    const needsAvatarSync = matchesUser && [value.avatar, value.avatarUrl, value.avatar_url, value.profileImage, value.profile_image, value.profilePicture, value.profile_picture].some((candidate) => candidate !== avatar);
    let next = needsAvatarSync
      ? { ...value, avatar, avatarUrl: avatar, avatar_url: avatar, profileImage: avatar, profile_image: avatar, profilePicture: avatar, profile_picture: avatar }
      : value;

    for (const [key, child] of Object.entries(value)) {
      if (!child || typeof child !== "object") continue;
      const updated = sync(child);
      if (updated !== child) {
        if (next === value) next = { ...value };
        next[key] = updated;
      }
    }
    return next;
  };

  for (const query of queryClient.getQueryCache().getAll()) {
    const cached = queryClient.getQueryData(query.queryKey);
    if (cached === undefined) continue;
    const updated = sync(cached);
    if (updated !== cached) queryClient.setQueryData(query.queryKey, updated);
  }
}

export function usePost(id: string) { return useQuery({ queryKey: qk.detail(id), queryFn: async () => postShape(unwrap(await api<any>(`/posts/${encodeURIComponent(id)}`))) }); }
export function useSearchUsers(query: string) { return useQuery({ queryKey: ["users", "search", query], enabled: query.trim().length > 0, queryFn: async () => {
  const params = new URLSearchParams({ q: query.trim(), page: "1", limit: "20" });
  return listFrom(await api<any>(`/users/search?${params.toString()}`), ["users", "items"]).map(userShape);
} }); }
export function useConnectionPages(username: string, kind: "followers" | "following", mine = false) {
  const path = mine ? `/me/${kind}` : `/users/${encodeURIComponent(username)}/${kind}`;
  return useUserPages(["connections", mine ? "me" : username, kind], path);
}
