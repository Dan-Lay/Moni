import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface CardSkeletonProps {
  lines?: number;
  hasBar?: boolean;
  hasGrid?: boolean;
}

export const CardSkeleton = ({ lines = 2, hasBar = true, hasGrid = false }: CardSkeletonProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card rounded-2xl p-5"
  >
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-4 rounded-md" />
    </div>
    <Skeleton className="mb-1 h-8 w-40" />
    <Skeleton className="mb-4 h-3 w-24" />
    {hasBar && (
      <>
        <div className="mb-2 flex justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </>
    )}
    {hasGrid && (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    )}
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="mt-2 h-3 w-full" />
    ))}
  </motion.div>
);

export const ChartSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card rounded-2xl p-5"
  >
    <Skeleton className="mb-4 h-4 w-40" />
    <div className="flex items-end gap-2 h-52">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  </motion.div>
);

export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card rounded-2xl p-5"
  >
    <Skeleton className="mb-4 h-4 w-40" />
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  </motion.div>
);
