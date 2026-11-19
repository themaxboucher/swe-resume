import { Logo } from "@/components/brand";
import { ResumeIllustration } from "@/components/dashboard/illustrations";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-black/5 bg-card lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-8 lg:p-16">
        <ResumeIllustration className="h-56 w-auto" />
        <blockquote className="max-w-md text-center">
          <p className="font-display text-3xl leading-snug">Real pages while you type. No more guessing where page two starts.</p>
          <footer className="mt-4 text-sm text-muted-foreground">Build once, tailor for every application.</footer>
        </blockquote>
      </aside>
    </div>
  );
}
