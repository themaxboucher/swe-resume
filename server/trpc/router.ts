import { createTRPCRouter } from "./init";
import { connectionsRouter } from "./routers/connections";
import { coverLetterRouter } from "./routers/cover-letter";
import { resumeRouter } from "./routers/resume";

export const appRouter = createTRPCRouter({
  resume: resumeRouter,
  coverLetter: coverLetterRouter,
  connections: connectionsRouter,
});

export type AppRouter = typeof appRouter;
