"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { MessageCircle, Send, Smile, Trash2 } from "lucide-react";
import { api, displayError, uniqueById } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { qk, useComments, useMyProfile } from "@/lib/queries";
import { useAppSelector } from "@/lib/store";
import { Alert, Avatar, Button, EmptyState, Input, LoadingRows } from "@/components/ui";

dayjs.extend(relativeTime);

const COMMENT_EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😂", "🥹", "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😭", "😅", "🤔", "🙌", "👏", "👍", "👎", "❤️", "💜", "🔥", "✨", "🎉", "🙏", "🫶", "💯", "😢"];

export function CommentsSection({ postId, initialCount = 0, detail = false, footerActions }: { postId: string; initialCount?: number; detail?: boolean; footerActions?: React.ReactNode }) {
  const query = useComments(postId);
  const qc = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const currentUser = useAppSelector((s) => s.auth.user) as any;
  const profile = useMyProfile(Boolean(token));
  const authorUser = (profile.data ?? currentUser) as any;
  const pathname = usePathname(); const router = useRouter();
  const [text, setText] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [commentCount, setCommentCount] = useState(initialCount);
  const comments = useMemo(() => uniqueById(query.data?.pages.flatMap((page) => page.items) ?? []), [query.data]);
  useEffect(() => setCommentCount((count) => Math.max(count, initialCount)), [initialCount]);
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) setEmojiPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEmojiPickerOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [emojiPickerOpen]);
  const updatePostCount = (amount: number) => { setCommentCount((count) => Math.max(0, count + amount)); qc.setQueryData(qk.detail(postId), (old: any) => old ? { ...old, commentsCount: Math.max(0, Number(old.commentsCount || initialCount) + amount) } : old); };
  const addMutation = useMutation({ mutationFn: (value: string) => api<any>(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify({ text: value }) }), onSuccess: async () => { setText(""); setEmojiPickerOpen(false); await Promise.all([qc.invalidateQueries({ queryKey: qk.comments(postId) }), qc.invalidateQueries({ queryKey: ["posts"] })]); }, onMutate: async (value) => {
    setError(""); await qc.cancelQueries({ queryKey: qk.comments(postId) });
    const previous = qc.getQueryData(qk.comments(postId));
    const optimistic = { id: `optimistic-${Date.now()}`, text: value, createdAt: new Date().toISOString(), author: { id: authorUser?.id, name: authorUser?.name ?? "You", username: authorUser?.username ?? "you", avatar: authorUser?.avatarUrl ?? authorUser?.avatar_url ?? authorUser?.avatar ?? authorUser?.profileImage ?? authorUser?.profilePicture ?? "" }, _optimistic: true };
    qc.setQueryData(qk.comments(postId), (old: any) => old?.pages?.length ? { ...old, pages: [{ ...old.pages[0], items: [optimistic, ...old.pages[0].items] }, ...old.pages.slice(1)] } : { pages: [{ items: [optimistic] }], pageParams: [1] }); updatePostCount(1);
    return { previous };
  }, onError: (err, _v, context) => { setError(displayError(err)); if (context?.previous) qc.setQueryData(qk.comments(postId), context.previous); updatePostCount(-1); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api(`/comments/${encodeURIComponent(id)}`, { method: "DELETE" }), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: qk.comments(postId) }), qc.invalidateQueries({ queryKey: ["posts"] })]); }, onMutate: async (id) => {
    setError(""); await qc.cancelQueries({ queryKey: qk.comments(postId) }); const previous = qc.getQueryData(qk.comments(postId));
    qc.setQueryData(qk.comments(postId), (old: any) => old ? { ...old, pages: old.pages.map((page: any) => ({ ...page, items: page.items.filter((item: any) => item.id !== id) })) } : old); updatePostCount(-1); return { previous };
  }, onError: (err, _id, context) => { setError(displayError(err)); if (context?.previous) qc.setQueryData(qk.comments(postId), context.previous); updatePostCount(1); } });
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = text.trim(); if (!value) return; if (!token) { router.push(`/login?returnTo=${encodeURIComponent(pathname + window.location.search)}`); return; } if (!addMutation.isPending) { trackEvent("comment_submit", { postId }); addMutation.mutate(value); } };

  return <section className={detail ? "flex h-full min-h-[540px] flex-col overflow-hidden bg-[#0b0d12] lg:min-h-0" : "overflow-hidden rounded-2xl border border-white/[.06] bg-[#0b0d12]"}>
    <header className="flex items-center gap-2 border-b border-white/[.06] px-4 py-4"><MessageCircle className="size-4 text-[#ac8bff]"/><h2 className="font-semibold">Comments</h2><span className="text-xs text-[#777d89]">{commentCount}</span></header>
    <div className={detail ? "min-h-0 flex-1 overflow-y-auto px-4 lg:max-h-none" : "max-h-[480px] overflow-y-auto px-4"}>{query.isLoading ? <div className="py-4"><LoadingRows count={1}/></div> : query.error ? <div className="py-5"><Alert>{displayError(query.error)}</Alert><Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>Try again</Button></div> : comments.length ? <div className="divide-y divide-white/[.055]">{comments.map((comment: any) => {
      const author = comment.author || {};
      const own = Boolean(currentUser && ((currentUser.username && currentUser.username === author.username) || (currentUser.id && currentUser.id === author.id) || comment.userId === currentUser.id));
      return <article key={comment.id} className="flex gap-3 py-4"><Link href={`/profile/${encodeURIComponent(author.username || "unknown")}`}><Avatar src={author.avatar} name={author.name} size="sm"/></Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/profile/${encodeURIComponent(author.username || "unknown")}`} className="text-xs font-semibold hover:text-[#c1a9ff]">{author.name || "User"}</Link><span className="text-[11px] text-[#777d89]">{dayjs(comment.createdAt || new Date()).fromNow()}</span></div><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#cdd0d8]">{comment.text}</p></div>{own && !comment._optimistic && <button onClick={() => deleteMutation.mutate(comment.id)} disabled={deleteMutation.isPending} aria-label="Delete comment" className="self-start rounded-lg p-2 text-[#777d89] hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="size-4"/></button>}</article>;
    })}</div> : <EmptyState title="No comments yet" detail="Start the conversation by leaving the first comment."/>}
      {query.hasNextPage && <div className="py-4 text-center"><Button variant="ghost" size="sm" busy={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load previous comments</Button></div>}
    </div>
    {footerActions && <div className="border-t border-white/[.06] px-4">{footerActions}</div>}
    {error && <div className="px-4 pt-3"><Alert>{error}</Alert></div>}
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/[.06] p-3"><Avatar src={authorUser?.avatarUrl ?? authorUser?.avatar_url ?? authorUser?.avatar ?? authorUser?.profileImage ?? authorUser?.profilePicture} name={authorUser?.name ?? "You"} size="sm" className="size-8"/><div className="relative shrink-0" ref={emojiPickerRef}><Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Add emoji" aria-expanded={emojiPickerOpen} aria-haspopup="dialog" onClick={() => setEmojiPickerOpen((open) => !open)}><Smile className="size-[18px]"/></Button>{emojiPickerOpen && <div role="dialog" aria-label="Choose an emoji" className="absolute bottom-full left-0 z-30 mb-2 w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-[#282b36] bg-[#11141b] p-3 shadow-2xl"><div className="grid grid-cols-6 gap-1">{COMMENT_EMOJIS.map((emoji) => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} title={emoji} onClick={() => setText((value) => `${value}${emoji}`)} className="grid size-9 place-items-center rounded-lg text-xl transition hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9c72ff]">{emoji}</button>)}</div></div>}</div><Input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={token ? "Write a comment…" : "Sign in to comment"} className="h-10 min-w-0 flex-1 border-transparent bg-[#11141a]" aria-label="Write a comment"/><Button type="submit" size="icon" className="size-10 shrink-0" disabled={!text.trim()} busy={addMutation.isPending} aria-label="Send comment"><Send className="size-4"/></Button></form>
  </section>;
}
