import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

type Variant = "default" | "primary" | "ghost" | "outline";

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border px-3 text-sm font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "border-line bg-surface text-fg hover:border-accent",
        variant === "primary" &&
          "border-transparent bg-accent text-white hover:opacity-90",
        variant === "ghost" &&
          "border-transparent bg-transparent text-fg-soft hover:bg-surface-hover hover:text-fg",
        variant === "outline" &&
          "border-line bg-transparent text-fg hover:border-accent hover:bg-surface-hover",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-soft transition-colors duration-150",
        "hover:border-accent hover:text-fg disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
