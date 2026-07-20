import React, { useState } from 'react';
import Onboarding from './components/Onboarding';
import ItineraryView from './components/ItineraryView';
import LoadingScreen from './components/LoadingScreen';
import { generateTripPlan } from './services/geminiService';
import { UserPreferences, TripPlan } from './types';
import { Luggage } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'onboarding' | 'loading' | 'itinerary'>('onboarding');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreferencesComplete = async (prefs: UserPreferences) => {
    setPreferences(prefs);
    setView('loading');
    setError(null);

    try {
      const plan = await generateTripPlan(prefs);
      setTripPlan(plan);
      setView('itinerary');
    } catch (err) {
      console.error(err);
      setError("여행 계획을 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setView('onboarding');
    }
  };

  const handleRestart = () => {
    setPreferences(null);
    setTripPlan(null);
    setView('onboarding');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleRestart}>
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Luggage className="w-5 h-5" />
            </div>
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-gray-900">
              윤우영의 <span className="text-blue-600">여행일정 AI</span>
            </span>
          </div>
          
          {view === 'itinerary' && (
             <button 
                onClick={handleRestart}
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
             >
                새로운 여행
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-6">
        {error && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm text-center">
                {error}
            </div>
        )}

        {view === 'onboarding' && (
          <Onboarding onComplete={handlePreferencesComplete} />
        )}

        {view === 'loading' && (
          <LoadingScreen />
        )}

        {view === 'itinerary' && tripPlan && preferences && (
          <ItineraryView plan={tripPlan} prefs={preferences} />
        )}
      </main>
    </div>
  );
};

export default App;