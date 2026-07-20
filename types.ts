export enum TravelTheme {
  HEALING = '힐링',
  GASTRONOMY = '맛집 탐방',
  ACTIVITY = '액티비티',
  INSTAGRAM = '인생샷',
  CULTURE = '문화/예술',
  LUXURY = '호캉스/럭셔리'
}

export enum CompanionType {
  SOLO = '나 혼자',
  COUPLE = '연인과',
  FAMILY = '가족과',
  FRIENDS = '친구와'
}

export interface UserPreferences {
  departure: string;     // 출발지 (필수)
  stopover?: string;     // 경유지 (선택)
  destination: string;   // 여행지 (필수)
  duration: number;
  budgetAmount: string;  // 1인당 예산 직접 입력 또는 선택
  companions: CompanionType;
  themes: TravelTheme[];
  preferredMeals: string[];       // 선호하는 식사 유형 (복수 선택)
  accommodationTypes: string[];   // 선호하는 숙박 유형 (복수 선택)
  accommodationBudget: string;    // 숙박 예산 범위
}

export interface Accommodation {
  name: string;
  type: string;
  rating: string;       // e.g., "구글 4.6/5 (후기 1,200개), 네이버 4.8/5"
  reviews: string;      // 평점 및 후기 특징 요약
  estimatedCost: string; // 1박당 예상 비용
  location: string;     // 위치 정보
}

export interface Activity {
  id: string;
  time: string;
  placeName: string;
  description: string;
  category: 'meal' | 'sightseeing' | 'cafe' | 'activity' | 'rest';
  estimatedCost: string;
  reason: string;
  locationHint: string; // e.g., "Near Central Park"
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: Activity[];
  accommodation?: Accommodation; // 추천 숙소 정보
}

export interface TripPlan {
  tripName: string;
  summary: string;
  days: DayPlan[];
  totalEstimatedBudget: string;
}