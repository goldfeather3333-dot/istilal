import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Quote, Minimize2 } from 'lucide-react';

interface ExclusionOptionsDisplayProps {
  excludeBibliographic?: boolean | null;
  excludeQuoted?: boolean | null;
  excludeSmallSources?: boolean | null;
}

export const ExclusionOptionsDisplay: React.FC<ExclusionOptionsDisplayProps> = ({
  excludeBibliographic,
  excludeQuoted,
  excludeSmallSources,
}) => {
  const options = [
    { key: 'bibliographic', value: excludeBibliographic, label: 'Bibliography', icon: BookOpen },
    { key: 'quoted', value: excludeQuoted, label: 'Quoted', icon: Quote },
    { key: 'small', value: excludeSmallSources, label: 'Small Sources', icon: Minimize2 },
  ];

  const enabledOptions = options.filter(opt => opt.value);

  if (enabledOptions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        No exclusions
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {enabledOptions.map((opt) => {
        const Icon = opt.icon;
        return (
          <Badge
            key={opt.key}
            variant="secondary"
            className="text-xs px-1.5 py-0.5 gap-1"
          >
            <Icon className="h-3 w-3" />
            {opt.label}
          </Badge>
        );
      })}
    </div>
  );
};
