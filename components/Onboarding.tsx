import React, { useState } from 'react';
import { UserPreferences, TravelTheme, CompanionType } from '../types';
import StepIndicator from './StepIndicator';
import { MapPin, Calendar, Users, Wallet, Heart, ArrowRight, Check, Utensils, Bed } from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [departure, setDeparture] = useState('');
  const [stopover, setStopover] = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(2);
  const [budgetAmount, setBudgetAmount] = useState('50만원');
  const [companions, setCompanions] = useState<CompanionType>(CompanionType.COUPLE);
  const [themes, setThemes] = useState<TravelTheme[]>([]);

  // 식사 및 숙박 선호도 상태
  const [preferredMeals, setPreferredMeals] = useState<string[]>([]);
  const [accommodationTypes, setAccommodationTypes] = useState<string[]>([]);
  const [accommodationBudget, setAccommodationBudget] = useState('10~15만원(실속형)');

  const mealOptions = [
    '정통 한식', '현지 토속음식', '일식', '중식', '양식', '분식', '디저트/카페', '뷔페', '로컬 길거리 음식 등'
  ];

  const accommodationOptions = [
    '호텔', '리조트', '모텔', '펜션/풀빌라', '한옥', '게스트하우스 등 기타'
  ];

  const accommodationBudgetOptions = [
    '5만원 내외(가성비)', '10만원 이하(가성비)', '10~15만원(실속형)', '15~20만원(실속형)', '20~25만원(고급형)', '25만원 이상(럭셔리)'
  ];

  const toggleTheme = (theme: TravelTheme) => {
    if (themes.includes(theme)) {
      setThemes(themes.filter(t => t !== theme));
    } else {
      if (themes.length < 3) {
        setThemes([...themes, theme]);
      }
    }
  };

  const togglePreferredMeal = (meal: string) => {
    if (preferredMeals.includes(meal)) {
      setPreferredMeals(preferredMeals.filter(m => m !== meal));
    } else {
      setPreferredMeals([...preferredMeals, meal]);
    }
  };

  const toggleAccommodationType = (type: string) => {
    if (accommodationTypes.includes(type)) {
      setAccommodationTypes(accommodationTypes.filter(t => t !== type));
    } else {
      setAccommodationTypes([...accommodationTypes, type]);
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else {
      onComplete({
        departure: departure.trim() || '서울',
        stopover: stopover.trim() || undefined,
        destination: destination.trim() || '제주도',
        duration,
        budgetAmount: budgetAmount.trim() || '50만원',
        companions,
        themes: themes.length > 0 ? themes : [TravelTheme.HEALING],
        preferredMeals: preferredMeals.length > 0 ? preferredMeals : ['정통 한식'],
        accommodationTypes: accommodationTypes.length > 0 ? accommodationTypes : ['호텔'],
        accommodationBudget,
      });
    }
  };

  const isStepValid = () => {
    if (step === 1) return departure.trim().length > 0 && destination.trim().length > 0;
    if (step === 2) return budgetAmount.trim().length > 0;
    if (step === 3) return preferredMeals.length > 0 && accommodationTypes.length > 0;
    if (step === 4) return themes.length > 0;
    return false;
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <StepIndicator currentStep={step} totalSteps={4} />

      {step === 1 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">어디로 떠나시나요?</h2>
          <p className="text-gray-500 mb-8">여행 일정을 구성하는 출발지, 경유지, 여행지를 알려주세요.</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">출발지 <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-blue-500 w-5 h-5" />
                <input
                  type="text"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  placeholder="예: 서울, 인천공항, 김해공항, 우리집"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">경유지 <span className="text-gray-400 text-xs">(선택)</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={stopover}
                  onChange={(e) => setStopover(e.target.value)}
                  placeholder="예: 대전, 경주, 혹은 경유 도시"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">최종 여행지 <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-indigo-500 w-5 h-5" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="예: 제주도, 부산, 도쿄, 파리"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">여행 기간 (일)</label>
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => setDuration(Math.max(1, duration - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-lg font-bold"
                >
                  -
                </button>
                <div className="flex-1 text-center font-semibold text-gray-800 flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {duration}일
                </div>
                <button
                  onClick={() => setDuration(Math.min(14, duration + 1))}
                  className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">누구와 함께, 예산은?</h2>
          <p className="text-gray-500 mb-8">동행인 정보와 1인당 예산을 직접 설정해 주세요.</p>

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">동행인</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(CompanionType).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCompanions(type)}
                    className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                      companions === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-blue-300 text-gray-600'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${companions === type ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="font-medium">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                1인당 여행 예산 <span className="text-red-500">*</span>
              </label>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                 <div className="grid grid-cols-3 gap-2">
                    {['10만원 이하', '30만원', '50만원', '100만원', '200만원', '제한 없음'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setBudgetAmount(preset)}
                        className={`py-2 px-1 rounded-lg border text-xs font-semibold transition-all ${
                          budgetAmount === preset
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                 </div>
                 
                 <div className="relative mt-2">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Wallet className="h-4 w-4 text-gray-400" />
                   </div>
                   <input
                     type="text"
                     value={budgetAmount}
                     onChange={(e) => setBudgetAmount(e.target.value)}
                     placeholder="예산 직접 입력 (예: 80만원, 150만원, 1000달러 등)"
                     className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm shadow-inner"
                   />
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in-up space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">식사 및 숙박 선호도</h2>
            <p className="text-gray-500 mb-8">선호하는 맛집 및 숙소 스타일을 복수로 선택해 주세요.</p>
          </div>

          {/* Preferred Meals Choice */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-blue-500" />
              선호하는 식사 유형 <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">(복수선택)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {mealOptions.map((meal) => {
                const isSelected = preferredMeals.includes(meal);
                return (
                  <button
                    type="button"
                    key={meal}
                    onClick={() => togglePreferredMeal(meal)}
                    className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-md ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-blue-300 text-gray-600'
                    }`}
                  >
                    {meal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Accommodation Choice */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-indigo-500" />
              선호하는 숙박 유형 <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">(복수선택)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {accommodationOptions.map((type) => {
                const isSelected = accommodationTypes.includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => toggleAccommodationType(type)}
                    className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold shadow-md ring-1 ring-indigo-500'
                        : 'border-gray-200 bg-white hover:border-indigo-300 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accommodation Budget Choice */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-500" />
              1박당 숙박 예산 범위 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accommodationBudgetOptions.map((preset) => {
                const isSelected = accommodationBudget === preset;
                return (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setAccommodationBudget(preset)}
                    className={`py-3 px-1 rounded-xl border text-[11px] font-semibold transition-all text-center ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-md ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:border-emerald-300 text-gray-600'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">나의 여행 DNA</h2>
          <p className="text-gray-500 mb-8">원하는 여행 테마를 최대 3개 선택해주세요.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(TravelTheme).map((theme) => {
              const isSelected = themes.includes(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  className={`relative p-4 rounded-2xl border transition-all h-28 flex flex-col items-center justify-center gap-2 text-center ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'border-gray-200 bg-white hover:border-blue-300 text-gray-600 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-white text-blue-600 rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <Heart className={`w-6 h-6 ${isSelected ? 'fill-current' : 'text-gray-400'}`} />
                  <span className="font-semibold text-sm">{theme}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-4 rounded-xl font-bold text-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            이전 단계
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!isStepValid()}
          className={`${step > 1 ? 'flex-[2]' : 'w-full'} py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
            isStepValid()
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl transform hover:-translate-y-1'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {step === 4 ? '여행 계획 생성하기' : '다음 단계'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
