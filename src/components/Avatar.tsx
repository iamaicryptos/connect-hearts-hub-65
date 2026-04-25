import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
};

export default function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <div
      className={cn(
        "rounded-full bg-secondary text-foreground flex items-center justify-center font-semibold shrink-0 overflow-hidden border border-border",
        sizeMap[size],
        className
      )}
    >
      {src ? <img src={src} alt={name ?? "avatar"} className="w-full h-full object-cover" /> : initial}
    </div>
  );
}
