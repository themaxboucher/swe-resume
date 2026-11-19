import { AppHeader, VerifyEmailBanner } from "@/components/app-header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <VerifyEmailBanner />
      <main className="flex-1">{children}</main>
    </div>
  );
}
