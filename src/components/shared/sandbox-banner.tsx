"use client";

import { FlaskConical } from "lucide-react";

export function SandboxBanner() {
  if (process.env.NEXT_PUBLIC_TEST_MODE !== "true") return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white">
      <FlaskConical className="h-3.5 w-3.5" />
      TEST MODE — data is fake and will be wiped periodically
    </div>
  );
}
