"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
