import { Search } from "lucide-react";
import type { ComponentPropsWithRef } from "react";
import { cn } from "~/lib/cn";

export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-control border border-line bg-bg px-3 text-sm text-fg outline-none transition-colors duration-150",
        "placeholder:text-fg-muted focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function SearchInput({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={14}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
      />
      <Input className="pl-8" {...props} />
    </div>
  );
}
