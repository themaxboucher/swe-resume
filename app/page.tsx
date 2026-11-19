import {
  ArrowRightIcon,
  CopyIcon,
  FileDownIcon,
  LayoutTemplateIcon,
  MailIcon,
  PaletteIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { CoverLetterIllustration, ResumeIllustration } from "@/components/dashboard/illustrations";
import { SamplePreview } from "@/components/landing/sample-preview";
import { Button } from "@/components/ui/button";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutTemplateIcon,
    title: "Real pages, live",
    body: "The preview breaks pages exactly where your PDF will. No surprises on page two.",
  },
  {
    icon: PaletteIcon,
    title: "Design it your way",
    body: "Color, typeface, spacing, one or two columns, A4 or Letter. Change anything, keep your content.",
  },
  {
    icon: MailIcon,
    title: "Cover letters too",
    body: "Write matching letters with the same type and color, so your application looks like one piece.",
  },
  {
    icon: FileDownIcon,
    title: "One-click PDF",
    body: "Crisp, selectable text and embedded fonts that pass applicant tracking systems.",
  },
  {
    icon: Undo2Icon,
    title: "Autosave & undo",
    body: "Every keystroke is saved. Changed your mind? ⌘Z walks it back.",
  },
  {
    icon: CopyIcon,
    title: "Tailor in seconds",
    body: "Duplicate a resume for each role and tweak the parts that matter.",
  },
];

const STEPS = [
  { title: "Fill in the blanks", body: "Structured sections for experience, education, skills, projects and more." },
  { title: "Make it yours", body: "Pick a typeface and accent color, then tune spacing until it fits." },
  { title: "Download & apply", body: "Export a pixel-perfect PDF and send it off." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden h-9 items-center px-3 text-sm font-semibold sm:flex">
              Features
            </a>
            <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
              Login
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/signup" />}>
              Get started
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
          <div className="flex flex-col gap-7">
            <h1 className="font-display text-[44px] leading-[1.05] tracking-tight sm:text-6xl">
              Resumes that read well and print perfectly.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed">
              Write your resume and cover letter in one calm editor. Watch them lay out on real pages as you type, then
              download a polished PDF.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
                Create your resume <ArrowRightIcon />
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                I have an account
              </Button>
            </div>
            <div className="max-w-md rounded-2xl bg-[#efefef] p-5 text-[15px] leading-relaxed">
              <p className="mb-1.5 text-sm font-semibold">Why it&apos;s different</p>
              <p>
                Most builders show one endless page and hope for the best. Here the preview is paginated with the same
                engine that prints your PDF, so what you see is exactly what you send.
              </p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[460px]">
            <ResumeIllustration className="absolute -top-14 -left-16 hidden h-28 w-auto -rotate-6 lg:block" />
            <div className="dashed-panel bg-card/50 p-5 sm:p-7">
              <SamplePreview />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <h2 className="mb-8 font-display text-3xl sm:text-4xl">Everything you need, nothing you don&apos;t</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-card">
                <span className="relative flex size-11 items-center justify-center">
                  <span className="absolute right-0 bottom-0 size-6 rounded-full bg-primary/85" />
                  <Icon className="relative size-8 text-foreground" strokeWidth={1.5} />
                </span>
                <h3 className="flex items-center gap-1.5 text-base font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-black/5 bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-3xl sm:text-4xl">Three steps to send-ready</h2>
              <CoverLetterIllustration className="h-32 w-auto self-start" />
            </div>
            <ol className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border-2 border-foreground font-display text-lg">
                    {i + 1}
                  </span>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h2 className="max-w-2xl font-display text-4xl sm:text-5xl">Your next application starts here.</h2>
          <p className="max-w-md text-muted-foreground">Free while in early access. No credit card, no watermark.</p>
          <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
            Get started <ArrowRightIcon />
          </Button>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="scale-90" />
          <p>© 2026 SWE Resume. Made for job seekers.</p>
        </div>
      </footer>
    </div>
  );
}
