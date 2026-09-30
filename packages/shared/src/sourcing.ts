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
}

export interface UpdateTrackingLinkDto {
  name?: string;
  isActive?: boolean;
}
