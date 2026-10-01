export enum SourcingChannel {
  LINKEDIN = "LINKEDIN",
  INDEED = "INDEED",
  GOOGLE_JOBS = "GOOGLE_JOBS",
  CAREER_SITE = "CAREER_SITE",
  REFERRAL = "REFERRAL",
  DIRECT = "DIRECT",
  HANDSHAKE = "HANDSHAKE",
  EMAIL = "EMAIL",
  WE_WORK_REMOTELY = "WE_WORK_REMOTELY",
  STACK_OVERFLOW = "STACK_OVERFLOW",
  TWITTER_X = "TWITTER_X",
  REDDIT = "REDDIT",
  GLASSDOOR = "GLASSDOOR",
  AGENCY = "AGENCY",
  FACEBOOK = "FACEBOOK",
  OTHER = "OTHER",
}

export type TimeRangeFilter = "7d" | "30d" | "90d" | "all";

export interface TrackingLinkItem {
  id: string;
  organizationId: string;
  name: string;
  token: string;
  source: SourcingChannel;
  customSource?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  campaign?: string | null;
  medium?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  clicksCount: number;
  applicationsCount: number;
  conversionRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelBreakdownItem {
  channel: SourcingChannel;
  count: number;
  percentage: number;
}

export interface TopTrackingLinkItem {
  id: string;
  name: string;
  token: string;
  source: SourcingChannel;
  jobTitle?: string | null;
  clicks: number;
  apps: number;
  cvr: number;
}

export interface TopReferrerItem {
  domain: string;
  count: number;
}

export interface RecentAttributedCandidateItem {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  source: SourcingChannel;
  sourceDetails?: string | null;
  campaign?: string | null;
  stage: string;
  appliedAt: string;
}

export interface ConversionBySourceItem {
  source: SourcingChannel;
  new: number;
  screening: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
  hireRate: number;
}

export interface SourcingStats {
  trackedCount: number;
  totalApplications: number;
  attributionRate: number;
  activeLinksCount: number;
  totalLinksCount: number;
  untrackedCount: number;
  channelBreakdown: ChannelBreakdownItem[];
  topLinks: TopTrackingLinkItem[];
  topReferrers: TopReferrerItem[];
  recentAttributed: RecentAttributedCandidateItem[];
  conversionBySource: ConversionBySourceItem[];
}

export interface AttributionLogItem {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  source: SourcingChannel;
  sourceDetails?: string | null;
  campaign?: string | null;
  stage: string;
  appliedAt: string;
}

export interface CreateTrackingLinkDto {
  name: string;
  source: SourcingChannel;
  customSource?: string;
  jobId?: string;
  campaign?: string;
  medium?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface UpdateTrackingLinkDto {
  name?: string;
  source?: SourcingChannel;
  customSource?: string | null;
  jobId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  isActive?: boolean;
}

export interface PipelineStageBreakdown {
  stage: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AttributedApplicationDetailItem {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  jobType?: string | null;
  referrer?: string | null;
  campaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  stage: string;
  appliedAt: string;
}

export interface TrackingLinkDetail {
  link: TrackingLinkItem;
  stats: {
    clicks: number;
    applications: number;
    cvr: number;
    hireRate: number;
    allTimeAttributed: number;
  };
  pipeline: {
    total: number;
    stages: PipelineStageBreakdown[];
  };
  applicationsOverTime: TimeSeriesPoint[];
  attributedApplications: AttributedApplicationDetailItem[];
  referrerDomains: TopReferrerItem[];
}

export function buildPublicTrackingUrl(
  origin: string,
  orgSlug: string,
  token: string,
  jobId?: string | null,
  utms?: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
  },
): string {
  const jobSegment = jobId && jobId !== "ALL" ? `/${jobId}` : "";
  const params = new URLSearchParams();
  params.set("ref", token);
  if (utms?.utmSource) params.set("utm_source", utms.utmSource);
  if (utms?.utmMedium) params.set("utm_medium", utms.utmMedium);
  if (utms?.utmCampaign) params.set("utm_campaign", utms.utmCampaign);
  if (utms?.utmTerm) params.set("utm_term", utms.utmTerm);
  if (utms?.utmContent) params.set("utm_content", utms.utmContent);
  return `${origin}/careers/${orgSlug}${jobSegment}?${params.toString()}`;
}

