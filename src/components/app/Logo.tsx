import { cn } from "@/lib/utils";

export function Logo({ className, chiaro }: { className?: string; chiaro?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-display font-bold tracking-tight", className)}>
      <span className={chiaro ? "text-sidebar-foreground" : "text-foreground"}>Trade</span>
      <span className={cn("inline-block h-[0.35em] w-[0.35em] rounded-sm", chiaro ? "bg-sidebar-primary" : "bg-primary")} />
    </span>
  );
}
