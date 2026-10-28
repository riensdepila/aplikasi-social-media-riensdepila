import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing-view";
const sections = ["posts", "likes", "saved", "followers", "following"] as const;
export default async function MySectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as any)) notFound();
  return <ListingView kind={section as (typeof sections)[number]}/>;
}
