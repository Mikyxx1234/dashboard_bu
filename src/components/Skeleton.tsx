import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Bloco retangular animado — para substituir cards, imagens ou seções. */
export function SkeletonBox({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-800/70 ${className}`}
      style={style}
    />
  );
}

/** Linha de texto animada — para substituir parágrafos e títulos. */
export function SkeletonText({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-800/70 ${className}`}
      style={style}
    />
  );
}

/** Card completo com header + linhas de texto. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <SkeletonBox className="h-9 w-9 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="h-4 w-2/3" />
          <SkeletonText className="h-3 w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonText className="h-3 w-full" />
        <SkeletonText className="h-3 w-5/6" />
        <SkeletonText className="h-3 w-4/6" />
      </div>
    </div>
  );
}

/** Grid de cards skeleton — para substituir listas enquanto carregam. */
export function SkeletonCardList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Linha de tabela skeleton. */
export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-800/50">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <SkeletonText
                className="h-3"
                style={{ width: `${60 + ((r * 3 + c * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stat card skeleton (número grande + label). */
export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-10 w-10 flex-shrink-0 rounded-lg" />
        <div className="space-y-2">
          <SkeletonText className="h-6 w-12" />
          <SkeletonText className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
