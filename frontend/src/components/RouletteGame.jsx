import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { fixOklchColors } from '../utils/html2canvasSafeColors';

const RouletteGame = ({ menus, dailyRecommendations, includeDaily, weather, location, onResult, onBack }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null); // 결과 화면 캡처용 ref

  // 룰렛에 사용할 메뉴 리스트 생성
  const getRouletteMenus = () => {
    if (!includeDaily || !dailyRecommendations?.recommendations) {
      return menus;
    }

    // 오늘의 메뉴 3개를 추가
    const dailyMenus = dailyRecommendations.recommendations.map((rec) => ({
      menu_name: rec.menu_name || rec.display_name,
      type: '오늘의 메뉴',
      reason: `오늘의 추천 메뉴입니다`,
      restaurant_name: rec.restaurant_name,
      distance: rec.distance,
      minutes_away: rec.minutes_away,
      price_range: rec.price_range,
    }));

    return [...menus, ...dailyMenus];
  };

  const rouletteMenus = getRouletteMenus();

  const spin = () => {
    if (isSpinning) return;
  
    setIsSpinning(true);
    setResult(null);
  
    const selectedIndex = Math.floor(Math.random() * rouletteMenus.length);
    const selectedMenu = rouletteMenus[selectedIndex];
  
    const degreePerItem = 360 / rouletteMenus.length;
    const spinRotations = 360 * 5; // 5바퀴
    
    // 현재 회전값을 0-360 범위로 정규화
    const currentNormalizedRotation = rotation % 360;
    
    // 선택된 아이템이 위(화살표)에 오도록 하는 각도
    const targetAngle = selectedIndex * degreePerItem + degreePerItem / 2;
    
    // 목표 위치까지의 회전값 계산
    const angleToTarget = (360 - targetAngle + 360 - currentNormalizedRotation) % 360;
    const targetRotation = spinRotations + angleToTarget;
  
    setRotation((prev) => prev + targetRotation);
  
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedMenu);
    }, 4000);
  };

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  // 결과 이미지로 저장하기
  const saveAsImage = async () => {
    if (!resultRef.current) {
      alert('저장할 내용이 없습니다.');
      return;
    }

    try {
      const target = resultRef.current;

      // 원래 스타일 백업
      const originalBg = target.style.backgroundColor;
      const originalBackdrop = target.style.backdropFilter;
      const originalOverflow = target.style.overflow;

      // 캡처용 스타일
      target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      target.style.backdropFilter = 'none';
      target.style.overflow = 'visible'; // ★ 안 열어두면 1~2px 잘림

      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // glass → 평평한 배경
          const glassElements = clonedDoc.querySelectorAll('.glass');
          glassElements.forEach((el) => {
            el.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            el.style.backdropFilter = 'none';
          });

          // 전체 결과 박스에 여유
          const root = clonedDoc.getElementById('roulette-result-root');
          if (root) {
            root.style.paddingBottom = '18px'; // ★ 아래쪽 여유
            root.style.overflow = 'visible';
            root.style.lineHeight = '1.35';
          }

          // ★ 문제되던 "📍 ... " 줄
          const place = clonedDoc.querySelector('.result-place-pill');
          if (place) {
            place.style.display = 'inline-flex';
            place.style.alignItems = 'center';
            place.style.gap = '6px';
            place.style.minHeight = '38px'; // ★ 이거 없으면 짤림
            place.style.lineHeight = '1.25';
            place.style.padding = '6px 16px';
            place.style.overflow = 'visible';
            place.style.borderRadius = '9999px';
          }

          // 칩들도 혹시 몰라서 키워줌
          const chips = clonedDoc.querySelectorAll('.result-chip');
          chips.forEach((el) => {
            el.style.display = 'inline-flex';
            el.style.alignItems = 'center';
            el.style.minHeight = '36px';
            el.style.lineHeight = '1.25';
            el.style.overflow = 'visible';
          });

          // 네 util
          fixOklchColors(clonedDoc);
        },
      });

      // 원래 스타일 복원
      target.style.backgroundColor = originalBg;
      target.style.backdropFilter = originalBackdrop;
      target.style.overflow = originalOverflow;

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `룰렛결과_${(result?.menu_name || '메뉴').replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}.png`;
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('이미지 저장 실패:', error);
      alert(`이미지 저장에 실패했습니다: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 lg:max-w-4xl">
            {/* 상단: 뒤로가기 버튼 + 날씨 정보 */}
            <div className="w-full pt-3 sm:pt-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                {/* 좌측: 뒤로가기 버튼 */}
                <button
                  onClick={onBack}
                  className="glass rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/90 text-sm sm:text-base flex-shrink-0"
                >
                  ← 뒤로
                </button>

                {/* 우측: 날씨 + 주소 박스 */}
                {weather && (
                  <div className="glass rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 flex-shrink min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-yellow-300/80 flex items-center justify-center flex-shrink-0">
                        <span className="text-base sm:text-xl">
                          {weather.sky_condition === '맑음'
                            ? '☀️'
                            : weather.sky_condition === '구름많음'
                            ? '⛅'
                            : weather.sky_condition === '흐림'
                            ? '☁️'
                            : weather.sky_condition === '비'
                            ? '🌧️'
                            : weather.sky_condition === '눈'
                            ? '❄️'
                            : '🌤️'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-[13px] text-slate-500">현재 위치</div>
                        <div className="font-semibold text-xs sm:text-sm truncate">
                          {location || weather.location || '서울시'}
                        </div>
                      </div>
                      <div className="chip rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 flex-shrink-0">
                        {weather.temperature}°C
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 헤더 박스 */}
            <div className="w-full pb-4">
              <div className="glass rounded-xl shadow-lg p-4 sm:p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src="/images/emoge/lulet.png" alt="roulette" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">
                    룰렛
                  </h1>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base">
                  운명에 맡겨보세요!
                </p>
              </div>
            </div>

            {/* 룰렛 컨테이너 */}
            <div className="glass rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-4">
              <div className="relative flex items-center justify-center min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px]">
                {/* 화살표 포인터 */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 sm:-translate-y-4 z-10">
                  <div className="w-0 h-0 border-l-[18px] sm:border-l-[22px] md:border-l-[25px] border-r-[18px] sm:border-r-[22px] md:border-r-[25px] border-t-[36px] sm:border-t-[44px] md:border-t-[50px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
                </div>

                {/* 룰렛 휠 */}
                <div className="relative w-full max-w-[280px] sm:max-w-[360px] md:max-w-[440px] lg:max-w-[500px] aspect-square mx-auto">
                  <div
                    className="absolute inset-0 rounded-full shadow-2xl transition-transform duration-[4000ms] ease-out overflow-hidden"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    {rouletteMenus.map((menu, index) => {
                      const degreePerItem = 360 / rouletteMenus.length;
                      const startAngle = index * degreePerItem;
                      const color = colors[index % colors.length];

                      const points = ['50% 50%'];
                      const segments = 20;
                      for (let i = 0; i <= segments; i++) {
                        const angle = startAngle + (degreePerItem * i) / segments - 90;
                        const x = 50 + 50 * Math.cos((angle * Math.PI) / 180);
                        const y = 50 + 50 * Math.sin((angle * Math.PI) / 180);
                        points.push(`${x}% ${y}%`);
                      }

                      const textAngle = startAngle + degreePerItem / 2;
                      const textRadius = 35;
                      const textX = 50 + textRadius * Math.cos(((textAngle - 90) * Math.PI) / 180);
                      const textY = 50 + textRadius * Math.sin(((textAngle - 90) * Math.PI) / 180);

                      return (
                        <div
                          key={index}
                          className={`absolute w-full h-full ${color}`}
                          style={{
                            clipPath: `polygon(${points.join(', ')})`,
                          }}
                        >
                          <div
                            className="absolute text-white font-bold text-[10px] sm:text-xs md:text-sm lg:text-base drop-shadow-lg whitespace-nowrap"
                            style={{
                              left: `${textX}%`,
                              top: `${textY}%`,
                              transform: `translate(-50%, -50%) rotate(${textAngle}deg)`,
                              transformOrigin: 'center',
                            }}
                          >
                            {menu.menu_name || menu.display_name || menu.menu}
                          </div>
                        </div>
                      );
                    })}

                    {/* 중앙 원 */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 lg:w-24 lg:h-24 bg-white rounded-full shadow-lg border-[3px] sm:border-4 md:border-[5px] border-gray-300 flex items-center justify-center">
                      <img src="/images/emoge/lulet.png" alt="roulette" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 또는 결과 */}
            {!result ? (
              <div className="flex justify-center mb-4">
                <button
                  onClick={spin}
                  disabled={isSpinning}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 sm:py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSpinning ? (
                    <>
                      <svg className="spinner h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" opacity=".2"></circle>
                        <path d="M12 2a10 10 0 0 1 10 10"></path>
                      </svg>
                      돌리는 중...
                    </>
                  ) : (
                    <>
                      <img src="/images/emoge/lulet.png" alt="roulette" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                      룰렛 돌리기
                    </>
                  )}
                </button>
              </div>
            ) : (
              // ★ 이게 실제 캡처되는 영역
              <div
                id="roulette-result-root"
                ref={resultRef}
                className="glass rounded-xl shadow-lg p-4 sm:p-6 mb-4 overflow-visible"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 sm:mb-3">
                    {result.menu_name || result.display_name || result.menu}
                  </h2>
                  {result.restaurant_name && (
                    <p className="text-sm sm:text-base text-slate-600 mb-2 truncate px-2">{result.restaurant_name}</p>
                  )}
                  <div className="flex gap-2 justify-center mb-3 sm:mb-4 flex-wrap">
                    {(result.minutes_away || result.distance?.walking_min) && (
                      <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded">
                        {result.minutes_away || result.distance.walking_min}분
                      </span>
                    )}
                    {result.price_range && (
                      <span className="text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 rounded">
                        {result.price_range}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                    {result.reason}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 sm:mt-6">
                    <button
                      onClick={saveAsImage}
                      className="glass rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold hover:bg-white/90 w-full sm:w-auto bg-green-50 hover:bg-green-100"
                    >
                      이미지로 저장
                    </button>
                    <button
                      onClick={spin}
                      className="glass rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold hover:bg-white/90 w-full sm:w-auto"
                    >
                      다시 돌리기
                    </button>
                    <button
                      onClick={() => onResult(result.menu_name || result.menu)}
                      className="btn-primary rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold w-full sm:w-auto"
                    >
                      이 메뉴로 결정
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouletteGame;
