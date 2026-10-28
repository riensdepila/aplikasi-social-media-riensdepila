"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { Bookmark, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Send, Trash2, X } from "lucide-react";
import { api, displayError, uniqueById } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { FollowButton } from "@/components/user-card";
import { useAppSelector } from "@/lib/store";
import { Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUserPages } from "@/lib/queries";
import { getPostFallbackImage, postFallbackIndex } from "@/lib/media";

dayjs.extend(relativeTime);

export function PostCard({ post, owner = false, onDeleted, detailComments }: { post: any; owner?: boolean; onDeleted?: (id: string) => void; detailComments?: (actions: React.ReactNode) => React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const sessionUser = useAppSelector((s) => s.auth.user) as any;
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [likes, setLikes] = useState(Number(post.likesCount || 0));
  const [comments, setComments] = useState(Number(post.commentsCount || 0));
  const [actionError, setActionError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [showLikes, setShowLikes] = useState(false);
  const [menu, setMenu] = useState(false);
  const id = String(post.id || "");
  const postImage = post.image || getPostFallbackImage(postFallbackIndex(post));
  useEffect(() => { setLiked(Boolean(post.isLiked)); setSaved(Boolean(post.isSaved)); setLikes(Number(post.likesCount || 0)); setComments(Number(post.commentsCount || 0)); }, [post.isLiked, post.isSaved, post.likesCount, post.commentsCount]);
  const likePeople = useUserPages(["likes", id], `/posts/${encodeURIComponent(id)}/likes`, ["users", "likes", "items"], showLikes && Boolean(token));
  const people = uniqueById(likePeople.data?.pages.flatMap((page) => page.items) ?? []);

  const reconcile = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["posts"] }),
    qc.invalidateQueries({ queryKey: ["post", id] }),
    qc.invalidateQueries({ queryKey: ["profile"] }),
  ]);
  const likeMutation = useMutation({ mutationFn: (next: boolean) => api(`/posts/${encodeURIComponent(id)}/like`, { method: next ? "POST" : "DELETE" }), onSuccess: reconcile, onError: (error) => setActionError(displayError(error)) });
  const saveMutation = useMutation({ mutationFn: (next: boolean) => api(`/posts/${encodeURIComponent(id)}/save`, { method: next ? "POST" : "DELETE" }), onSuccess: reconcile, onError: (error) => setActionError(displayError(error)) });
  const deleteMutation = useMutation({ mutationFn: () => api(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" }), onSuccess: async () => { onDeleted?.(id); await reconcile(); setMenu(false); }, onError: (error) => setActionError(displayError(error)) });
  const requireAuth = () => { if (!token) { router.push(`/login?returnTo=${encodeURIComponent((pathname || `/posts/${id}`) + window.location.search)}`); return false; } return true; };
  const toggleLike = () => { if (!requireAuth() || likeMutation.isPending) return; setActionError(""); const next = !liked; setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1))); trackEvent(next ? "like" : "unlike", { postId: id }); likeMutation.mutate(next, { onError: () => { setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); } }); };
  const toggleSave = () => { if (!requireAuth() || saveMutation.isPending) return; setActionError(""); const next = !saved; setSaved(next); trackEvent(next ? "save" : "unsave", { postId: id }); saveMutation.mutate(next, { onError: () => setSaved(!next) }); };
  const sharePost = async () => {
    const url = `${window.location.origin}/posts/${encodeURIComponent(id)}`;
    setShareNotice("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Sociality", text: post.caption || "View this post on Sociality", url });
        setShareNotice("Post shared.");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        copied = document.execCommand("copy");
        field.remove();
      } catch {
        copied = false;
      }
    }
    setShareNotice(copied ? "Post link copied to clipboard." : `Copy this post link: ${url}`);
  };
  const author = post.author || {};
  const username = String(author.username || "unknown").replace(/^@/, "");
  const own = owner || Boolean(sessionUser && ((sessionUser.username && sessionUser.username === username) || (sessionUser.id && sessionUser.id === author.id) || post.isMine));

  const detailActionBar = <div className="flex items-center gap-4 py-3"><button onClick={toggleLike} aria-label={liked ? "Unlike post" : "Like post"} aria-pressed={liked} className={cn("inline-flex items-center gap-1.5 transition hover:scale-105", liked ? "text-[#df367b]" : "text-[#c6c8d0] hover:text-[#df367b]")}><Heart className={cn("size-[19px]", liked && "fill-current")} /><span className="text-xs tabular-nums">{likes}</span></button><Link href={`/posts/${encodeURIComponent(id)}`} className="inline-flex items-center gap-1.5 text-[#c6c8d0] hover:text-white"><MessageCircle className="size-[19px]"/><span className="text-xs tabular-nums">{comments}</span></Link><Button variant="ghost" size="icon" className="size-8" onClick={sharePost} aria-label="Share"><Send className="size-[17px]"/></Button><button onClick={toggleSave} aria-label={saved ? "Remove from saved" : "Save post"} aria-pressed={saved} className={cn("ml-auto grid size-8 place-items-center rounded-lg transition hover:bg-white/[.05]", saved ? "text-[#a783ff]" : "text-[#aeb2bc] hover:text-white")}><Bookmark className={cn("size-[18px]", saved && "fill-current")}/></button></div>;
  if (detailComments) return <>
    <article className="overflow-hidden rounded-2xl border border-white/[.06] bg-[#0b0d12]">
      <div className="grid lg:min-h-[min(78vh,760px)] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)]">
        <div className="flex min-w-0 flex-col bg-black lg:min-h-[min(78vh,760px)]">
          <div className="px-4 pt-4 lg:hidden"><div className="mb-3 flex items-center justify-between"><Link href={`/profile/${encodeURIComponent(username)}`} className="group flex min-w-0 items-center gap-3"><Avatar src={author.avatar} name={author.name} size="sm"/><span className="min-w-0"><span className="block truncate text-sm font-semibold group-hover:text-[#c0a8ff]">{author.name}</span><span className="mt-0.5 block text-xs text-[#808592]">@{username} · {dayjs(post.createdAt).fromNow()}</span></span></Link><div className="relative"><button onClick={() => setMenu(!menu)} aria-label="Post options" className="grid size-9 place-items-center rounded-full text-[#969ba7] hover:bg-white/[.06] hover:text-white"><MoreHorizontal className="size-5"/></button>{menu && <div className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-[#2a2d37] bg-[#11141b] p-1 shadow-xl">{own && <button onClick={() => { if (window.confirm("Delete this post?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4"/>{deleteMutation.isPending ? "Deleting…" : "Delete post"}</button>}<button onClick={() => setMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#a5aab5] hover:bg-white/[.05]"><X className="size-4"/>Close menu</button></div>}</div></div></div>
          <Link href={`/posts/${encodeURIComponent(id)}`} aria-label="Post photo" className="group relative mx-auto block aspect-square w-full max-w-[760px] overflow-hidden bg-[#11141a] lg:my-auto lg:max-h-[min(78vh,760px)] lg:max-w-full">
            <div className="absolute inset-0 grid place-items-center text-[#6e5a9e]"><ImageIcon className="size-10"/></div>
            {postImage ? <img src={postImage} alt={post.caption ? `Photo by ${author.name}: ${post.caption}` : `Photo by ${author.name}`} className="relative size-full object-cover" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="sr-only">Photo unavailable</span>}
          </Link>
        </div>
        <div className="flex min-h-[600px] min-w-0 flex-col border-t border-white/[.06] lg:min-h-0 lg:border-l lg:border-t-0">
          <div className="hidden border-b border-white/[.06] px-4 py-4 lg:block"><div className="flex items-center justify-between"><Link href={`/profile/${encodeURIComponent(username)}`} className="group flex min-w-0 items-center gap-3"><Avatar src={author.avatar} name={author.name} size="sm"/><span className="min-w-0"><span className="block truncate text-sm font-semibold group-hover:text-[#c0a8ff]">{author.name}</span><span className="mt-0.5 block text-xs text-[#808592]">@{username} · {dayjs(post.createdAt).fromNow()}</span></span></Link><div className="relative"><button onClick={() => setMenu(!menu)} aria-label="Post options" className="grid size-9 place-items-center rounded-full text-[#969ba7] hover:bg-white/[.06] hover:text-white"><MoreHorizontal className="size-5"/></button>{menu && <div className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-[#2a2d37] bg-[#11141b] p-1 shadow-xl">{own && <button onClick={() => { if (window.confirm("Delete this post?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4"/>{deleteMutation.isPending ? "Deleting…" : "Delete post"}</button>}<button onClick={() => setMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#a5aab5] hover:bg-white/[.05]"><X className="size-4"/>Close menu</button></div>}</div></div></div>
          <div className="px-4 pb-3 pt-4"><div className="text-sm leading-6"><Link href={`/profile/${encodeURIComponent(username)}`} className="mr-1 font-semibold hover:text-[#c0a8ff]">{author.name}</Link><span className="text-[#d5d6dc]">{post.caption}</span></div>{likes > 0 && <button onClick={() => { if (!requireAuth()) return; setShowLikes(true); }} className="mt-2 text-xs text-[#858a96] hover:text-white">See who liked this</button>}{actionError && <p role="alert" className="mt-3 rounded-lg bg-rose-500/[.08] px-3 py-2 text-xs text-rose-200">{actionError}</p>}{shareNotice && <p role="status" className="mt-2 text-xs text-[#bda6ff]">{shareNotice}</p>}</div>
          <div className="min-h-0 flex-1 border-t border-white/[.06]">{detailComments(detailActionBar)}</div>
        </div>
      </div>
    </article>
    {showLikes && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowLikes(false)}><section role="dialog" aria-modal="true" aria-label="People who liked this post" onClick={(e) => e.stopPropagation()} className="max-h-[min(560px,85vh)] w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#282b36] bg-[#0d0f14] shadow-2xl"><header className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><h2 className="font-semibold">Liked by</h2><button onClick={() => setShowLikes(false)} aria-label="Close" className="text-[#8e93a0] hover:text-white"><X className="size-5"/></button></header><div className="max-h-[430px] overflow-y-auto p-3">{likePeople.isLoading ? <p className="p-5 text-center text-sm text-[#8d929e]">Loading list…</p> : likePeople.error ? <p className="p-5 text-sm text-rose-200">{displayError(likePeople.error)}</p> : people.length ? people.map((u: any) => <div key={u.id || u.username} className="flex items-center justify-between gap-2 rounded-xl p-2.5 hover:bg-white/[.04]"><Link href={`/profile/${encodeURIComponent(u.username)}`} onClick={() => setShowLikes(false)} className="flex min-w-0 items-center gap-3"><Avatar src={u.avatar} name={u.name} size="sm"/><span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-[#858a96]">@{u.username}</span></span></Link><FollowButton username={u.username} following={u.isFollowing}/></div>) : <p className="p-5 text-center text-sm text-[#8d929e]">No one has liked this yet.</p>}{likePeople.hasNextPage && <Button variant="ghost" size="sm" busy={likePeople.isFetchingNextPage} className="my-2 w-full" onClick={() => likePeople.fetchNextPage()}>Load more</Button>}</div></section></div>}
  </>;
  return <article className="overflow-hidden border-b border-[#20232b] pb-6 sm:rounded-2xl sm:border sm:bg-[#0b0d12] sm:p-4">
    <div className="mb-3 flex items-center justify-between"><Link href={`/profile/${encodeURIComponent(username)}`} className="group flex min-w-0 items-center gap-3"><Avatar src={author.avatar} name={author.name} size="sm"/><span className="min-w-0"><span className="block truncate text-sm font-semibold group-hover:text-[#c0a8ff]">{author.name}</span><span className="mt-0.5 block text-xs text-[#808592]">@{username} · {dayjs(post.createdAt).fromNow()}</span></span></Link><div className="relative"><button onClick={() => setMenu(!menu)} aria-label="Post options" className="grid size-9 place-items-center rounded-full text-[#969ba7] hover:bg-white/[.06] hover:text-white"><MoreHorizontal className="size-5"/></button>{menu && <div className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-[#2a2d37] bg-[#11141b] p-1 shadow-xl">{own && <button onClick={() => { if (window.confirm("Delete this post?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4"/>{deleteMutation.isPending ? "Deleting…" : "Delete post"}</button>}<button onClick={() => setMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#a5aab5] hover:bg-white/[.05]"><X className="size-4"/>Close menu</button></div>}</div></div>
    <Link href={`/posts/${encodeURIComponent(id)}`} className="group relative mx-auto block w-full max-w-[620px] overflow-hidden rounded-xl border border-white/[.04] bg-[#11141a]"><div className="relative aspect-square w-full bg-gradient-to-br from-[#171225] via-[#10121a] to-[#121920]">{postImage ? <><div className="absolute inset-0 grid place-items-center text-[#6e5a9e]"><ImageIcon className="size-10"/></div><img src={postImage} alt={post.caption ? `Photo by ${author.name}: ${post.caption}` : `Photo by ${author.name}`} className="relative size-full object-cover transition duration-500 group-hover:scale-[1.015]" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /></> : <div className="grid size-full place-items-center text-[#6e5a9e]"><ImageIcon className="size-10"/><span className="sr-only">Photo unavailable</span></div>}</div></Link>
    <div className="flex items-center gap-4 py-3"><button onClick={toggleLike} aria-label={liked ? "Unlike post" : "Like post"} aria-pressed={liked} className={cn("inline-flex items-center gap-1.5 transition hover:scale-105", liked ? "text-[#df367b]" : "text-[#c6c8d0] hover:text-[#df367b]")}><Heart className={cn("size-[19px]", liked && "fill-current")} /><span className="text-xs tabular-nums">{likes}</span></button><Link href={`/posts/${encodeURIComponent(id)}`} className="inline-flex items-center gap-1.5 text-[#c6c8d0] hover:text-white"><MessageCircle className="size-[19px]"/><span className="text-xs tabular-nums">{comments}</span></Link><Button variant="ghost" size="icon" className="size-8" onClick={sharePost} aria-label="Share"><Send className="size-[17px]"/></Button><button onClick={toggleSave} aria-label={saved ? "Remove from saved" : "Save post"} aria-pressed={saved} className={cn("ml-auto grid size-8 place-items-center rounded-lg transition hover:bg-white/[.05]", saved ? "text-[#a783ff]" : "text-[#aeb2bc] hover:text-white")}><Bookmark className={cn("size-[18px]", saved && "fill-current")}/></button></div>
    <div><Link href={`/profile/${encodeURIComponent(username)}`} className="mr-1 text-sm font-semibold hover:text-[#c0a8ff]">{author.name}</Link><span className="text-sm leading-6 text-[#d5d6dc]">{post.caption}</span>{post.caption?.length > 180 && <button className="ml-1 text-xs font-medium text-[#a47cff]">Show more</button>}</div>
    {likes > 0 && <button onClick={() => { if (!requireAuth()) return; setShowLikes(true); }} className="mt-2 text-xs text-[#858a96] hover:text-white">See who liked this</button>}
    {actionError && <p role="alert" className="mt-3 rounded-lg bg-rose-500/[.08] px-3 py-2 text-xs text-rose-200">{actionError}</p>}{shareNotice && <p role="status" className="mt-2 text-xs text-[#bda6ff]">{shareNotice}</p>}
    {showLikes && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowLikes(false)}><section role="dialog" aria-modal="true" aria-label="People who liked this post" onClick={(e) => e.stopPropagation()} className="max-h-[min(560px,85vh)] w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#282b36] bg-[#0d0f14] shadow-2xl"><header className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><h2 className="font-semibold">Liked by</h2><button onClick={() => setShowLikes(false)} aria-label="Close" className="text-[#8e93a0] hover:text-white"><X className="size-5"/></button></header><div className="max-h-[430px] overflow-y-auto p-3">{likePeople.isLoading ? <p className="p-5 text-center text-sm text-[#8d929e]">Loading list…</p> : likePeople.error ? <p className="p-5 text-sm text-rose-200">{displayError(likePeople.error)}</p> : people.length ? people.map((u: any) => <div key={u.id || u.username} className="flex items-center justify-between gap-2 rounded-xl p-2.5 hover:bg-white/[.04]"><Link href={`/profile/${encodeURIComponent(u.username)}`} onClick={() => setShowLikes(false)} className="flex min-w-0 items-center gap-3"><Avatar src={u.avatar} name={u.name} size="sm"/><span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-[#858a96]">@{u.username}</span></span></Link><FollowButton username={u.username} following={u.isFollowing}/></div>) : <p className="p-5 text-center text-sm text-[#8d929e]">No one has liked this yet.</p>}{likePeople.hasNextPage && <Button variant="ghost" size="sm" busy={likePeople.isFetchingNextPage} className="my-2 w-full" onClick={() => likePeople.fetchNextPage()}>Load more</Button>}</div></section></div>}
  </article>;
}

export function PostGrid({ posts }: { posts: any[] }) { return <div className="grid grid-cols-3 gap-1 sm:gap-2">{posts.map((post, index) => <Link href={`/posts/${encodeURIComponent(post.id)}`} key={post.id} className="group relative aspect-square overflow-hidden rounded-md bg-gradient-to-br from-[#171225] to-[#121920]">{post.image || getPostFallbackImage(index) ? <img src={post.image || getPostFallbackImage(index)} alt={post.caption || "Posts Sociality"} className="size-full object-cover transition duration-300 group-hover:scale-105" loading="lazy"/> : <span className="grid size-full place-items-center text-[#6e5a9e]"><ImageIcon className="size-6"/></span>}<span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><span className="inline-flex items-center gap-3 text-xs font-semibold"><span className="inline-flex items-center gap-1"><Heart className="size-4 fill-current"/>{post.likesCount}</span><span className="inline-flex items-center gap-1"><MessageCircle className="size-4"/>{post.commentsCount}</span></span></span></Link>)}</div>; }

