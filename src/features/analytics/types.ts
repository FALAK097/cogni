export type MetricComparison = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};

export type FormattedMetricComparison = MetricComparison & {
  formatted: string;
};

export type DashboardDateRange = {
  start: string;
  end: string;
};

export type TimeSeriesPoint = {
  date: string;
  count: number;
};

export type BreakdownItem = {
  label: string;
  count: number;
  percentage: number;
};

export type TopQuestion = {
  question: string;
  count: number;
};

export type SatisfactionPoint = {
  date: string;
  score: number | null;
  responses: number;
};

export type DashboardAnalytics = {
  dateRange: DashboardDateRange;
  previousDateRange: DashboardDateRange;
  kpis: {
    totalConversations: MetricComparison;
    uniqueUsers: MetricComparison;
    resolvedConversations: MetricComparison;
    avgResponseTime: FormattedMetricComparison;
    satisfactionScore: FormattedMetricComparison & { max: number };
  };
  conversationsOverTime: TimeSeriesPoint[];
  conversationsBySource: BreakdownItem[];
  conversationsByStatus: BreakdownItem[];
  topQuestions: TopQuestion[];
  userEngagement: {
    messagesSent: MetricComparison;
    messagesReceived: MetricComparison;
    engagementRate: FormattedMetricComparison;
    conversationsPerUser: FormattedMetricComparison;
  };
  satisfactionOverTime: SatisfactionPoint[];
};
