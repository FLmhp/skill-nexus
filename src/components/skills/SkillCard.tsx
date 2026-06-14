import type { Skill } from "@/types";
import { Clock, User, Tag, Puzzle } from "lucide-react";

interface SkillCardProps {
  skill: Skill;
  onClick: () => void;
}

export default function SkillCard({ skill, onClick }: SkillCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              {skill.name}
            </h3>
            {skill.version && (
              <span className="text-xs text-muted-foreground">v{skill.version}</span>
            )}
          </div>
        </div>
        {skill.agent_type && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
            {skill.agent_type}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {skill.description || "No description"}
      </p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {skill.author && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {skill.author}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(skill.installed_at).toLocaleDateString()}
        </span>
        {skill.file_count > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {skill.file_count} files
          </span>
        )}
      </div>
    </div>
  );
}
