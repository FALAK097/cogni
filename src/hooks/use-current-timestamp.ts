"use client";

import { useEffect, useState } from "react";

const UPDATE_INTERVAL_MS = 30_000;

export function useCurrentTimestamp() {
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const updateTimestamp = () => setTimestamp(Date.now());
    updateTimestamp();

    const intervalId = window.setInterval(updateTimestamp, UPDATE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return timestamp;
}
