import { AuthGate, SiteShell } from "@/components/site-shell";
export default function PrivateLayout({ children }: { children: React.ReactNode }) { return <AuthGate><SiteShell>{children}</SiteShell></AuthGate>; }
