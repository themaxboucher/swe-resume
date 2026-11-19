"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DocumentGrid } from "./document-grid";
import { DocumentThumbnail } from "./document-thumbnail";
import { CoverLetterIllustration, ResumeIllustration } from "./illustrations";

type Tab = "resumes" | "cover-letters";

export function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab: Tab = searchParams.get("tab") === "cover-letters" ? "cover-letters" : "resumes";

  const trpc = useTRPC();
  const resumeCount = useQuery(trpc.resume.list.queryOptions()).data?.length;
  const letterCount = useQuery(trpc.coverLetter.list.queryOptions()).data?.length;

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "resumes", label: "Resumes", count: resumeCount },
    { value: "cover-letters", label: "Cover letters", count: letterCount },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl sm:text-5xl">Your documents</h1>
          <p className="text-muted-foreground">Everything saves automatically. Duplicate a resume to tailor it per job.</p>
        </div>
        <div role="tablist" aria-label="Document type" className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={tab === t.value}
              onClick={() => router.replace(t.value === "resumes" ? "/dashboard" : `/dashboard?tab=${t.value}`, { scroll: false })}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted",
                tab === t.value && "border-foreground bg-foreground text-background hover:bg-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("text-xs tabular-nums", tab === t.value ? "text-background/60" : "text-muted-foreground")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {tab === "resumes" ? <Resumes /> : <CoverLetters />}
    </div>
  );
}

function Resumes() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const list = useQuery(trpc.resume.list.queryOptions());
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.resume.list.queryKey() });
  const onError = () => toast.error("Something went wrong. Please try again.");

  const create = useMutation(
    trpc.resume.create.mutationOptions({ onSuccess: ({ id }) => router.push(`/resumes/${id}`), onError }),
  );
  const duplicate = useMutation(
    trpc.resume.duplicate.mutationOptions({ onSuccess: ({ id }) => router.push(`/resumes/${id}`), onError }),
  );
  const update = useMutation(trpc.resume.update.mutationOptions({ onSuccess: invalidate, onError }));
  const remove = useMutation(
    trpc.resume.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Resume deleted");
        return invalidate();
      },
      onError,
    }),
  );

  return (
    <DocumentGrid
      kind="resume"
      noun="resume"
      isError={list.isError}
      creating={create.isPending || duplicate.isPending}
      items={list.data?.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt,
        thumbnail: <DocumentThumbnail kind="resume" content={r.content} design={r.design} />,
      }))}
      onCreateBlank={() => create.mutate({})}
      onDuplicate={(id) => duplicate.mutate({ id })}
      onRename={(id, title) => update.mutateAsync({ id, title })}
      onDelete={(id) => remove.mutateAsync({ id })}
      emptyIllustration={<ResumeIllustration />}
    />
  );
}

function CoverLetters() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const list = useQuery(trpc.coverLetter.list.queryOptions());
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.coverLetter.list.queryKey() });
  const onError = () => toast.error("Something went wrong. Please try again.");

  const create = useMutation(
    trpc.coverLetter.create.mutationOptions({ onSuccess: ({ id }) => router.push(`/cover-letters/${id}`), onError }),
  );
  const duplicate = useMutation(
    trpc.coverLetter.duplicate.mutationOptions({
      onSuccess: ({ id }) => router.push(`/cover-letters/${id}`),
      onError,
    }),
  );
  const update = useMutation(trpc.coverLetter.update.mutationOptions({ onSuccess: invalidate, onError }));
  const remove = useMutation(
    trpc.coverLetter.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Cover letter deleted");
        return invalidate();
      },
      onError,
    }),
  );

  return (
    <DocumentGrid
      kind="cover-letter"
      noun="cover letter"
      isError={list.isError}
      creating={create.isPending || duplicate.isPending}
      items={list.data?.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt,
        thumbnail: <DocumentThumbnail kind="cover-letter" content={r.content} design={r.design} />,
      }))}
      onCreateBlank={() => create.mutate({})}
      onDuplicate={(id) => duplicate.mutate({ id })}
      onRename={(id, title) => update.mutateAsync({ id, title })}
      onDelete={(id) => remove.mutateAsync({ id })}
      emptyIllustration={<CoverLetterIllustration />}
    />
  );
}
