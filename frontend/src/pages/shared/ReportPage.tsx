import { useMemo, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { analyticsApiUrl } from '@/api/analyticsClient';
import {
  normalizeCandidateReport,
  normalizeAiSummary,
  type CandidateReportPayload,
  type AISummaryPayload,
  type EventType,
} from '@/api/candidateReportApi';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import BackLink from '@/components/BackLink';
import styles from './ReportPage.module.css';

const EMPTY_REPORT: CandidateReportPayload = {
  summary:         { candidateName: '—', finalVerdict: 'PASSED' },
  timelineEvents:  [],
  complexityTrend: [{ timestamp: '00:00', complexity: 0 }],
  radarMetrics: {
    systemDesign: 0, codeReadability: 0, communication: 0, coachability: 0,
    technicalScore: 0, integrity: 0,
  },
  comparative: {
    candidateZScore: 0,
    percentile:      0,
    distributionCurve: [{ x: 0, y: 1 }],
  },
};

const EMPTY_AI: AISummaryPayload = {
  positivePoints:   [],
  negativePoints:   [],
  aiRecommendation: '',
};

const EVENT_COLOR: Record<EventType, string> = { NOTE: '#7B9EA6', PASTE: '#A05050', TAB_SWITCH: '#A08030' };
const EVENT_LABEL: Record<EventType, string> = {
  NOTE: 'Заметка',
  PASTE: 'Вставка',
  TAB_SWITCH: 'Смена вкладки',
};

function minutesSince(startMs: number, isoTs: string): number {
  return (new Date(isoTs).getTime() - startMs) / 60000;
}

function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

/** Минуты от начала сессии → компактная строка для осей и тултипов (не путать с mm:ss часов). */
function formatElapsedMinutes(min: number): string {
  if (!Number.isFinite(min) || min < 0) return '0:00';
  let sec = Math.round(min * 60);
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const p2 = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${p2(m)}:${p2(s)}`;
  return `${m}:${p2(s)}`;
}

/** Длительность интервью для карточки метрик (человекочитаемо). */
function formatInterviewDurationLabel(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  const sec = Math.round(min * 60);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  if (m > 0) parts.push(`${m} мин`);
  if (s > 0) parts.push(`${s} с`);
  return parts.join(' ') || '0 с';
}

function getComplexityPattern(values: number[]): string {
  const nonZero = values.filter((v) => v > 0);
  if (nonZero.length < 3) return 'Недостаточно данных';
  const earlyAvg = nonZero.slice(0, Math.floor(nonZero.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(nonZero.length / 2);
  const lateAvg = nonZero.slice(Math.floor(nonZero.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(nonZero.length / 2);
  if (lateAvg > earlyAvg * 1.8) return 'Экспоненциальный рост (риск слабой декомпозиции)';
  if (lateAvg > earlyAvg * 1.2) return 'Умеренный линейный рост';
  return 'Стабильная сложность';
}

function reportListPath(pathname: string): string {
  if (pathname.startsWith('/interviewer/')) return '/interviewer/sessions';
  if (pathname.startsWith('/hr/')) return '/hr/candidates';
  if (pathname.startsWith('/admin/')) return '/admin/users';
  return '/';
}

function interpolateDistributionY(
  curve: { x: number; y: number }[],
  x: number,
): number {
  if (curve.length === 0) return 0;
  if (x <= curve[0].x) return curve[0].y;
  if (x >= curve[curve.length - 1].x) return curve[curve.length - 1].y;
  for (let i = 1; i < curve.length; i += 1) {
    const left = curve[i - 1];
    const right = curve[i];
    if (x >= left.x && x <= right.x) {
      const ratio = (x - left.x) / (right.x - left.x);
      return left.y + ratio * (right.y - left.y);
    }
  }
  return 0;
}


export default function ReportPage() {
  const { id: idRoom = '' } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { token } = useAuth();
  const backTo = reportListPath(pathname);
  const backLabel =
    backTo === '/interviewer/sessions'
      ? 'К списку сессий'
      : backTo === '/hr/candidates'
        ? 'К кандидатам'
        : backTo === '/admin/users'
          ? 'К пользователям'
          : 'На главную';

  const [report, setReport]       = useState<CandidateReportPayload>(EMPTY_REPORT);
  const [aiSummary, setAiSummary] = useState<AISummaryPayload>(EMPTY_AI);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !idRoom) {
      setIsLoading(false);
      setLoadError('Нет токена или идентификатора комнаты.');
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [repRes, aiRes] = await Promise.all([
          fetch(analyticsApiUrl(`/api/v1/rooms/${idRoom}/candidate-report`), { headers }),
          fetch(analyticsApiUrl(`/api/v1/rooms/${idRoom}/ai-summary`), { headers }),
        ]);

        if (cancelled) return;

        if (repRes.ok) {
          const raw: unknown = await repRes.json();
          const norm = normalizeCandidateReport(raw);
          if (norm) setReport(norm);
          else {
            setReport(EMPTY_REPORT);
            setLoadError('Сервис аналитики вернул отчёт в неожиданном формате.');
          }
        } else {
          setReport(EMPTY_REPORT);
          setLoadError(`Не удалось загрузить отчёт (${repRes.status}).`);
        }

        if (aiRes.ok) {
          const rawAi: unknown = await aiRes.json();
          if (!cancelled) setAiSummary(normalizeAiSummary(rawAi));
        } else if (!cancelled) {
          setAiSummary(EMPTY_AI);
        }
      } catch {
        if (!cancelled) {
          setReport(EMPTY_REPORT);
          setLoadError('Ошибка сети при обращении к сервису аналитики.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, idRoom]);

  const timelineStartMs = useMemo(() => {
    if (report.timelineEvents.length === 0) return Date.now();
    return Math.min(
      ...report.timelineEvents.map((e) => new Date(e.timestamp).getTime()),
    );
  }, [report.timelineEvents]);

  const timelineChartData = useMemo(() => {
    const raw = report.timelineEvents.map((event) => {
      const xMin = minutesSince(timelineStartMs, event.timestamp);
      return {
        ...event,
        xMin,
        /** Исходные минуты от старта — для тултипа (xMin после разведения может сдвинуться). */
        xMinActual: xMin,
        yLine: 1,
        eventLabel: EVENT_LABEL[event.type],
      };
    });

    // Одинаковый timestamp + тип → одна координата x; на scatter точки слипаются.
    // Сдвигаем вправо на доли минуты, порядок как в ответе API.
    const stepMin = 0.15;
    const groupKey = (e: (typeof raw)[number]) => `${e.type}\0${e.timestamp}`;
    const groups = new Map<string, number[]>();
    raw.forEach((row, idx) => {
      const k = groupKey(row);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(idx);
    });
    const out = raw.map((r) => ({ ...r }));
    groups.forEach((indices) => {
      if (indices.length <= 1) return;
      indices.forEach((idx, i) => {
        out[idx] = { ...out[idx], xMin: raw[idx].xMin + i * stepMin };
      });
    });
    return out;
  }, [report.timelineEvents, timelineStartMs]);

  const complexityData = useMemo(() => {
    const trend = report.complexityTrend;
    if (trend.length === 0) return [];
    const first = trend[0].timestamp;
    if (first.includes('T')) {
      const baseMs = new Date(first).getTime();
      return trend.map((p) => ({
        ...p,
        xMin: (new Date(p.timestamp).getTime() - baseMs) / 60000,
      }));
    }
    const base = hhmmToMinutes(first);
    return trend.map((p) => ({
      ...p,
      xMin: hhmmToMinutes(p.timestamp) - base,
    }));
  }, [report.complexityTrend]);

  const radarData = useMemo(
    () => [
      { metric: 'Проектирование', value: report.radarMetrics.systemDesign },
      { metric: 'Читаемость кода', value: report.radarMetrics.codeReadability },
      { metric: 'Коммуникация', value: report.radarMetrics.communication },
      { metric: 'Обучаемость', value: report.radarMetrics.coachability },
      { metric: 'Техника', value: report.radarMetrics.technicalScore },
      { metric: 'Целостность', value: report.radarMetrics.integrity },
    ],
    [report.radarMetrics],
  );

  const noteEvents = useMemo(
    () => report.timelineEvents.filter((e) => e.type === 'NOTE'),
    [report.timelineEvents],
  );

  const behaviorMetrics = useMemo(() => {
    const pasteCount = report.timelineEvents.filter((e) => e.type === 'PASTE').length;
    const tabCount = report.timelineEvents.filter((e) => e.type === 'TAB_SWITCH').length;
    return { pasteCount, tabCount };
  }, [report.timelineEvents]);

  const interviewDurationMin = useMemo(() => {
    if (report.timelineEvents.length === 0) return 0;
    const times = report.timelineEvents.map((e) => new Date(e.timestamp).getTime());
    const minTs = Math.min(...times);
    const maxTs = Math.max(...times);
    return (maxTs - minTs) / 60000;
  }, [report.timelineEvents]);

  const complexityPattern = useMemo(
    () => getComplexityPattern(report.complexityTrend.map((x) => x.complexity)),
    [report.complexityTrend],
  );

  /**
   * Benchmark: кривая — N(0,1) на x ∈ [curve.min, curve.max], а candidateZScore с бэкенда
   * может быть любым (сырой скор сильно выше fallback μ=28 или σ пиров ≈ 0 → z ≫ 3).
   * Recharts по умолчанию даёт category-X: точка кандидата оказывалась отдельным «столбцом»
   * справа, а не по числовой координате — type="number" + domain + clamp позиции на колоколе.
   */
  const benchmarkPlot = useMemo(() => {
    const curve = report.comparative.distributionCurve;
    const zRaw = report.comparative.candidateZScore;
    const name = report.summary.candidateName;
    if (curve.length === 0) {
      return {
        xDomain: [-4, 4] as [number, number],
        zRaw,
        zPlot: zRaw,
        clamped: false,
        candidatePoint: { x: zRaw, y: 0, name },
      };
    }
    const xs = curve.map((p) => p.x);
    const xLow = Math.min(...xs);
    const xHigh = Math.max(...xs);
    const pad = Math.max((xHigh - xLow) * 0.06, 0.15);
    const zPlot = Math.min(xHigh, Math.max(xLow, zRaw));
    const clamped = Math.abs(zRaw - zPlot) > 0.02;
    return {
      xDomain: [xLow - pad, xHigh + pad] as [number, number],
      zRaw,
      zPlot,
      clamped,
      candidatePoint: {
        x: zPlot,
        y: interpolateDistributionY(curve, zPlot),
        name,
      },
    };
  }, [
    report.comparative.candidateZScore,
    report.comparative.distributionCurve,
    report.summary.candidateName,
  ]);

  const aiRecommendationText = useMemo(
    () => aiSummary.aiRecommendation.replace('@{candidateName}', report.summary.candidateName),
    [aiSummary.aiRecommendation, report.summary.candidateName],
  );

  const CustomTimelinePoint = (props: { cx?: number; cy?: number; payload?: { type: EventType } }) => {
    const cx = props.cx ?? 0;
    const cy = props.cy ?? 0;
    const type = props.payload?.type ?? 'NOTE';
    return <circle cx={cx} cy={cy} r={5} fill={EVENT_COLOR[type]} />;
  };

  const verdictClass =
    report.summary.finalVerdict === 'FAILED' ? styles.verdictFailed : styles.verdictPassed;

  return (
    <div className={styles.reportRoot}>
      <BackLink to={backTo}>{backLabel}</BackLink>

      {isLoading && (
        <div className={styles.loadBanner} role="status">
          Загрузка отчёта…
        </div>
      )}
      {loadError && !isLoading && (
        <div className={styles.errorBanner} role="alert">
          {loadError}
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Отчет кандидата: {report.summary.candidateName}</h1>
          <p className={styles.subtitle}>
            Комната: {idRoom} · интерактивный аналитический отчет
          </p>
        </div>
        <span className={`${styles.verdict} ${verdictClass}`}>
          {report.summary.finalVerdict}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>События Paste</span>
          <span className={styles.metricValue}>{behaviorMetrics.pasteCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Смена вкладки</span>
          <span className={styles.metricValue}>{behaviorMetrics.tabCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Время интервью</span>
          <span className={styles.metricValue}>{formatInterviewDurationLabel(interviewDurationMin)}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Z-Score / Перцентиль</span>
          <span className={styles.metricValue}>
            {report.comparative.candidateZScore.toFixed(2)} / {report.comparative.percentile}%
          </span>
        </div>
      </div>

      <section className={styles.aiCard}>
        <h3 className={styles.sectionTitle}>AI-суммаризация</h3>
        <div className={styles.aiGrid}>
          <div className={styles.aiPositive}>
            <h4 className={styles.aiTitle}>Сильные стороны</h4>
            <ul className={styles.aiList}>
              {aiSummary.positivePoints.map((point, i) => (
                <li key={`p-${i}`}>{point}</li>
              ))}
            </ul>
          </div>
          <div className={styles.aiNegative}>
            <h4 className={styles.aiTitle}>Зоны риска</h4>
            <ul className={styles.aiList}>
              {aiSummary.negativePoints.map((point, i) => (
                <li key={`n-${i}`}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.aiRecommendation}>
          <h4 className={styles.aiTitle}>Рекомендация AI</h4>
          <p className={styles.aiRecommendationText}>{aiRecommendationText}</p>
        </div>
      </section>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Интерактивный таймлайн событий</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="xMin"
                stroke="#6060a0"
                tick={{ fill: '#6060a0', fontSize: 11 }}
                tickFormatter={formatElapsedMinutes}
                name="Время"
              />
              <YAxis
                type="number"
                dataKey="yLine"
                domain={[0.5, 1.5]}
                hide
              />
              <ReferenceLine y={1} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                labelStyle={{ color: '#6060a0', fontSize: 11 }}
                itemStyle={{ color: '#c0c0e0', fontSize: 12 }}
                formatter={(_, __, payload) => {
                  const label = payload?.payload?.label ?? '';
                  return label;
                }}
                labelFormatter={(value, payload) => {
                  const p = Array.isArray(payload) ? payload[0]?.payload : (payload as { payload?: { xMinActual?: number } })?.payload;
                  const mins = typeof p?.xMinActual === 'number' ? p.xMinActual : Number(value);
                  return `t=${formatElapsedMinutes(mins)}`;
                }}
              />
              <Legend formatter={(value) => EVENT_LABEL[value as EventType] ?? value} />
              {(['NOTE', 'PASTE', 'TAB_SWITCH'] as EventType[]).map((type) => (
                <Scatter
                  key={type}
                  name={type}
                  data={timelineChartData.filter((e) => e.type === type)}
                  fill={EVENT_COLOR[type]}
                  shape={CustomTimelinePoint}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Динамика сложности кода</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={complexityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="xMin" stroke="#6060a0" tick={{ fill: '#6060a0', fontSize: 11 }} tickFormatter={formatElapsedMinutes} />
              <YAxis stroke="#6060a0" tick={{ fill: '#6060a0', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                labelStyle={{ color: '#6060a0', fontSize: 11 }}
                itemStyle={{ color: '#c0c0e0', fontSize: 12 }}
                formatter={(v) => [`${v}`, 'Цикломатическая сложность']}
                labelFormatter={(v) => `t=${formatElapsedMinutes(Number(v))}`}
              />
              <Legend wrapperStyle={{ color: '#6060a0', fontSize: 12 }} />
              <Line type="monotone" dataKey="complexity" stroke="#7B9EA6" strokeWidth={2} dot={{ r: 3, fill: '#7B9EA6' }} activeDot={{ r: 5, fill: '#7B9EA6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Радар компетенций</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ x, y, payload, textAnchor }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor={textAnchor}
                    fill="#6060a0"
                    fontSize={11}
                    fontWeight={400}
                  >
                    {String(payload?.value ?? '')}
                  </text>
                )}
              />
              <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#6060a0" tick={{ fill: '#6060a0', fontSize: 10 }} />
              <Radar
                name="Профиль кандидата"
                dataKey="value"
                stroke="#7B9EA6"
                fill="#7B9EA6"
                fillOpacity={0.15}
              />
              <Tooltip
                contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                labelStyle={{ color: '#6060a0', fontSize: 11 }}
                itemStyle={{ color: '#c0c0e0', fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Сравнительная гистограмма (Benchmark)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={report.comparative.distributionCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={benchmarkPlot.xDomain}
                allowDecimals
                stroke="#6060a0"
                tick={{ fill: '#6060a0', fontSize: 11 }}
              />
              <YAxis stroke="#6060a0" tick={{ fill: '#6060a0', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                labelStyle={{ color: '#6060a0', fontSize: 11 }}
                itemStyle={{ color: '#c0c0e0', fontSize: 12 }}
                formatter={(v) => Number(v).toFixed(4)}
              />
              <Legend wrapperStyle={{ color: '#6060a0', fontSize: 12 }} />
              <Line type="monotone" dataKey="y" stroke="#7B9EA6" dot={false} strokeWidth={2} name="Распределение" />
              <ReferenceLine
                x={benchmarkPlot.zPlot}
                stroke="#A05050"
                strokeWidth={1}
                label={{
                  value: benchmarkPlot.clamped
                    ? `${report.summary.candidateName} z=${benchmarkPlot.zRaw.toFixed(2)} (на шкале — у края)`
                    : `${report.summary.candidateName} z=${benchmarkPlot.zRaw.toFixed(2)}`,
                  fill: '#A05050',
                  fontSize: 10,
                }}
              />
              <Scatter name="Кандидат" data={[benchmarkPlot.candidatePoint]} fill="#A05050" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.sectionGrid}>
        <section className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Метрики интервьюера: таймлайн заметок</h3>
          <div className={styles.noteList}>
            {noteEvents.map((event) => (
              <div key={`${event.timestamp}-${event.label}`} className={styles.noteRow}>
                <span className={styles.noteTime}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                <p className={styles.noteText}>{event.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Техническая интерпретация</h3>
          <div className={styles.kvList}>
            <div className={styles.kvRow}><span className={styles.kvKey}>Сложность конструкций</span><span className={styles.kvValue}>Высокая</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Цикломатическая динамика</span><span className={styles.kvValue}>{complexityPattern}</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Вердикт vs Время</span><span className={styles.kvValue}>{report.summary.finalVerdict} @ {formatInterviewDurationLabel(interviewDurationMin)}</span></div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Ручные оценки интервьюера</h3>
          <div className={styles.kvList}>
            <div className={styles.kvRow}><span className={styles.kvKey}>Проектирование и архитектура</span><span className={styles.kvValue}>{report.radarMetrics.systemDesign}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Читаемость кода</span><span className={styles.kvValue}>{report.radarMetrics.codeReadability}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Коммуникация</span><span className={styles.kvValue}>{report.radarMetrics.communication}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Обучаемость</span><span className={styles.kvValue}>{report.radarMetrics.coachability}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Технический балл</span><span className={styles.kvValue}>{report.radarMetrics.technicalScore}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Целостность</span><span className={styles.kvValue}>{report.radarMetrics.integrity}/5</span></div>
          </div>
        </section>
      </div>

    </div>
  );
}
