import { SiteShell } from "@/components/site-shell";
import { PostDetail } from "@/components/post-detail";
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SiteShell><PostDetail id={id}/></SiteShell>; }
