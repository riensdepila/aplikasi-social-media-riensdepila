"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useExplorePosts } from "@/lib/queries";
import { displayError, uniqueById } from "@/lib/api";
import { EmptyState, PageHeading, Button, LoadingRows } from "@/components/ui";
import { PostCard } from "@/components/post-card";

export function ExploreView() {
  const query = useExplorePosts(); const qc = useQueryClient(); const sentinel = useRef<HTMLDivElement>(null);
  const posts = useMemo(() => uniqueById(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  useEffect(() => { if (!sentinel.current || !query.hasNextPage || query.isFetchingNextPage) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) query.fetchNextPage(); }, { rootMargin: "350px" }); observer.observe(sentinel.current); return () => observer.disconnect(); }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  return <><PageHeading eyebrow="Community inspiration" title="Explore posts" description="Discover moments and ideas from the Sociality community."/>{query.isLoading ? <LoadingRows count={2}/> : query.error ? <div className="rounded-2xl border border-[#242832] bg-[#0b0d12] p-6 text-center"><p className="text-sm text-rose-200">{displayError(query.error)}</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}>Try again</Button></div> : posts.length ? <div className="space-y-5">{posts.map((post: any) => <PostCard key={post.id} post={post} onDeleted={() => qc.invalidateQueries({ queryKey: ["posts"] })}/>)}</div> : <EmptyState title="No posts to explore yet" detail="New stories will appear here as the community starts sharing."/>}<div ref={sentinel} className="h-4"/>{query.isFetchingNextPage && <div className="py-5"><LoadingRows count={1}/></div>}</>;
}
