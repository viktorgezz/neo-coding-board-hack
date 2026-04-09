/**
 * Normalize Analytics service candidate-report + ai-summary JSON for ReportPage.
 */

export type EventType = 'NOTE' | 'PASTE' | 'TAB_SWITCH';

export interface TimelineEvent {
  timestamp: string;
  type: EventType;
  label: string;
}

export interface ComplexityPoint {
  timestamp: string;
  complexity: number;
}

export interface DistributionPoint {
  x: number;
  y: number;
}

export interface CandidateReportPayload {
  summary: {
    candidateName: string;
    finalVerdict: 'PASSED' | 'FAILED';
  };
  timelineEvents: TimelineEvent[];
  complexityTrend: ComplexityPoint[];
  radarMetrics: {
    systemDesign: number;
    codeReadability: number;
    communication: number;
    coachability: number;
    technicalScore: number;
    integrity: number;
  };
  comparative: {
    candidateZScore: number;
    percentile: number;
    distributionCurve: DistributionPoint[];
  };
}

export interface AISummaryPayload {
  positivePoints: string[];
  negativePoints: string[];
  aiRecommendation: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toEventType(t: string): EventType {
  if (t === 'PASTE' || t === 'TAB_SWITCH') return t;
  return 'NOTE';
}

export function normalizeCandidateReport(data: unknown): CandidateReportPayload | null {
  if (!isRecord(data)) return null;

  const summaryRaw = data.summary;
  const summaryObj = isRecord(summaryRaw) ? summaryRaw : {};
  const candidateName = String(
    summaryObj.candidateName ?? summaryObj.name ?? 'Кандидат',
  );
  const verdictRaw = String(
    summaryObj.finalVerdict ?? summaryObj.verdict ?? 'PASSED',
  ).toUpperCase();
  const finalVerdict: 'PASSED' | 'FAILED' =
    verdictRaw === 'FAILED' || verdictRaw === 'REJECTED' ? 'FAILED' : 'PASSED';

  const timelineEvents: TimelineEvent[] = Array.isArray(data.timelineEvents)
    ? data.timelineEvents
        .map((e): TimelineEvent | null => {
          if (!isRecord(e)) return null;
          return {
            timestamp: String(e.timestamp ?? ''),
            type:      toEventType(String(e.type ?? 'NOTE')),
            label:     String(e.label ?? ''),
          };
        })
        .filter((e): e is TimelineEvent => e !== null && e.timestamp.length > 0)
    : [];

  const complexityTrend: ComplexityPoint[] = Array.isArray(data.complexityTrend)
    ? data.complexityTrend
        .map((p): ComplexityPoint | null => {
          if (!isRecord(p)) return null;
          const c = p.complexity;
          return {
            timestamp: String(p.timestamp ?? '00:00'),
            complexity: typeof c === 'number' ? c : Number(c) || 0,
          };
        })
        .filter((p): p is ComplexityPoint => p !== null)
    : [];

  const radarRaw = isRecord(data.radarMetrics) ? data.radarMetrics : {};
  const num = (k: string) => {
    const v = radarRaw[k];
    return typeof v === 'number' ? v : Number(v) || 0;
  };
  const radarMetrics = {
    systemDesign:    num('systemDesign'),
    codeReadability: num('codeReadability'),
    communication:   num('communication'),
    coachability:    num('coachability'),
    technicalScore:  num('technicalScore'),
    integrity:       num('integrity'),
  };

  const compRaw = isRecord(data.comparative) ? data.comparative : {};
  const z = compRaw.candidateZScore;
  const pct = compRaw.percentile;
  const curveRaw = compRaw.distributionCurve;
  const distributionCurve: DistributionPoint[] = Array.isArray(curveRaw)
    ? curveRaw
        .map((pt): DistributionPoint | null => {
          if (!isRecord(pt)) return null;
          const x = pt.x;
          const y = pt.y;
          return {
            x: typeof x === 'number' ? x : Number(x) || 0,
            y: typeof y === 'number' ? y : Number(y) || 0,
          };
        })
        .filter((p): p is DistributionPoint => p !== null)
    : [];

  if (distributionCurve.length === 0) {
    distributionCurve.push({ x: 0, y: 1 });
  }

  return {
    summary:         { candidateName, finalVerdict },
    timelineEvents,
    complexityTrend:
      complexityTrend.length > 0
        ? complexityTrend
        : [{ timestamp: '00:00', complexity: 0 }],
    radarMetrics,
    comparative: {
      candidateZScore: typeof z === 'number' ? z : Number(z) || 0,
      percentile:      typeof pct === 'number' ? pct : Number(pct) || 0,
      distributionCurve,
    },
  };
}

export function normalizeAiSummary(data: unknown): AISummaryPayload {
  if (!isRecord(data)) {
    return {
      positivePoints:   [],
      negativePoints:   [],
      aiRecommendation: '',
    };
  }
  const pos = data.positivePoints;
  const neg = data.negativePoints;
  return {
    positivePoints: Array.isArray(pos)
      ? pos.map((x) => String(x))
      : [],
    negativePoints: Array.isArray(neg)
      ? neg.map((x) => String(x))
      : [],
    aiRecommendation: String(data.aiRecommendation ?? ''),
  };
}
