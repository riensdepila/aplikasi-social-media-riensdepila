import { ProfileView } from "@/components/listing-view";
import { SiteShell } from "@/components/site-shell";
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <SiteShell><ProfileView username={username}/></SiteShell>; }
