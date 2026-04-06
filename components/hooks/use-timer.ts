"use client";

import { useState, useEffect } from "react";

export function useTimer(startTime: number) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const hhmmss = `${String(hours).padStart(2, "0")}:${mmss}`;

  const long = [
    days > 0 ? `${days}d` : "",
    hours > 0 ? `${hours}h` : "",
    `${minutes}m`,
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(" ");

  return { elapsed, totalSeconds, days, hours, minutes, seconds, mmss, hhmmss, long };
}
