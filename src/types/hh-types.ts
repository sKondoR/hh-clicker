export interface HHCredentials {
  username: string;
  password: string;
}

export interface SearchParams {
  query: string;
  location?: string;
  experience?: string;
  employment?: string[];
}

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  salary?: string;
  url: string;
  viewed: boolean;
  datePosted: string;
}

export interface ActivityStatus {
  percentage: number;
  statusText: string;
  lastUpdated: Date;
}

export interface ScrapingConfig {
  delayBetweenViews: number; // milliseconds
  maxRetries: number;
  viewport?: { width: number; height: number };
}