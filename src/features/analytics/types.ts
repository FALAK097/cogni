export type MetricComparison = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};

export type FormattedMetricComparison = MetricComparison & {
  formatted: string;
};

export type DashboardDateRange = {
  /** Inclusive calendar dates (YYYY-MM-DD) in the workspace timezone. */
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
  conversationId: string;
};

export type SatisfactionPoint = {
  date: string;
  score: number | null;
  responses: number;
};

export type NegativeFeedbackItem = {
  conversationId: string;
  question: string;
  response: string;
  reason: string | null;
  feedbackAt: string;
};

export type UnansweredQuestionItem = {
  conversationId: string;
  question: string;
  askedAt: string;
  count: number;
};

export type DashboardAnalytics = {
  dateRange: DashboardDateRange;
  previousDateRange: DashboardDateRange;
  kpis: {
    totalConversations: MetricComparison;
    uniqueUsers: MetricComparison;
    closedConversations: MetricComparison;
    avgAiResponseTime: FormattedMetricComparison;
    satisfactionScore: FormattedMetricComparison & { max: number; responses: number };
  };
  conversationsOverTime: TimeSeriesPoint[];
  conversationsBySource: BreakdownItem[];
  conversationsByStatus: BreakdownItem[];
  topQuestions: TopQuestion[];
  negativeFeedback: NegativeFeedbackItem[];
  unansweredQuestions: UnansweredQuestionItem[];
  userEngagement: {
    messagesSent: MetricComparison;
    messagesReceived: MetricComparison;
    engagementRate: FormattedMetricComparison;
    conversationsPerUser: FormattedMetricComparison;
  };
  satisfactionOverTime: SatisfactionPoint[];
};
