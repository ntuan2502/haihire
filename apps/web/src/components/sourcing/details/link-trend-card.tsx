"use client";

import { useI18n } from "@/i18n";
import type { TimeSeriesPoint } from "@haihire/shared";
import { TrendingUp } from "lucide-react";

interface LinkTrendCardProps {
  data: TimeSeriesPoint[];
}

export function LinkTrendCard({ data }: LinkTrendCardProps) {
  const { t } = useI18n();

  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  // SVG Chart Dimensions
  const height = 120;
  const width = 600;
  const paddingX = 24;
  const paddingTop = 16;
  const paddingBottom = 24;

  const maxVal = Math.max(
    1,
    ...data.map((d) => d.count),
  );

  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const chartHeight = height - paddingTop - paddingBottom;
    const y = height - paddingBottom - (d.count / maxVal) * chartHeight;
    return { x, y, ...d };
  });

  const pathD =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")
      : "";

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${
          height - paddingBottom
        } L ${points[0].x} ${height - paddingBottom} Z`
      : "";

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <TrendingUp className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t("sourcing.details.trendTitle")}
        </h3>
      </div>

      {/* Visualization */}
      {!hasData && data.length <= 1 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          {t("sourcing.details.trendNoData")}
        </div>
      ) : (
        <div className="w-full">
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-28 sm:h-32 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="linkTrendGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Baseline */}
              <line
                x1={paddingX}
                y1={height - paddingBottom}
                x2={width - paddingX}
                y2={height - paddingBottom}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800 stroke-[1]"
              />

              {/* Area */}
              {areaD && <path d={areaD} fill="url(#linkTrendGradient)" />}

              {/* Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {points.map((p, idx) => (
                <g key={idx} className="group">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.count > 0 ? "3.5" : "2"}
                    className={`${
                      p.count > 0
                        ? "fill-blue-600 stroke-white dark:stroke-slate-900 stroke-2"
                        : "fill-blue-400"
                    }`}
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Date Axis Labels */}
          {points.length > 1 && (
            <div className="flex justify-between px-2 pt-1 text-[10px] font-medium text-slate-400">
              <span>{points[0].date}</span>
              {points.length > 2 && (
                <span>{points[Math.floor(points.length / 2)].date}</span>
              )}
              <span>{points[points.length - 1].date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
