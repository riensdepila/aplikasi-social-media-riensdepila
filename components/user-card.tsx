"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, UserRoundPlus } from "lucide-react";
import { api, displayError } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useAppSelector } from "@/lib/store";
import { Avatar, Button } from "@/components/ui";

export function FollowButton({ username, following: initial = false, className = "" }: { username: string; following?: boolean; className?: string }) {
  const token = useAppSelector((s) => s.auth.token);
  const qc = useQueryClient();
  const [following, setFollowing] = useState(initial);
  const [error, setError] = useState("");
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (next: boolean) => api("/follow/" + encodeURIComponent(username), { method: next ? "POST" : "DELETE" }),
    onMutate: async (next: boolean) => {
      const targetKey = ["profile", username] as const;
      const ownKey = ["profile", "me"] as const;
      const delta = next ? 1 : -1;
      await Promise.all([
        qc.cancelQueries({ queryKey: targetKey }),
        qc.cancelQueries({ queryKey: ownKey }),
      ]);
      const previousTarget = qc.getQueryData(targetKey);
      const previousMine = qc.getQueryData(ownKey);
      const adjustCount = (profile: any, field: "followersCount" | "followingCount") =>
        profile ? { ...profile, [field]: Math.max(0, Number(profile[field] ?? 0) + delta) } : profile;
      qc.setQueryData(targetKey, (profile: any) => adjustCount(profile, "followersCount"));
      qc.setQueryData(ownKey, (profile: any) => adjustCount(profile, "followingCount"));
      return { targetKey, ownKey, previousTarget, previousMine };
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["connections"] }),
        qc.invalidateQueries({ queryKey: ["users", "search"] }),
      ]);
    },
    onError: (e, _next, context) => {
      setError(displayError(e));
      if (context?.previousTarget !== undefined) qc.setQueryData(context.targetKey, context.previousTarget);
      if (context?.previousMine !== undefined) qc.setQueryData(context.ownKey, context.previousMine);
    },
  });
  useEffect(() => { setFollowing(initial); }, [initial]);
  const toggle = () => {
    if (!token) { router.push("/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search)); return; }
    if (mutation.isPending) return;
    setError("");
    const next = !following;
    setFollowing(next);
    trackEvent(next ? "follow" : "unfollow", { username });
    mutation.mutate(next, { onError: () => setFollowing(!next) });
  };
  return <span className={className}><Button size="sm" variant={following ? "outline" : "primary"} busy={mutation.isPending} onClick={toggle} aria-pressed={following} className="min-w-[92px]">{following ? <><Check className="size-3.5"/>Unfollow</> : <><UserRoundPlus className="size-3.5"/>Follow</>}</Button>{error && <span role="alert" className="mt-1 block max-w-36 text-[10px] text-rose-300">{error}</span>}</span>;
}
export function UserCard({ user }: { user: any }) {
  return <article className="flex items-center gap-3 rounded-2xl border border-white/[.055] bg-[#0b0d12] p-3 sm:p-4"><Link href={`/profile/${encodeURIComponent(user.username)}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar src={user.avatar} name={user.name} size="md"/><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name}</span><span className="mt-1 block truncate text-xs text-[#858a96]">@{user.username}</span>{user.bio && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#a5a9b4]">{user.bio}</span>}</span></Link><FollowButton username={user.username} following={user.isFollowing}/><Link href={`/profile/${encodeURIComponent(user.username)}`} className="sr-only" aria-label={`View profile ${user.name}`}><ArrowUpRight/></Link></article>;
}

