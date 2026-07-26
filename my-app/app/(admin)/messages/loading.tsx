import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }} aria-busy="true" aria-live="polite">
      <Skeleton height={26} width={140} />
      <Skeleton height={140} width="100%" />
      <SkeletonRows count={5} />
    </div>
  );
}
