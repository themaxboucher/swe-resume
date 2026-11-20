"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NewVersionDialog } from "@/components/editor/version-dialogs";
import { downloadFileName } from "@/lib/documents/versions";
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
  const versionCount = useQuery(trpc.resume.get.queryOptions()).data?.versions.length;
  const letterCount = useQuery(trpc.coverLetter.list.queryOptions()).data?.length;

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "resumes", label: "Resume versions", count: versionCount },
    { value: "cover-letters", label: "Cover letters", count: letterCount },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl sm:text-5xl">Your documents</h1>
          <p className="text-muted-foreground">
            One resume, a version for every kind of role. Each version picks what it shows and how it looks.
          </p>
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
      {tab === "resumes" ? <ResumeVersions /> : <CoverLetters />}
    </div>
  );
}

function ResumeVersions() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const resume = useQuery(trpc.resume.get.queryOptions());
  const [newOpen, setNewOpen] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.resume.get.queryKey() });
  const onError = (error: { message: string }) => toast.error(error.message || "Something went wrong. Please try again.");
  // Wait for the fresh list before opening the editor, which reads it from the cache.
  const openVersion = async ({ id }: { id: string }) => {
    await refresh();
    router.push(`/resume?v=${id}`);
  };

  const create = useMutation(trpc.resume.createVersion.mutationOptions({ onSuccess: openVersion, onError }));
  const duplicate = useMutation(trpc.resume.duplicateVersion.mutationOptions({ onSuccess: openVersion, onError }));
  const rename = useMutation(trpc.resume.renameVersion.mutationOptions({ onSuccess: refresh, onError }));
  const remove = useMutation(
    trpc.resume.deleteVersion.mutationOptions({
      onSuccess: () => {
        toast.success("Version deleted");
        return refresh();
      },
      onError,
    }),
  );

  const data = resume.data;
  const fileName = data ? downloadFileName(data.fileName, data.content.personal.name) : "";

  return (
    <>
      <DocumentGrid
        noun="version"
        isError={resume.isError}
        creating={create.isPending || duplicate.isPending}
        hrefFor={(id) => `/resume?v=${id}`}
        downloadFor={(item) => ({ url: `/api/pdf/resume/${item.id}`, fileName })}
        items={data?.versions.map((v) => ({
          id: v.id,
          title: v.name,
          // Editing the shared text changes every version.
          updatedAt: v.updatedAt > data.updatedAt ? v.updatedAt : data.updatedAt,
          thumbnail: <DocumentThumbnail kind="resume" content={data.content} layout={v.layout} design={v.design} />,
        }))}
        onCreateBlank={() => setNewOpen(true)}
        onNew={() => setNewOpen(true)}
        onDuplicate={(id) => duplicate.mutate({ id })}
        onRename={(id, name) => rename.mutateAsync({ id, name })}
        onDelete={(id) => remove.mutateAsync({ id })}
        canDelete={(data?.versions.length ?? 0) > 1}
        deleteDescription="Your resume's text stays. Only this version's choices of what to show, its order and its design are removed."
        emptyIllustration={<ResumeIllustration />}
      />
      {data && (
        <NewVersionDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          versions={data.versions}
          defaultSourceId={data.lastVersionId}
          onCreate={(input) => create.mutateAsync(input)}
        />
      )}
    </>
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
      noun="cover letter"
      hrefFor={(id) => `/cover-letters/${id}`}
      downloadFor={(item) => ({ url: `/api/pdf/cover-letter/${item.id}`, fileName: item.title })}
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
