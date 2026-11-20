import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { GlyphField } from "@/components/landing/glyph-field";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Login
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Get started
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden">
        <GlyphField />
        <section className="flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-[44px] leading-[1.02] tracking-[-0.045em] text-balance sm:text-7xl">
            Apply with the perfect resume, every time.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
            Write your experience once, then make a version for each role you
            apply to. Pick what to show, put it in the right order, and export
            a clean PDF.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Create your resume <ArrowRightIcon />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              I have an account
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
