"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useFeedPosts } from "@/lib/queries";
import { displayError, uniqueById } from "@/lib/api";
import { EmptyState, PageHeading, Button, LoadingRows } from "@/components/ui";
import { PostCard } from "@/components/post-card";

export function FeedView() {
  const query = useFeedPosts();
  const sentinel = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const posts = useMemo(() => uniqueById(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) query.fetchNextPage(); }, { rootMargin: "450px" });
    observer.observe(target); return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return <><PageHeading eyebrow="Your daily moments" title="Home" description="Recent stories from you and the people you follow." action={<Link href="/posts/new" className="inline-flex h-10 items-center rounded-xl bg-[#7138f5] px-3 text-xs font-semibold sm:hidden">Create post</Link>} />
    {query.isLoading ? <LoadingRows count={2} /> : query.error ? <div className="rounded-2xl border border-[#252832] bg-[#0b0d12] px-5 py-10 text-center"><CircleAlert className="mx-auto size-7 text-rose-300"/><p className="mt-3 font-semibold">Could not load the feed</p><p className="mt-2 text-sm text-[#9196a2]">{displayError(query.error)}</p><Button className="mt-5" onClick={() => query.refetch()}><RefreshCw className="size-4"/>Try again</Button></div> : posts.length === 0 ? <EmptyState title="Your feed is quiet" detail="Follow a few people to see their stories here. You can also share your first moment." action={{ label: "Find people", href: "/users/search" }} /> : <div className="space-y-5 sm:space-y-6">{posts.map((post: any) => <PostCard key={post.id} post={post} onDeleted={() => qc.invalidateQueries({ queryKey: ["posts"] })} />)}</div>}
    <div ref={sentinel} className="h-4" />{query.isFetchingNextPage && <div className="py-6"><LoadingRows count={1}/></div>}{query.error && !query.isLoading && posts.length > 0 && <div className="py-5 text-center"><Button variant="outline" onClick={() => query.fetchNextPage()}><RefreshCw className="size-4"/>Load more</Button></div>}{!query.hasNextPage && posts.length > 0 && <p className="py-6 text-center text-xs text-[#717682]">You have seen all the latest stories.</p>}
  </>;
}
