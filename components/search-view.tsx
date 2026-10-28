"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchUsers } from "@/lib/queries";
import { displayError } from "@/lib/api";
import { Alert, EmptyState, Input, LoadingRows, PageHeading, Button } from "@/components/ui";
import { UserCard } from "@/components/user-card";

export function SearchView() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { setQuery(new URLSearchParams(window.location.search).get("q") || ""); const sync = (event: Event) => setQuery((event as CustomEvent<string>).detail || ""); window.addEventListener("sociality:search", sync); return () => window.removeEventListener("sociality:search", sync); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 350); return () => window.clearTimeout(timer); }, [query]);
  const results = useSearchUsers(debounced);
  const users = useMemo(() => results.data ?? [], [results.data]);
  return <><PageHeading eyebrow="Community" title="Find people" description="Search by name or username to discover new stories." />
    <div className="relative mb-6"><Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#7e8390]"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or username…" className="h-[50px] rounded-2xl pl-12" aria-label="Search users" autoFocus /></div>
    {!debounced ? <div className="rounded-2xl border border-dashed border-[#292c35] bg-[#0a0c11] py-8"><EmptyState title="Start with a search" detail="Type at least one character to find matching accounts."/></div> : results.isLoading ? <LoadingRows count={3}/> : results.error ? <div><Alert>{displayError(results.error)}</Alert><Button variant="outline" className="mt-3" onClick={() => results.refetch()}>Try again</Button></div> : users.length ? <><p className="mb-3 text-xs text-[#898e9a]">{users.length} top results</p><div className="space-y-2">{users.map((user: any) => <UserCard key={user.id || user.username} user={user}/>)}</div></> : <EmptyState title="No results yet" detail={`We could not find an account for “${debounced}”. Try another name or username.`}/>}
  </>;
}
