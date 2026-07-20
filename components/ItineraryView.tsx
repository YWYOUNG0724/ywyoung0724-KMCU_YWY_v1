import React, { useState } from 'react';
import { TripPlan, Activity, UserPreferences, Accommodation } from '../types';
import { Clock, MapPin, DollarSign, RefreshCw, Navigation, Sun, Moon, Utensils, Coffee, Camera, Download, Copy, FileText, ArrowRight, Bed } from 'lucide-react';
import * as D3 from 'd3';
import { getAlternativeActivity, modifyTripPlan } from '../services/geminiService';

interface ItineraryViewProps {
  plan: TripPlan;
  prefs: UserPreferences;
}

const categoryLabels: Record<string, string> = {
  meal: '식사',
  sightseeing: '관광',
  cafe: '카페',
  activity: '액티비티',
  rest: '휴식'
};

// Visual category mapping
const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'meal': return <Utensils className="w-4 h-4" />;
    case 'cafe': return <Coffee className="w-4 h-4" />;
    case 'sightseeing': return <Camera className="w-4 h-4" />;
    case 'rest': return <Moon className="w-4 h-4" />;
    default: return <Sun className="w-4 h-4" />;
  }
};

const getCategoryColor = (cat: string) => {
   switch (cat) {
    case 'meal': return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'cafe': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'sightseeing': return 'bg-blue-100 text-blue-600 border-blue-200';
    case 'rest': return 'bg-purple-100 text-purple-600 border-purple-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ plan, prefs }) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [currentPlan, setCurrentPlan] = useState<TripPlan>(plan);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [modifying, setModifying] = useState(false);

  const activeDay = currentPlan.days.find(d => d.day === selectedDay) || currentPlan.days[0];

  const getDirectionsUrls = (activity: Activity, index: number, activities: Activity[]) => {
    const startPlace = index === 0 ? prefs.departure : activities[index - 1].placeName;
    const endPlace = activity.placeName;
    
    // Google Maps Transit & Walking Directions
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startPlace)}&destination=${encodeURIComponent(endPlace)}&travelmode=transit`;
    
    // Naver Maps Search / Navigation
    const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(endPlace)}`;
    
    return { googleUrl, naverUrl };
  };

  const generateFormattedText = () => {
    let text = `==================================================\n`;
    text += `✈️ 윤우영의 여행일정 AI 여행 계획: ${currentPlan.tripName}\n`;
    text += `==================================================\n\n`;

    text += `■ 여행 정보\n`;
    text += `- 출발지: ${prefs.departure}\n`;
    if (prefs.stopover) {
      text += `- 경유지: ${prefs.stopover}\n`;
    }
    text += `- 최종 목적지: ${prefs.destination}\n`;
    text += `- 동행인: ${prefs.companions}\n`;
    text += `- 1인당 예산: ${prefs.budgetAmount}\n`;
    text += `- 선호하는 식사 유형: ${prefs.preferredMeals.join(', ')}\n`;
    text += `- 선호하는 숙박 유형: ${prefs.accommodationTypes.join(', ')}\n`;
    text += `- 1박당 숙박 예산: ${prefs.accommodationBudget}\n`;
    text += `- 총 예상 경비: ${currentPlan.totalEstimatedBudget}\n`;
    text += `- 여행 요약: ${currentPlan.summary}\n\n`;

    currentPlan.days.forEach((day) => {
      text += `--------------------------------------------------\n`;
      text += `📅 ${day.day}일차 (테마: ${day.theme})\n`;
      text += `--------------------------------------------------\n`;

      day.activities.forEach((item) => {
        text += `[${item.time}] ${item.placeName} (${categoryLabels[item.category] || item.category})\n`;
        text += `  • 설명: ${item.description}\n`;
        text += `  • 추천 이유: ${item.reason}\n`;
        if (item.estimatedCost) {
          text += `  • 예상 비용: ${item.estimatedCost}\n`;
        }
        text += `  • 위치 팁: ${item.locationHint}\n\n`;
      });

      if (day.accommodation) {
        text += `🏡 [추천 숙소] ${day.accommodation.name} (${day.accommodation.type})\n`;
        text += `  • 평점/후기: ${day.accommodation.rating}\n`;
        text += `  • 주요 후기 특징: ${day.accommodation.reviews}\n`;
        text += `  • 1박당 예상 비용: ${day.accommodation.estimatedCost}\n`;
        text += `  • 위치: ${day.accommodation.location}\n\n`;
      }
    });

    text += `==================================================\n`;
    text += `윤우영의 여행일정 AI - AI 초개인화 여행 플래너\n`;
    text += `==================================================\n`;
    
    return text;
  };

  const handleDownloadTxt = () => {
    const text = generateFormattedText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeTripName = currentPlan.tripName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim() || '여행일정';
    link.download = `${safeTripName}_일정표.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleDownloadPdfHTML = () => {
    let daySchedules = '';
    currentPlan.days.forEach((day) => {
      let activitiesHtml = '';
      day.activities.forEach((item) => {
        activitiesHtml += `
          <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 14px; font-weight: bold; color: #2563eb; background-color: #eff6ff; padding: 4px 8px; border-radius: 6px;">${item.time}</span>
              <span style="font-size: 12px; color: #64748b;">${item.estimatedCost ? item.estimatedCost : ''}</span>
            </div>
            <h3 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 6px 0;">${item.placeName}</h3>
            <p style="font-size: 14px; color: #475569; margin: 0 0 10px 0; line-height: 1.5; word-break: keep-all;">${item.description}</p>
            <div style="font-size: 13px; color: #475569; background-color: #f8fafc; padding: 10px 14px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <strong>추천 이유:</strong> ${item.reason}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">📍 ${item.locationHint}</div>
          </div>
        `;
      });

      let accommodationHtml = '';
      if (day.accommodation) {
        accommodationHtml = `
          <div style="margin-top: 30px; padding: 20px; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 13px; font-weight: bold; color: #6d28d9; background-color: #ede9fe; padding: 4px 8px; border-radius: 6px;">🏡 추천 숙소 (${day.accommodation.type})</span>
              <span style="font-size: 12px; font-weight: bold; color: #7c3aed;">${day.accommodation.estimatedCost}</span>
            </div>
            <h3 style="font-size: 20px; font-weight: bold; color: #4c1d95; margin: 0 0 6px 0;">${day.accommodation.name}</h3>
            <p style="font-size: 13px; color: #6b21a8; margin: 0 0 12px 0;">📍 위치: ${day.accommodation.location}</p>
            <div style="font-size: 13px; color: #4c1d95; background-color: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <strong>⭐ 검색 평점 및 리뷰 요약:</strong> ${day.accommodation.rating}
              <div style="margin-top: 6px; font-size: 13px; color: #4b5563; line-height: 1.5;">"${day.accommodation.reviews}"</div>
            </div>
          </div>
        `;
      }

      daySchedules += `
        <div class="page-break" style="margin-bottom: 40px; background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); page-break-inside: avoid;">
          <h2 style="font-size: 22px; font-weight: 800; color: #1e3a8a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">
            📅 ${day.day}일차 - ${day.theme}
          </h2>
          ${activitiesHtml}
          ${accommodationHtml}
        </div>
      `;
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${currentPlan.tripName} - AI 여행 일정표</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Nanum Gothic', sans-serif; }
    @media print {
      .no-print { display: none !important; }
      body { background-color: white !important; padding: 0 !important; }
      .page-break { page-break-after: always; box-shadow: none !important; padding: 0 !important; margin-bottom: 0 !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-6 md:p-12 max-w-4xl mx-auto">
  <div class="no-print flex justify-between items-center mb-8 bg-blue-50 p-4 rounded-2xl border border-blue-100">
    <div class="text-sm text-blue-800 font-medium">
      💡 <strong>인쇄 및 저장 가이드:</strong> 아래 버튼을 클릭하여 열리는 창에서 <strong>대상: PDF로 저장</strong>을 선택하고 <strong>배경 그래픽</strong>을 켜시면 가장 아름답게 저장됩니다.
    </div>
    <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 whitespace-nowrap">
      🖨️ PDF 다운로드 / 인쇄하기
    </button>
  </div>

  <div style="text-align: center; margin-bottom: 40px; border-bottom: 4px double #cbd5e1; padding-bottom: 30px;">
    <span style="font-size: 14px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 2px;">윤우영의 여행일정 AI</span>
    <h1 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 10px 0;">✈️ ${currentPlan.tripName}</h1>
    <p style="font-size: 16px; color: #475569; max-width: 600px; margin: 0 auto; line-height: 1.6; word-break: keep-all;">${currentPlan.summary}</p>
    
    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 24px; flex-wrap: wrap;">
      <span style="background-color: #f1f5f9; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #334155;">📍 최종 목적지: ${prefs.destination}</span>
      <span style="background-color: #f1f5f9; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #334155;">🚗 출발지: ${prefs.departure}</span>
      ${prefs.stopover ? `<span style="background-color: #f1f5f9; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #334155;">🔄 경유지: ${prefs.stopover}</span>` : ''}
    </div>
    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 10px; flex-wrap: wrap;">
      <span style="background-color: #ecfdf5; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #047857;">💰 1인당 여행예산: ${prefs.budgetAmount}</span>
      <span style="background-color: #ecfdf5; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #047857;">📊 총 예산: ${currentPlan.totalEstimatedBudget}</span>
      <span style="background-color: #fef2f2; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; color: #b91c1c;">👥 동행: ${prefs.companions}</span>
    </div>
    <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; font-size: 12px; color: #475569;">
      <span>🍽️ 선호 식사: ${prefs.preferredMeals.join(', ')}</span> | 
      <span>🏢 선호 숙소: ${prefs.accommodationTypes.join(', ')} (${prefs.accommodationBudget})</span>
    </div>
  </div>

  ${daySchedules}

  <div style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
    본 일정표는 "윤우영의 여행일정 AI"에서 생성되었습니다. 즐겁고 안전한 여행 되세요!
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeTripName = currentPlan.tripName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim() || '여행일정';
    link.download = `${safeTripName}_일정표.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setDownloadedPdf(true);
    setTimeout(() => setDownloadedPdf(false), 2000);
  };

  const handleCopyClipboard = async () => {
    const text = generateFormattedText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("클립보드 복사에 실패했습니다. 직접 복사해주세요.");
    }
  };

  const handleReplace = async (activity: Activity) => {
    setLoadingId(activity.id);
    try {
      const newActivity = await getAlternativeActivity(activity, prefs);
      // Update plan structure
      const updatedDays = currentPlan.days.map(day => {
        if (day.day !== selectedDay) return day;
        return {
          ...day,
          activities: day.activities.map(a => a.id === activity.id ? { ...newActivity, id: a.id } : a)
        };
      });
      setCurrentPlan({ ...currentPlan, days: updatedDays });
    } catch (e) {
      alert("현재 대체 장소를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleModifyPlan = async () => {
    if (!feedbackText.trim()) return;
    setModifying(true);
    try {
      const modifiedPlan = await modifyTripPlan(currentPlan, prefs, feedbackText);
      setCurrentPlan(modifiedPlan);
      setFeedbackText('');
      alert("AI가 수정 요청을 성공적으로 반영하여 일정을 업데이트했습니다!");
    } catch (err) {
      alert("일정을 수정하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setModifying(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
      
      {/* Left Panel: Timeline */}
      <div className="flex-1 min-w-0 md:max-w-xl flex flex-col">
        {/* Header */}
        <div className="mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2 break-keep">
                {currentPlan.tripName}
            </h1>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed break-keep">{currentPlan.summary}</p>
            
            <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-gray-400 block mb-0.5 font-medium">출발지</span>
                      <span className="font-bold text-gray-700 truncate block">{prefs.departure}</span>
                    </div>
                    {prefs.stopover && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-gray-400 block mb-0.5 font-medium">경유지</span>
                        <span className="font-bold text-gray-700 truncate block">{prefs.stopover}</span>
                      </div>
                    )}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-gray-400 block mb-0.5 font-medium">최종 목적지</span>
                      <span className="font-bold text-gray-700 truncate block">{prefs.destination}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-gray-400 block mb-0.5 font-medium">1인당 설정 예산</span>
                      <span className="font-bold text-blue-600 truncate block">{prefs.budgetAmount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-gray-400 block mb-0.5 font-medium">선호 식사</span>
                      <span className="font-bold text-gray-700 truncate block">{prefs.preferredMeals.join(', ')}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-gray-400 block mb-0.5 font-medium">선호 숙소 / 예산</span>
                      <span className="font-bold text-gray-700 truncate block">
                        {prefs.accommodationTypes.join(', ')} ({prefs.accommodationBudget})
                      </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3 mr-1" /> 총 예상 경비: {currentPlan.totalEstimatedBudget}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {prefs.companions}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                        <button
                            onClick={handleDownloadPdfHTML}
                            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                                downloadedPdf 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            id="btn-download-pdf-html"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {downloadedPdf ? 'PDF 준비완료' : 'PDF/인쇄 다운로드'}
                        </button>
                        <button
                            onClick={handleDownloadTxt}
                            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                                downloaded 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            id="btn-download-itinerary"
                        >
                            <Download className="w-3.5 h-3.5" />
                            {downloaded ? 'TXT 완료' : 'TXT 다운로드'}
                        </button>
                        <button
                            onClick={handleCopyClipboard}
                            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                                copied 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                            id="btn-copy-itinerary"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? '복사 완료' : '일정 복사'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* AI 실시간 일정 수정 창 (Revision Request Input) */}
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-3xl border border-blue-100 shadow-sm animate-fade-in">
            <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-blue-600 ${modifying ? 'animate-spin' : ''}`} />
                ✨ 실시간 AI 일정 맞춤 수정 (피드백 반영)
            </h3>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed break-keep">
                "2일차 오후에 쇼핑 코스를 하나 추가해줘", "식사 일정을 모두 한식 맛집 위주로 변경해줘" 등 원하시는 수정 피드백을 입력하면 AI가 전체 일정을 스마트하게 재조정합니다.
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && feedbackText.trim() && !modifying) {
                        handleModifyPlan();
                      }
                    }}
                    placeholder="수정 피드백 입력 (예: 일정을 조금 더 여유롭게 짜줘)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                    disabled={modifying}
                />
                <button
                    onClick={handleModifyPlan}
                    disabled={modifying || !feedbackText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shrink-0"
                >
                    {modifying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                          <span>수정</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
          {currentPlan.days.map((day) => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                selectedDay === day.day
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {day.day}일차
            </button>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="flex-1 space-y-4 pb-20">
          <div className="px-2 mb-2 text-sm text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center">
             <span className="font-bold text-blue-800">💡 테마: {activeDay.theme}</span>
             <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">
               {activeDay.activities.length}개 일정
             </span>
          </div>

          <div className="space-y-4">
            {activeDay.activities.map((item, idx) => {
              const { googleUrl, naverUrl } = getDirectionsUrls(item, idx, activeDay.activities);
              return (
                <div key={item.id} className="group relative pl-8 before:absolute before:left-3 before:top-8 before:bottom-[-24px] before:w-0.5 before:bg-gray-200 last:before:hidden">
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-3 w-6 h-6 rounded-full bg-white border-4 border-blue-100 shadow-sm flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>

                  {/* Card */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {item.time}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${getCategoryColor(item.category)}`}>
                              {getCategoryIcon(item.category)}
                              {categoryLabels[item.category] || item.category}
                          </span>
                      </div>
                      {item.estimatedCost && (
                           <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                             {item.estimatedCost}
                           </span>
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-gray-800 mb-1 break-keep">{item.placeName}</h3>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed break-keep">{item.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl mb-3 border border-gray-50">
                        <div className="flex-1 flex items-start gap-1.5">
                           <div className="mt-0.5 min-w-[14px]">✨</div>
                           <p className="italic text-gray-600 break-keep">"{item.reason}"</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                             <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                             <span className="truncate max-w-[180px]">{item.locationHint}</span>
                        </div>
                        
                        <div className="sm:flex-1 flex flex-wrap gap-1.5">
                            <span className="text-[10px] text-gray-400 self-center font-bold">길찾기:</span>
                            <a 
                               href={naverUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-green-700 hover:text-white bg-green-50 hover:bg-green-600 border border-green-100 px-2 py-1 rounded text-[11px] font-bold transition-all"
                            >
                                Naver
                            </a>
                            <a 
                               href={googleUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-100 px-2 py-1 rounded text-[11px] font-bold transition-all"
                            >
                                Google
                            </a>
                        </div>

                        <button 
                            onClick={() => handleReplace(item)}
                            disabled={loadingId === item.id}
                            className="text-xs font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 hover:bg-blue-50 rounded ml-auto"
                        >
                            {loadingId === item.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3 h-3" />
                            )}
                            다른 추천
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Recommended Accommodation Card */}
            {activeDay.accommodation && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/40 rounded-3xl p-5 border border-indigo-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
                        <Bed className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {activeDay.accommodation.type || '숙소'}
                        </span>
                        <h4 className="font-extrabold text-gray-800 text-sm mt-0.5">
                          오늘의 추천 숙소
                        </h4>
                      </div>
                    </div>
                    {activeDay.accommodation.estimatedCost && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                        {activeDay.accommodation.estimatedCost}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <h5 className="font-extrabold text-gray-900 text-lg mb-1">
                      {activeDay.accommodation.name}
                    </h5>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400" />
                      {activeDay.accommodation.location}
                    </p>
                  </div>

                  {/* Ratings & Reviews */}
                  <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                        ⭐ 평점 및 후기
                      </span>
                      <span className="font-semibold text-gray-700 text-xs">
                        {activeDay.accommodation.rating}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      "{activeDay.accommodation.reviews}"
                    </p>
                  </div>

                  {/* Search Link Button on Naver / Google */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                    <span className="text-[10px] text-gray-400 font-bold">검색 및 후기 더보기:</span>
                    <a
                      href={`https://search.naver.com/search.naver?query=${encodeURIComponent(prefs.destination + ' ' + activeDay.accommodation.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-700 hover:text-white bg-green-50 hover:bg-green-600 border border-green-100 px-2.5 py-1 rounded text-[11px] font-bold transition-all"
                    >
                      Naver
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(prefs.destination + ' ' + activeDay.accommodation.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-100 px-2.5 py-1 rounded text-[11px] font-bold transition-all"
                    >
                      Google
                    </a>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right Panel: Visualization / Route (Desktop) or Tab (Mobile) */}
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col gap-4">
        {/* Route Visualization Card */}
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl h-fit sticky top-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-400" />
                {selectedDay}일차 동선 미리보기
            </h3>
            
            <div className="space-y-6 relative">
                 {/* Decorative Line */}
                 <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-700/50"></div>

                 {activeDay.activities.map((item, i) => (
                     <div key={i} className="relative pl-6 flex items-center gap-3 group">
                         <div className={`absolute left-0 w-4 h-4 rounded-full border-2 border-slate-800 transition-colors ${i === 0 ? 'bg-green-500' : i === activeDay.activities.length - 1 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                         <div className="flex-1 py-1">
                             <div className="text-xs font-mono text-gray-400 mb-0.5">{item.time}</div>
                             <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                                 {item.placeName}
                             </div>
                         </div>
                     </div>
                 ))}

                 {activeDay.accommodation && (
                     <div className="relative pl-6 flex items-center gap-3 group border-t border-gray-700/30 pt-2.5 mt-2.5">
                         <div className="absolute left-0 w-4 h-4 rounded-full border-2 border-slate-800 bg-indigo-500 animate-pulse"></div>
                         <div className="flex-1 py-1">
                             <div className="text-xs font-mono text-indigo-300 mb-0.5">추천 숙소</div>
                             <div className="text-sm font-bold text-indigo-100 group-hover:text-white transition-colors truncate">
                                 🏡 {activeDay.accommodation.name}
                             </div>
                         </div>
                     </div>
                 )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700/50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">일정 밸런스</h4>
                {/* Simple Bar Chart using standard HTML/Tailwind */}
                <div className="flex gap-2 h-20 items-end">
                    {['meal', 'sightseeing', 'rest'].map((cat) => {
                         const count = activeDay.activities.filter(a => a.category === cat).length;
                         const height = Math.max(10, count * 20) + '%';
                         return (
                            <div key={cat} className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                <div 
                                    style={{ height }} 
                                    className={`w-full rounded-t-md opacity-80 group-hover:opacity-100 transition-all ${
                                        cat === 'meal' ? 'bg-orange-500' : cat === 'sightseeing' ? 'bg-blue-500' : 'bg-purple-500'
                                    }`}
                                ></div>
                                <span className="text-[10px] text-gray-400 capitalize">{categoryLabels[cat] || cat}</span>
                            </div>
                         )
                    })}
                </div>
            </div>
        </div>
        
        {/* Dynamic Widget */}
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600">
                    <Sun className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm">AI 맞춤 제안</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed break-keep">
                        설정하신 식사 취향(${prefs.preferredMeals.join(', ')})과 숙소 스타일(${prefs.accommodationTypes.join(', ')})에 맞춰 최적화된 동선과 일정을 설계했습니다. 네이버/구글 검색 링크를 통해 실시간 후기를 편리하게 비교해 보세요!
                    </p>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default ItineraryView;
