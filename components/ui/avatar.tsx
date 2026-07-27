import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar"
      className={cn("avatar size-8 shrink-0 select-none", className)}
      {...props}
    />
  );
}

type ImageState = "loading" | "loaded" | "error";

function AvatarImage({ className, ...props }: React.ComponentProps<"img">) {
  const [state, setState] = React.useState<ImageState>(props.src ? "loading" : "error");
  return (
    <div className={cn("rounded-full", state === "error" && "hidden")}>
      <img
        data-slot="avatar-image"
        alt={props.alt || ""}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={cn("aspect-square size-full object-cover", className)}
        {...props}
      />
    </div>
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-base-200 text-sm text-base-content",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
