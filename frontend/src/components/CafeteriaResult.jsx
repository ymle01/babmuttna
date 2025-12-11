import React, { useState } from 'react';

const CafeteriaResult = ({ recommendation, weather, location, onSelectMenu, onShowRoulette, onBack, dailyRecommendations }) => {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [showRouletteModal, setShowRouletteModal] = useState(false);

  if (!recommendation || !recommendation.recommendations) {
    return null;
  }

  const { cafeteria_menu, recommendations, weather_summary, weather_info } = recommendation;

  const handleMenuClick = (menu) => {
    setSelectedMenu(menu);
  };

  const handleConfirm = () => {
    if (selectedMenu) {
      onSelectMenu(selectedMenu.menu_name || selectedMenu.menu);
    }
  };

  const handleRouletteClick = () => {
    setShowRouletteModal(true);
  };

  const handleRouletteChoice = (includeDaily) => {
    setShowRouletteModal(false);
    onShowRoulette(includeDaily);
  };

  const getTypeColor = (type) => {
    // 새 스키마와 기존 스키마 모두 지원
    if (type.includes('상위')) return 'from-yellow-500 to-orange-500';
    if (type.includes('대체')) return 'from-green-500 to-teal-500';
    if (type.includes('예외')) return 'from-blue-500 to-purple-500';
    
    switch (type) {
      case '상위호환':
        return 'from-yellow-500 to-orange-500';
      case '비슷한카테고리':
        return 'from-green-500 to-teal-500';
      case '날씨기반':
        return 'from-blue-500 to-purple-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeEmoji = (type) => {
    // 새 스키마와 기존 스키마 모두 지원
    if (type.includes('상위')) return 'PREMIUM';
    if (type.includes('대체')) return 'ALT';
    if (type.includes('예외')) return 'BONUS';
    
    switch (type) {
      case '상위호환':
        return 'PREMIUM';
      case '비슷한카테고리':
        return 'ALT';
      case '날씨기반':
        return 'BONUS';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-0">
      {/* 룰렛 선택 모달 */}
      {showRouletteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/emoge/lulet.png" alt="roulette" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                룰렛 모드 선택
              </h2>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              어떤 메뉴로 룰렛을 돌릴까요?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRouletteChoice(false)}
                className="w-full glass rounded-xl p-4 hover:bg-white/90 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      추천 메뉴만 (3개)
                    </div>
                    <div className="text-xs text-slate-500">
                      AI가 추천한 3가지 메뉴로만 룰렛 돌리기
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleRouletteChoice(true)}
                className="w-full glass rounded-xl p-4 hover:bg-white/90 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      오늘의 메뉴 포함 (6개)
                    </div>
                    <div className="text-xs text-slate-500">
                      추천 메뉴 + 오늘의 메뉴 총 6가지로 룰렛 돌리기
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowRouletteModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-5xl mx-auto">
        {/* 상단: 뒤로가기 + 날씨 정보 (사이드바와 같은 높이) */}
        <div className="w-full pt-24 pb-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="glass rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/90 text-sm sm:text-base flex-shrink-0"
            >
              ← 뒤로
            </button>
            
            {weather && (
              <div className="glass rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 flex-shrink min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-yellow-300/80 flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-xl">
                      {weather.sky_condition === '맑음' ? '☀️' : 
                       weather.sky_condition === '구름많음' ? '⛅' : 
                       weather.sky_condition === '흐림' ? '☁️' : 
                       weather.sky_condition === '비' ? '🌧️' : 
                       weather.sky_condition === '눈' ? '❄️' : '🌤️'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-[13px] text-slate-500">현재 위치</div>
                    <div className="font-semibold text-xs sm:text-sm truncate">{location || weather.location || '서울시'}</div>
                  </div>
                  <div className="chip rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 flex-shrink-0">
                    {weather.temperature}°C
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메인 헤더 박스 */}
        <div className="w-full pb-6">
          <div className="glass rounded-xl shadow-lg p-4 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <img src="/images/emoge/aibot.png" alt="AI bot" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">
                AI 메뉴 추천
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              <span className="font-medium">오늘 구내식당:</span> {cafeteria_menu}
            </p>
          </div>
        </div>

        {/* 추천 메뉴 카드들 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {recommendations.map((item, index) => (
            <div
              key={index}
              onClick={() => handleMenuClick(item)}
              className={`glass rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-xl overflow-hidden h-full ${
                selectedMenu?.menu_name === item.menu_name || selectedMenu?.menu === item.menu ? 'ring-2 ring-indigo-500 shadow-indigo-200' : ''
              }`}
            >
              {/* 카드 본문 */}
              <div className="p-5 h-full flex flex-col">
                {/* 상단: 타입 배지와 체크 */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${getTypeColor(item.type)}`}>
                    {item.type}
                  </span>
                  {(selectedMenu?.menu_name === item.menu_name || selectedMenu?.menu === item.menu) && (
                    <div className="text-indigo-500 text-xl font-bold">✓</div>
                  )}
                </div>

                {/* 메뉴명 */}
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-3">
                  {item.menu_name || item.display_name || item.menu}
                </h3>
                
                {/* 식당명 */}
                {item.restaurant_name && (
                  <div className="text-xs text-slate-500 mb-3 truncate">
                    {item.restaurant_name}
                  </div>
                )}
                
                {/* 거리와 가격 정보 */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {(item.minutes_away || item.distance?.walking_min) && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {item.minutes_away || item.distance.walking_min}분
                    </span>
                  )}
                  {item.price_range && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {item.price_range}
                    </span>
                  )}
                </div>
                
                {/* 추천 이유 */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 버튼들과 안내 */}
        <div className="space-y-4">
          {!selectedMenu && (
            <div className="text-center">
              <p className="text-sm text-slate-900 font-medium">
                메뉴를 클릭해서 선택하거나, 룰렛으로 운에 맡겨보세요
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
            <button
              onClick={handleRouletteClick}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 sm:py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
            >
              <img src="/images/emoge/lulet.png" alt="roulette" className="w-5 h-5 object-contain" />
              룰렛으로 결정하기
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={!selectedMenu}
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
            >
              {selectedMenu ? (
                <span className="truncate">
                  {selectedMenu.menu_name || selectedMenu.display_name || selectedMenu.menu} 주변 식당 찾기
                </span>
              ) : (
                '메뉴를 선택해주세요'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeteriaResult;

