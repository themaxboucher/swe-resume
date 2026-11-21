import type { Metadata } from "next";
import { ConnectedApps, ConnectInstructions } from "@/components/settings/connected-apps";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl sm:text-4xl">Settings</h1>
      <section className="flex flex-col gap-4" aria-labelledby="connect-heading">
        <div className="flex flex-col gap-1">
          <h2 id="connect-heading" className="text-lg font-semibold">
            Connect Claude or ChatGPT
          </h2>
          <p className="text-sm text-muted-foreground">
            Let an AI app read and edit your resume, its versions and your cover letters. You approve each app once,
            and it can&apos;t delete anything.
          </p>
        </div>
        <ConnectInstructions />
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="text-lg font-semibold">
          Connected apps
        </h2>
        <ConnectedApps />
      </section>
    </div>
  );
}
