export enum SourceType {
    OFFICIAL = 'OFFICIAL', // Government, Police, 112, AEMET
    NEWS = 'NEWS',         // Newspapers, Online Media
    SOCIAL = 'SOCIAL'      // Twitter, TikTok trends (aggregated via search)
  }
  
  export enum SeverityLevel {
    CRITICAL = 'CRITICAL',
    WARNING = 'WARNING',
    INFO = 'INFO',
    SAFE = 'SAFE'
  }
  
  export interface AlertSource {
    name: string;
    url?: string;
    type: SourceType;
  }
  
  export interface AlertEvent {
    id: string;
    title: string;
    description: string;
    location: string;
    timestamp: string;
    severity: SeverityLevel;
    category: string; // Fire, Weather, Protest, Traffic, Security
    sources: AlertSource[];
    isHistorical?: boolean;
  }
  
  export interface UserLocation {
    lat?: number;
    lng?: number;
    name: string; // City name
    isGPS: boolean;
  }
  
  export interface StatsData {
    name: string;
    value: number;
    fill: string;
  }