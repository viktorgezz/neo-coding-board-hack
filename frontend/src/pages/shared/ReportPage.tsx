import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
import styles from './ReportPage.module.css';

type EventType = 'NOTE' | 'PASTE' | 'TAB_SWITCH';

interface TimelineEvent {
  timestamp: string;
  type: EventType;
  label: string;
}

interface ComplexityPoint {
  timestamp: string;
  complexity: number;
}

interface DistributionPoint {
  x: number;
  y: number;
}

interface CandidateReportPayload {
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

interface AISummaryPayload {
  positivePoints: string[];
  negativePoints: string[];
  aiRecommendation: string;
}

const MOCK_REPORT: CandidateReportPayload = {
  summary: {
    candidateName: 'Елена',
    finalVerdict: 'PASSED',
  },
  timelineEvents: [
    { timestamp: '2026-04-08T14:01:00+03:00', type: 'NOTE', label: 'Сформулировал задачу: порядок курсов с зависимостями.' },
    { timestamp: '2026-04-08T14:06:00+03:00', type: 'NOTE', label: 'Уточнил: граф ориентированный, нужен один топологический порядок.' },
    { timestamp: '2026-04-08T14:14:00+03:00', type: 'NOTE', label: 'Предложил Kahn вместо DFS, обсудили плюсы.' },
    { timestamp: '2026-04-08T14:28:00+03:00', type: 'NOTE', label: 'Исправил направление ребра после подсказки.' },
    { timestamp: '2026-04-08T14:44:00+03:00', type: 'NOTE', label: 'Оценка сложности O(V+E) — верно.' },
    { timestamp: '2026-04-08T15:31:00+03:00', type: 'NOTE', label: 'Добавил демо-assert для примера из условия.' },
    { timestamp: '2026-04-08T15:48:00+03:00', type: 'NOTE', label: 'Итог: решение принято, обсудили альтернативу DFS.' },
    { timestamp: '2026-04-08T17:25:00+03:00', type: 'PASTE', label: 'Вставка из буфера' },
    { timestamp: '2026-04-08T17:40:00+03:00', type: 'TAB_SWITCH', label: 'Смена фокуса вкладки' },
    { timestamp: '2026-04-08T17:55:00+03:00', type: 'PASTE', label: 'Вставка из буфера' },
  ],
  complexityTrend: [
    { timestamp: '14:00', complexity: 0 },
    { timestamp: '14:10', complexity: 0 },
    { timestamp: '14:17', complexity: 12 },
    { timestamp: '14:21', complexity: 0 },
    { timestamp: '14:31', complexity: 27 },
    { timestamp: '14:40', complexity: 31 },
    { timestamp: '14:57', complexity: 40 },
    { timestamp: '15:06', complexity: 45 },
    { timestamp: '15:12', complexity: 50 },
    { timestamp: '15:16', complexity: 54 },
    { timestamp: '15:23', complexity: 59 },
    { timestamp: '15:33', complexity: 71 },
    { timestamp: '15:44', complexity: 83 },
    { timestamp: '15:48', complexity: 85 },
    { timestamp: '15:55', complexity: 98 },
    { timestamp: '15:59', complexity: 100 },
    { timestamp: '16:10', complexity: 100 },
  ],
  radarMetrics: {
    systemDesign: 4,
    codeReadability: 5,
    communication: 4,
    coachability: 4,
    technicalScore: 5,
    integrity: 4,
  },
  comparative: {
    candidateZScore: 1.56,
    percentile: 100,
    distributionCurve: [
      { x: -3.5, y: 0.002194 }, { x: -3.2, y: 0.005952 }, { x: -2.9, y: 0.014779 },
      { x: -2.6, y: 0.033579 }, { x: -2.3, y: 0.06982 }, { x: -2.0, y: 0.132847 },
      { x: -1.7, y: 0.231307 }, { x: -1.4, y: 0.368546 }, { x: -1.1, y: 0.537355 },
      { x: -0.8, y: 0.716964 }, { x: -0.5, y: 0.875385 }, { x: -0.2, y: 0.978062 },
      { x: 0, y: 1 }, { x: 0.2, y: 0.978062 }, { x: 0.5, y: 0.875385 }, { x: 0.8, y: 0.716964 },
      { x: 1.1, y: 0.537355 }, { x: 1.4, y: 0.368546 }, { x: 1.7, y: 0.231307 },
      { x: 2.0, y: 0.132847 }, { x: 2.3, y: 0.06982 }, { x: 2.6, y: 0.033579 },
      { x: 2.9, y: 0.014779 }, { x: 3.2, y: 0.005952 }, { x: 3.5, y: 0.002194 },
    ],
  },
};

const EVENT_COLOR: Record<EventType, string> = { NOTE: '#38bdf8', PASTE: '#ef4444', TAB_SWITCH: '#facc15' };
const EVENT_EMOJI: Record<EventType, string> = { NOTE: '📝', PASTE: '📋', TAB_SWITCH: '🟨' };
const EVENT_LABEL: Record<EventType, string> = {
  NOTE: 'Заметка',
  PASTE: 'Вставка',
  TAB_SWITCH: 'Смена вкладки',
};

const MOCK_AI_SUMMARY: AISummaryPayload = {
  positivePoints: [
    'Кандидат уверенно разобрался с задачей топологической сортировки графа.',
    'Общался эффективно, задавал правильные вопросы и демонстрировал понимание сложности решения.',
    'Легко воспринял обратную связь от интервьюера и оперативно исправлял ошибки.',
    'Аккуратно подходил к деталям реализации, например, проверяя наличие пустого prerequisites.',
  ],
  negativePoints: [
    'Наблюдались небольшие задержки и паузы при выполнении задачи, хотя они были незначительными.',
    'Произошли две вставки из буфера обмена после завершения основного решения, уже после финального вердикта.',
  ],
  aiRecommendation:
    '@{candidateName} продемонстрировал хорошее владение алгоритмом топологической сортировки и уверенное знание структуры данных и алгоритмической сложности. Несмотря на некоторые паузы и поздние вставки, его общее техническое мастерство и коммуникация свидетельствуют о потенциале успешного выполнения задач в нашей команде.',
};

function minutesSince(startMs: number, isoTs: string): number {
  return (new Date(isoTs).getTime() - startMs) / 60000;
}

function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

function formatMin(min: number): string {
  const clamped = Math.max(0, Math.round(min * 60));
  const mm = Math.floor(clamped / 60).toString().padStart(2, '0');
  const ss = (clamped % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
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

function interpolateDistributionY(curve: DistributionPoint[], x: number): number {
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

function getScoreColor(value: number): string {
  if (value >= 5) return '#22c55e';
  if (value >= 4) return '#84cc16';
  if (value >= 3) return '#f59e0b';
  return '#ef4444';
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const report = MOCK_REPORT;
  const aiSummary = MOCK_AI_SUMMARY;

  const timelineStartMs = useMemo(
    () => Math.min(...report.timelineEvents.map((e) => new Date(e.timestamp).getTime())),
    [report.timelineEvents],
  );

  const timelineChartData = useMemo(() => {
    return report.timelineEvents.map((event) => ({
      ...event,
      xMin: minutesSince(timelineStartMs, event.timestamp),
      yLine: 1,
      eventLabel: EVENT_LABEL[event.type],
    }));
  }, [report.timelineEvents, timelineStartMs]);

  const complexityData = useMemo(() => {
    const base = hhmmToMinutes(report.complexityTrend[0]?.timestamp ?? '00:00');
    return report.complexityTrend.map((p) => ({
      ...p,
      xMin: hhmmToMinutes(p.timestamp) - base,
    }));
  }, [report.complexityTrend]);

  const radarData = useMemo(
    () => [
      { metric: 'System Design', value: report.radarMetrics.systemDesign },
      { metric: 'Читаемость', value: report.radarMetrics.codeReadability },
      { metric: 'Коммуникация', value: report.radarMetrics.communication },
      { metric: 'Обучаемость', value: report.radarMetrics.coachability },
      { metric: 'Техника', value: report.radarMetrics.technicalScore },
      { metric: 'Целостность', value: report.radarMetrics.integrity },
    ],
    [report.radarMetrics],
  );
  const radarScoreByMetric = useMemo(
    () => Object.fromEntries(radarData.map((item) => [item.metric, item.value])) as Record<string, number>,
    [radarData],
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
    const minTs = Math.min(...report.timelineEvents.map((e) => new Date(e.timestamp).getTime()));
    const maxTs = Math.max(...report.timelineEvents.map((e) => new Date(e.timestamp).getTime()));
    return (maxTs - minTs) / 60000;
  }, [report.timelineEvents]);

  const complexityPattern = useMemo(
    () => getComplexityPattern(report.complexityTrend.map((x) => x.complexity)),
    [report.complexityTrend],
  );

  const candidateDistributionPoint = useMemo(
    () => ({
      x: report.comparative.candidateZScore,
      y: interpolateDistributionY(report.comparative.distributionCurve, report.comparative.candidateZScore),
      name: report.summary.candidateName,
    }),
    [report.comparative.candidateZScore, report.comparative.distributionCurve, report.summary.candidateName],
  );

  const aiRecommendationText = useMemo(
    () => aiSummary.aiRecommendation.replace('@{candidateName}', report.summary.candidateName),
    [aiSummary.aiRecommendation, report.summary.candidateName],
  );

  const CustomTimelinePoint = (props: { cx?: number; cy?: number; payload?: { type: EventType } }) => {
    const cx = props.cx ?? 0;
    const cy = props.cy ?? 0;
    const type = props.payload?.type ?? 'NOTE';
    return (
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16}>
        {EVENT_EMOJI[type]}
      </text>
    );
  };

  return (
    <div className={styles.reportRoot}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Отчет кандидата: {report.summary.candidateName}</h1>
          <p className={styles.subtitle}>
            Комната: {id} · интерактивный аналитический отчет
          </p>
        </div>
        <span className={`${styles.verdict} ${styles.verdictPassed}`}>
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
          <span className={styles.metricValue}>{formatMin(interviewDurationMin)}</span>
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
              {aiSummary.positivePoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className={styles.aiNegative}>
            <h4 className={styles.aiTitle}>Зоны риска</h4>
            <ul className={styles.aiList}>
              {aiSummary.negativePoints.map((point) => (
                <li key={point}>{point}</li>
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
          <h2 className={styles.chartTitle}>1) Интерактивный таймлайн событий</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                dataKey="xMin"
                stroke="#9ca3af"
                tickFormatter={formatMin}
                name="Время"
              />
              <YAxis
                type="number"
                dataKey="yLine"
                domain={[0.5, 1.5]}
                hide
              />
              <ReferenceLine y={1} stroke="#334155" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(_, __, payload) => {
                  const type = payload?.payload?.type as EventType | undefined;
                  const label = payload?.payload?.label ?? '';
                  return `${type ? EVENT_EMOJI[type] : ''} ${label}`.trim();
                }}
                labelFormatter={(value) => `t=${formatMin(Number(value))}`}
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
          <h2 className={styles.chartTitle}>2) Динамика сложности кода</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={complexityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="xMin" stroke="#9ca3af" tickFormatter={formatMin} />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}`, 'Цикломатическая сложность']} labelFormatter={(v) => `t=${formatMin(Number(v))}`} />
              <Legend />
              <Line type="monotone" dataKey="complexity" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>3) Радар компетенций</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ x, y, payload, textAnchor }) => {
                  const metric = String(payload?.value ?? '');
                  const score = radarScoreByMetric[metric] ?? 0;
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      fill={getScoreColor(score)}
                      fontSize={12}
                      fontWeight={700}
                    >
                      {metric}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#64748b" />
              <Radar
                name="Профиль кандидата"
                dataKey="value"
                stroke="#a78bfa"
                fill="#8b5cf6"
                fillOpacity={0.4}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>4) Сравнительная гистограмма (Benchmark)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={report.comparative.distributionCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="x" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(v) => Number(v).toFixed(4)} />
              <Legend />
              <Line type="monotone" dataKey="y" stroke="#f59e0b" dot={false} strokeWidth={2} name="Распределение" />
              <ReferenceLine
                x={report.comparative.candidateZScore}
                stroke="#ef4444"
                strokeWidth={2}
                label={`${report.summary.candidateName} z=${report.comparative.candidateZScore.toFixed(2)}`}
              />
              <Scatter name="Кандидат" data={[candidateDistributionPoint]} fill="#ef4444" />
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
            <div className={styles.kvRow}><span className={styles.kvKey}>Вердикт vs Время</span><span className={styles.kvValue}>{report.summary.finalVerdict} @ {formatMin(interviewDurationMin)}</span></div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Ручные оценки интервьюера</h3>
          <div className={styles.kvList}>
            <div className={styles.kvRow}><span className={styles.kvKey}>Оценка решения (System Design)</span><span className={styles.kvValue}>{report.radarMetrics.systemDesign}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Читаемость кода</span><span className={styles.kvValue}>{report.radarMetrics.codeReadability}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Коммуникация</span><span className={styles.kvValue}>{report.radarMetrics.communication}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Обучаемость (Coachability)</span><span className={styles.kvValue}>{report.radarMetrics.coachability}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Технический балл</span><span className={styles.kvValue}>{report.radarMetrics.technicalScore}/5</span></div>
            <div className={styles.kvRow}><span className={styles.kvKey}>Целостность (Integrity)</span><span className={styles.kvValue}>{report.radarMetrics.integrity}/5</span></div>
          </div>
        </section>
      </div>

    </div>
  );
}
