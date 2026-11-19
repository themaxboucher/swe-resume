import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Loading editor">
      <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-3">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="ml-auto h-9 w-32 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-full flex-col gap-3 p-4 lg:w-[min(46vw,560px)] lg:border-r lg:border-border">
          <Skeleton className="h-9 w-56 rounded-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <div className="hidden flex-1 justify-center bg-[#ececec] p-8 lg:flex">
          <Skeleton className="aspect-[210/297] h-full max-h-[900px] rounded-none bg-white" />
        </div>
      </div>
    </div>
  );
}

export function EditorError({ notFound }: { notFound: boolean }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl">{notFound ? "Document not found" : "Something went wrong"}</h1>
      <p className="max-w-sm text-muted-foreground">
        {notFound
          ? "It may have been deleted, or it belongs to another account."
          : "We couldn't load this document. Check your connection and try again."}
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
