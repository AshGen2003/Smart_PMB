"use client";

import { useEffect } from "react";

export default function TransportationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Transportation page failed to load:", error);
  }, [error]);

  return (
    <main
      style={{
        display: "grid",
        minHeight: "50vh",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <h1>Transportation is temporarily unavailable</h1>
        <p style={{ margin: "0.75rem 0 1.5rem", color: "var(--text-muted)" }}>
          We could not connect to the transportation service. Check that the
          backend is running, then try again.
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
