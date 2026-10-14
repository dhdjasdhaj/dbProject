import {motion} from 'framer-motion';
import {calculatePercentage} from '../utils/score';

interface ScoreProgressBarProps {
  label: string;
  score: number;
  maxScore: number;
  color?: string;
  delay?: number;
  className?: string;
}

/**
 * 分数进度条组件
 */
export default function ScoreProgressBar({
  label,
  score,
  maxScore,
  color = 'bg-ds-accent',
  delay = 0,
  className = ''
}: ScoreProgressBarProps) {
  const percentage = calculatePercentage(score, maxScore);

  return (
      <div className={`rounded-lg border border-ds-border bg-ds-bg-subtle p-3 dark:border-neutral-800 dark:bg-neutral-900/60 ${className}`}>
          <div className="mb-1 text-xs font-semibold text-ds-fg-muted dark:text-neutral-500">{label}</div>
      <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-pill bg-ds-bg-composer dark:bg-neutral-800">
          <motion.div
            className={`h-full ${color} rounded-pill`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay }}
          />
        </div>
          <span className="w-8 text-right text-sm font-bold text-ds-fg dark:text-neutral-200">
          {score}/{maxScore}
        </span>
      </div>
    </div>
  );
}
