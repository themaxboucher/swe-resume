import {
  AwardIcon,
  BriefcaseIcon,
  FolderGitIcon,
  GraduationCapIcon,
  LanguagesIcon,
  LayersIcon,
  LinkIcon,
  SparklesIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { SectionType } from "@/lib/documents/schema";

const ICONS: Record<SectionType, LucideIcon> = {
  profile: UserRoundIcon,
  experience: BriefcaseIcon,
  education: GraduationCapIcon,
  skills: SparklesIcon,
  projects: FolderGitIcon,
  languages: LanguagesIcon,
  certifications: AwardIcon,
  links: LinkIcon,
  custom: LayersIcon,
};

export function SectionIcon({ type, className }: { type: SectionType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} />;
}
