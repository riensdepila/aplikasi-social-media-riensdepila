import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing-view";
import { SiteShell } from "@/components/site-shell";
export default async function PublicConnectionsPage({ params }: { params: Promise<{ username: string; kind: string }> }) {
  const { username, kind } = await params;
  if (kind !== "followers" && kind !== "following") notFound();
  return <SiteShell><ListingView kind={kind} username={username} mine={false}/></SiteShell>;
}
