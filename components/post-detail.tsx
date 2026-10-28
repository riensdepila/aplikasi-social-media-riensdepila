"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useMyProfile, usePost } from "@/lib/queries";
import { displayError } from "@/lib/api";
import { useAppSelector } from "@/lib/store";
import { Button, LoadingRows } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { CommentsSection } from "@/components/comments-section";
import { trackEvent } from "@/lib/analytics";

export function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const query = usePost(id);
  const user = useAppSelector((s) => s.auth.user) as any;
  const token = useAppSelector((s) => s.auth.token);
  const myProfile = useMyProfile(Boolean(token));
  const viewed = useRef("");
  useEffect(() => { if (query.data?.id && viewed.current !== query.data.id) { viewed.current = query.data.id; trackEvent("post_view", { postId: query.data.id }); } }, [query.data?.id]);
  if (query.isLoading) return <div className="py-4"><LoadingRows count={1}/></div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-[#242832] bg-[#0b0d12] p-8 text-center"><CircleAlert className="mx-auto size-7 text-rose-300"/><p className="mt-3 font-semibold">This post could not be opened</p><p className="mt-2 text-sm text-[#9398a4]">{displayError(query.error)}</p><Button variant="outline" className="mt-5" onClick={() => query.refetch()}>Try again</Button></div>;
  const post = query.data;
  const me: any = myProfile.data ?? user;
  const own = Boolean(me && ((me.username && me.username === post.author.username) || (me.id && me.id === post.author.id)));
  return <><Link href="/feed" className="mb-5 inline-flex items-center gap-2 text-sm text-[#9ca1ad] hover:text-white"><ArrowLeft className="size-4"/>Back to feed</Link><PostCard post={post} owner={own} onDeleted={() => router.replace("/me")} detailComments={(actions) => <CommentsSection postId={post.id} initialCount={Number(post.commentsCount || 0)} detail footerActions={actions}/>}/></>;
}
