import { createTRPCRouter } from "./init";
import { coverLetterRouter } from "./routers/cover-letter";
import { resumeRouter } from "./routers/resume";

export const appRouter = createTRPCRouter({
  resume: resumeRouter,
  coverLetter: coverLetterRouter,
});

export type AppRouter = typeof appRouter;
