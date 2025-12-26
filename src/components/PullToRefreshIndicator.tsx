import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  progress: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  progress,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const showIndicator = pullDistance > 10 || isRefreshing;
  const isTriggered = progress >= 1 || isRefreshing;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
        showIndicator ? "opacity-100" : "opacity-0"
      )}
      style={{
        top: 0,
        height: Math.max(pullDistance, isRefreshing ? threshold : 0),
        minHeight: isRefreshing ? 60 : 0,
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 shadow-lg transition-all duration-200",
          isTriggered && "bg-primary/20 border-primary/30"
        )}
      >
        <RefreshCw
          className={cn(
            "w-5 h-5 text-primary transition-transform duration-200",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing 
              ? undefined 
              : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
};
