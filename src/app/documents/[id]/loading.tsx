import { DetailSkeleton } from "@/components/documents/DetailSkeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <DetailSkeleton />
    </div>
  );
}
