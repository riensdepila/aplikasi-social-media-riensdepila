"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Compass, Heart, Home, LogOut, Plus, Search, Users } from "lucide-react";
import { Avatar, Button, Input, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { clearSession, useAppDispatch, useAppSelector } from "@/lib/store";
import { syncUserAvatarInCache, useMyProfile } from "@/lib/queries";

const nav = [
  { href: "/feed", label: "Home", Icon: Home },
  { href: "/explore", label: "Explore posts", Icon: Compass },
  { href: "/users/search", label: "Find people", Icon: Users },
  { href: "/me/likes", label: "Liked posts", Icon: Heart },
  { href: "/me/saved", label: "Saved", Icon: Bookmark },
  { href: "/me/followers", label: "Connections", Icon: Users },
];

function SearchControl({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const submit = (event: React.FormEvent) => { event.preventDefault(); const term = query.trim(); router.push(`/users/search${term ? `?q=${encodeURIComponent(term)}` : ""}`); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sociality:search", { detail: term })); close?.(); };
  return <form onSubmit={submit} className={cn("relative", mobile ? "w-full" : "w-full max-w-[420px]")}><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#747987]" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people or usernames" className="h-10 rounded-full border-transparent bg-[#11141a] pl-10 pr-4 text-xs focus:border-[#34303f]" aria-label="Search users" /></form>;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user) as any;
  const token = useAppSelector((s) => s.auth.token);
  const queryClient = useQueryClient();
  const profile = useMyProfile(Boolean(token));
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const pathname = usePathname();
  const isPostDetail = pathname.startsWith('/posts/') && pathname !== '/posts/new';
  const router = useRouter();
  const logout = () => { queryClient.clear(); localStorage.removeItem("sociality_token"); localStorage.removeItem("sociality_user"); dispatch(clearSession()); router.replace("/login"); };
  const name = user?.name ?? user?.displayName ?? user?.username ?? "My account";
  const profileUser = profile.data as any;
  const avatar = profileUser?.avatar || profileUser?.avatarUrl || profileUser?.avatar_url || profileUser?.profileImage || profileUser?.profilePicture || user?.avatarUrl || user?.avatar_url || user?.avatar || user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture;
  useEffect(() => {
    if (token && profileUser) syncUserAvatarInCache(queryClient, profileUser, user);
  }, [profileUser, queryClient, token, user]);
  return <div className="min-h-screen bg-[#06070a]">
    <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[#06070a]/90 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8"><Logo /><div className="hidden flex-1 justify-center md:flex"><SearchControl /></div><div className="flex items-center gap-2 sm:gap-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMobileSearch(!showMobileSearch)} aria-label="Search"><Search className="size-[18px]" /></Button>{token ? <><Link href="/posts/new" className="hidden h-10 items-center gap-2 rounded-xl bg-[#7138f5] px-4 text-sm font-semibold shadow-[0_7px_22px_rgba(113,56,245,.2)] transition hover:bg-[#824ffc] sm:inline-flex"><Plus className="size-4" />Create post</Link><Link href="/me" className="flex items-center gap-2 rounded-full p-1 pr-2.5 hover:bg-white/[.05]"><Avatar src={avatar} name={name} size="sm" /><span className="hidden max-w-24 truncate text-xs font-medium text-[#e4e5eb] lg:block">{name}</span></Link><Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out" className="inline-flex"><LogOut className="size-4" /></Button></> : <><Link href="/login" className="rounded-xl px-3 py-2 text-xs font-semibold text-[#c6c8d0] hover:bg-white/[.05] sm:px-4 sm:text-sm">Sign in</Link><Link href="/register" className="hidden rounded-xl bg-[#7138f5] px-3 py-2 text-xs font-semibold text-white sm:inline-flex sm:px-4 sm:text-sm">Sign up</Link></>}</div></div>
      {showMobileSearch && <div className="border-t border-white/[.06] px-4 py-3 md:hidden"><SearchControl mobile close={() => setShowMobileSearch(false)} /></div>}
    </header>
    <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-0 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
      {token && <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] flex-col justify-between py-8 lg:flex"><nav className="space-y-1">{nav.map(({ href, label, Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#969ba7] transition hover:bg-white/[.045] hover:text-white"><Icon className="size-[18px]" />{label}</Link>)}<Link href="/posts/new" className="mt-3 flex items-center gap-3 rounded-xl bg-[#7138f5]/15 px-3 py-3 text-sm font-semibold text-[#c1a9ff] hover:bg-[#7138f5]/25"><Plus className="size-[18px]" />Create a post</Link></nav><div className="space-y-3 rounded-2xl border border-white/[.06] bg-white/[.025] p-4"><div className="text-xs font-semibold text-white">A welcoming place to share</div><p className="text-xs leading-5 text-[#858a97]">Share a little story and find inspiration from friends.</p><button onClick={logout} className="inline-flex items-center gap-2 text-xs text-[#8d92a0] hover:text-white"><LogOut className="size-3.5" />Sign out</button></div></aside>}
      <main className={`min-w-0 pb-24 lg:pb-12 ${!token ? "lg:col-span-2" : ""}`}><div className={cn("mx-auto w-full px-4 pt-6 sm:px-0 sm:pt-8", isPostDetail ? "max-w-[1040px]" : "max-w-[780px]")}>{children}</div></main>
    </div>
    {token ? <nav className="fixed inset-x-3 bottom-3 z-40 flex h-[62px] items-center justify-around rounded-2xl border border-[#242731] bg-[#0b0d12]/95 px-2 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-xl lg:hidden" aria-label="Navigasi utama">
      <Link href="/feed" className="grid min-w-[52px] place-items-center gap-1 text-[#b4b8c2]"><Home className="size-[18px]"/><span className="text-[10px]">Home</span></Link>
      <Link href="/users/search" className="grid min-w-[52px] place-items-center gap-1 text-[#b4b8c2]"><Search className="size-[18px]"/><span className="text-[10px]">Search</span></Link>
      <Link href="/posts/new" className="grid size-11 place-items-center rounded-full bg-[#7138f5] text-white shadow-[0_5px_18px_rgba(113,56,245,.38)]" aria-label="Create post"><Plus className="size-5"/></Link>
      <Link href="/me/likes" className="grid min-w-[52px] place-items-center gap-1 text-[#b4b8c2]"><Heart className="size-[18px]"/><span className="text-[10px]">Liked</span></Link>
      <Link href="/me" className="grid min-w-[52px] place-items-center gap-1 text-[#b4b8c2]"><Avatar src={avatar} name={name} size="sm" className="size-6"/><span className="text-[10px]">Profile</span></Link>
    </nav> : <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-white/[.08] bg-[#0b0d12]/95 p-3 backdrop-blur-xl lg:hidden"><span className="text-xs text-[#a4a8b2]">Start sharing your story</span><Link href="/login" className="rounded-lg px-3 py-2 text-xs font-semibold text-[#d6d2e4]">Sign in</Link><Link href="/register" className="rounded-lg bg-[#7138f5] px-3 py-2 text-xs font-semibold">Sign up for free</Link></div>}
  </div>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, initialized } = useAppSelector((s) => s.auth);
  const router = useRouter();
  useEffect(() => { if (initialized && !token) router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`); }, [initialized, token, router]);
  if (!initialized || !token) return <div className="grid min-h-[60vh] place-items-center text-sm text-[#9095a2]">Checking session…</div>;
  return children;
}
