"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePostPages, useConnectionPages, useMyProfile, useProfile, qk } from "@/lib/queries";
import { displayError, uniqueById } from "@/lib/api";
import { useAppSelector } from "@/lib/store";
import { Avatar, EmptyState, PageHeading, Button, LoadingRows } from "@/components/ui";
import { PostCard, PostGrid } from "@/components/post-card";
import { FollowButton, UserCard } from "@/components/user-card";

type ListingKind = "posts" | "likes" | "saved" | "followers" | "following";
const labels: Record<ListingKind, { title: string; intro: string; empty: string }> = {
  posts: { title: "My posts", intro: "Moments you have shared.", empty: "No posts yet. Share your first moment." },
  likes: { title: "Liked", intro: "Posts you have liked.", empty: "No liked posts yet. Posts you like will appear here." },
  saved: { title: "Saved", intro: "Stories you want to save.", empty: "No saved posts yet. Bookmark a post to read it later." },
  followers: { title: "Followers", intro: "People who follow your stories.", empty: "No followers yet." },
  following: { title: "Following", intro: "People you follow.", empty: "You are not following anyone yet. Find people to get started." },
};

export function ListingView({ kind, username, mine = true }: { kind: ListingKind; username?: string; mine?: boolean }) {
  return kind === "followers" || kind === "following" ? <ConnectionListing kind={kind} username={username} mine={mine}/> : <PostListing kind={kind}/>;
}

function PostListing({ kind }: { kind: "posts" | "likes" | "saved" }) {
  const config = kind === "posts" ? { key: qk.myPosts, path: "/me/posts", title: "My posts" } : kind === "likes" ? { key: qk.likes, path: "/me/likes", title: "Liked" } : { key: qk.saved, path: "/me/saved", title: "Saved" };
  const query = usePostPages(config.key, config.path);
  const sentinel = useRef<HTMLDivElement>(null);
  const items = useMemo(() => uniqueById(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  useEffect(() => {
    if (!sentinel.current || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) query.fetchNextPage(); }, { rootMargin: "300px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  const copy = labels[kind];
  return <><PageHeading eyebrow="My account" title={copy.title} description={copy.intro} action={kind === "posts" ? <Link href="/posts/new" className="rounded-xl bg-[#7138f5] px-3 py-2.5 text-xs font-semibold">Create post</Link> : undefined}/>
    {query.isLoading ? <LoadingRows count={2}/> : query.error ? <div className="rounded-2xl border border-[#242832] bg-[#0b0d12] p-6 text-center"><p className="text-sm text-rose-200">{displayError(query.error)}</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}>Try again</Button></div> : items.length ? <div className="space-y-5">{items.map((post: any) => <PostCard key={post.id} post={post} owner={kind === "posts"}/>)}</div> : <EmptyState title={kind === "posts" ? "Your story starts here" : "No stories here yet"} detail={copy.empty} action={kind === "posts" ? { label: "Share your first post", href: "/posts/new" } : undefined}/>}
    <div ref={sentinel} className="h-3"/>{query.isFetchingNextPage && <div className="py-5"><LoadingRows count={1}/></div>}{query.hasNextPage && <div className="py-4 text-center"><Button variant="outline" onClick={() => query.fetchNextPage()}>Load more</Button></div>}
  </>;
}

function ConnectionListing({ kind, username, mine }: { kind: "followers" | "following"; username?: string; mine: boolean }) {
  const ownUser = useAppSelector((s) => s.auth.user) as any;
  const query = useConnectionPages(username || ownUser?.username || "", kind, mine);
  const sentinel = useRef<HTMLDivElement>(null);
  const users = useMemo(() => uniqueById(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  const copy = labels[kind];
  useEffect(() => {
    if (!sentinel.current || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) query.fetchNextPage(); }, { rootMargin: "300px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  return <><PageHeading eyebrow={mine ? "My account" : `@${username}`} title={mine ? copy.title : `${copy.title} ${username}`} description={copy.intro}/>
    {query.isLoading ? <LoadingRows count={3}/> : query.error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.06] p-4 text-sm text-rose-200">{displayError(query.error)}<Button variant="outline" size="sm" className="ml-3" onClick={() => query.refetch()}>Try again</Button></div> : users.length ? <div className="space-y-2">{users.map((user: any) => <UserCard key={user.id || user.username} user={{ ...user, isFollowing: mine && kind === "following" ? true : user.isFollowing }}/>)}</div> : <EmptyState title={kind === "followers" ? "No followers yet" : "Not following anyone yet"} detail={copy.empty} action={kind === "following" && mine ? { label: "Find people", href: "/users/search" } : undefined}/>}
    <div ref={sentinel} className="h-3"/>{query.isFetchingNextPage && <div className="py-5"><LoadingRows count={1}/></div>}{query.hasNextPage && <div className="py-4 text-center"><Button variant="outline" onClick={() => query.fetchNextPage()}>Load more</Button></div>}
  </>;
}

export function ProfileView({ username, mine = false }: { username: string; mine?: boolean }) { return <ProfileContent username={username} mine={mine}/>; }

function ProfileContent({ username, mine }: { username: string; mine: boolean }) {
  const ownQuery = useMyProfile(mine);
  const publicQuery = useProfile(username, !mine);
  const data = mine ? ownQuery.data : publicQuery.data;
  const error = mine ? ownQuery.error : publicQuery.error;
  const loading = mine ? ownQuery.isLoading : publicQuery.isLoading;
  const [tab, setTab] = useState<"posts" | "likes">("posts");
  const router = useRouter();
  const postPath = mine ? "/me/posts" : `/users/${encodeURIComponent(username)}/posts`;
  const postKey = mine ? qk.myPosts : qk.profilePosts(username, "posts");
  const postsQuery = usePostPages(postKey, postPath, ["posts", "items"], tab === "posts");
  const likedPath = mine ? "/me/likes" : `/users/${encodeURIComponent(username)}/likes`;
  const likedKey = mine ? qk.likes : qk.profilePosts(username, "likes");
  const likesQuery = usePostPages(likedKey, likedPath, ["posts", "likes", "items"], tab === "likes");
  const query = tab === "posts" ? postsQuery : likesQuery;
  const posts = useMemo(() => uniqueById(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) query.fetchNextPage(); }, { rootMargin: "300px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [tab, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  if (loading) return <div className="py-4"><LoadingRows count={1}/></div>;
  if (error || !data) return <div className="py-8 text-center text-sm text-rose-200">{displayError(error)}<div><Button variant="outline" className="mt-4" onClick={() => (mine ? ownQuery.refetch() : publicQuery.refetch())}>Try again</Button></div></div>;
  const own = data as any;
  const stats = own.stats ?? {};
  const reportedPosts = [own.postsCount, own.posts_count, own.postCount, own.post_count, own.totalPosts, own.total_posts, stats.posts, stats.postsCount, stats.posts_count, stats.totalPosts, stats.total_posts].map((value) => Number(value)).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  const postsInProfile = uniqueById(postsQuery.data?.pages.flatMap((page) => page.items) ?? []).length;
  const statPosts = Math.max(Number.isFinite(reportedPosts) ? reportedPosts : 0, postsInProfile);
  const following = Boolean(own.isFollowing);
  const copy = tab === "posts" ? "Your story starts here" : "No liked posts yet";
  return <>
    <div className="mb-6 overflow-hidden rounded-2xl border border-white/[.06] bg-[#0b0d12]"><div className="h-24 bg-[radial-gradient(ellipse_at_20%_110%,rgba(113,56,245,.5),transparent_55%),linear-gradient(135deg,#13131a,#0b0d12_70%)] sm:h-32"/><div className="px-5 pb-5 sm:px-7"><div className="-mt-10 flex flex-wrap items-end justify-between gap-3"><Avatar src={own.avatar} name={own.name} size="lg" className="size-[82px] border-4 border-[#0b0d12]"/><div>{mine ? <Button variant="outline" onClick={() => router.push("/me/edit")}>Edit profile</Button> : <FollowButton username={username} following={following}/>}</div></div>
      <div className="mt-3"><h1 className="text-xl font-bold">{own.name}</h1><p className="mt-1 text-sm text-[#8b909c]">@{own.username}</p>{own.bio && <p className="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-6 text-[#d0d2da]">{own.bio}</p>}</div>
      <div className="mt-5 grid grid-cols-4 divide-x divide-[#242731] rounded-xl border border-[#20232b] bg-black/20 py-3 text-center"><div><div className="font-bold tabular-nums">{statPosts}</div><div className="mt-1 text-[11px] text-[#8c919d]">Posts</div></div><Link href={mine ? "/me/followers" : `/profile/${encodeURIComponent(username)}/followers`} className="hover:text-[#c6aeff]"><div className="font-bold tabular-nums">{own.followersCount}</div><div className="mt-1 text-[11px] text-[#8c919d]">Followers</div></Link><Link href={mine ? "/me/following" : `/profile/${encodeURIComponent(username)}/following`} className="hover:text-[#c6aeff]"><div className="font-bold tabular-nums">{own.followingCount}</div><div className="mt-1 text-[11px] text-[#8c919d]">Following</div></Link><button onClick={() => setTab("likes")} className="hover:text-[#c6aeff]"><div className="font-bold tabular-nums">{own.likesCount ?? 0}</div><div className="mt-1 text-[11px] text-[#8c919d]">Liked</div></button></div></div></div>
    <div className="mb-4 flex border-b border-[#22252e]"><button onClick={() => setTab("posts")} className={`flex-1 border-b-2 px-3 py-3 text-sm font-semibold ${tab === "posts" ? "border-[#9c72ff] text-white" : "border-transparent text-[#858a96]"}`}>Posts</button><button onClick={() => setTab("likes")} className={`flex-1 border-b-2 px-3 py-3 text-sm font-semibold ${tab === "likes" ? "border-[#9c72ff] text-white" : "border-transparent text-[#858a96]"}`}>Liked</button>{mine && <button onClick={() => router.push("/me/saved")} className="flex-1 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-[#858a96] hover:text-white">Saved</button>}</div>
    {query.isLoading ? <LoadingRows count={1}/> : query.error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.06] p-4 text-sm text-rose-200">{displayError(query.error)}<Button variant="outline" size="sm" className="ml-3" onClick={() => query.refetch()}>Try again</Button></div> : posts.length ? <><PostGrid posts={posts}/><div ref={sentinel} className="h-4"/>{query.isFetchingNextPage && <p className="py-5 text-center text-xs text-[#8c919d]">Loading more posts…</p>}</> : <EmptyState title={copy} detail={tab === "posts" ? "Share your first moment and make this profile your own." : mine ? "Posts you like will appear here." : "Liked posts for this account are not available."} action={mine && tab === "posts" ? { label: "Share your first post", href: "/posts/new" } : undefined}/>}
  </>;
}
