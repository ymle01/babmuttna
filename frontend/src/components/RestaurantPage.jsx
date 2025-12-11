import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { fixOklchColors } from '../utils/html2canvasSafeColors';

const RestaurantPage = ({ menuName, weather, location, userCoords, onBack }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' or 'review'
  const [mapInstance, setMapInstance] = useState(null);
  const [markers, setMarkers] = useState([]); // 마커와 InfoWindow를 저장
  const restaurantInfoRef = useRef(null); // 음식점 정보 캡처용 ref

  // menuName이 객체인 경우 문자열로 변환
  const getMenuNameString = () => {
    if (typeof menuName === 'string') {
      return menuName;
    }
    if (menuName && typeof menuName === 'object') {
      return menuName.menu_name || menuName.menu || menuName.display_name || '';
    }
    return '';
  };

  const menuNameStr = getMenuNameString();

  useEffect(() => {
    // 카카오맵 API 스크립트 로드
    const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_JS_KEY;


    if (!KAKAO_API_KEY) {
      console.error("❌ VITE_KAKAO_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.");
    }
    console.log('🗺️ 카카오맵 API 키:', KAKAO_API_KEY);
    
    // 이미 로드된 스크립트가 있으면 제거
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ 카카오맵 스크립트 로드 성공');
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log('✅ 카카오맵 초기화 성공');
          setIsMapLoaded(true);
          // initMap()은 별도 useEffect에서 실행
        });
      } else {
        console.error('❌ window.kakao.maps가 없습니다');
        setError('카카오맵 API를 초기화할 수 없습니다.');
      }
    };

    script.onerror = (e) => {
      console.error('❌ 카카오맵 스크립트 로드 실패:', e);
      setError('카카오맵을 불러올 수 없습니다. API 키를 확인해주세요.');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [menuName, location]);

  // isMapLoaded가 true가 되거나 menuNameStr이 변경되면 지도 초기화
  useEffect(() => {
    if (isMapLoaded && menuNameStr) {
      console.log('🗺️ DOM 렌더링 대기 중...', 'menuNameStr:', menuNameStr);
      // DOM이 렌더링될 시간을 주기 위해 setTimeout 사용
      const timer = setTimeout(() => {
        initMap();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, menuNameStr]);

  const initMap = () => {
    console.log('🗺️ initMap 실행, 검색어:', menuNameStr);
    const container = document.getElementById('map');
    if (!container) {
      console.error('❌ map 컨테이너를 찾을 수 없습니다');
      return;
    }

    try {
      // 기본 좌표 (서울) 또는 고정 좌표
      const fallback = { lat: 37.5665, lng: 126.9780 };
      const base = (userCoords && userCoords.latitude && userCoords.longitude)
        ? { lat: userCoords.latitude, lng: userCoords.longitude }
        : fallback;

      // 기존 지도가 있으면 재사용, 없으면 새로 생성
      let map = mapInstance;
      if (!map) {
        map = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(base.lat, base.lng),
          level: 4
        });
        console.log('✅ 지도 생성 성공');
        setMapInstance(map);

        // 선택한 위치(고정) 마커 (최초 생성 시에만)
        const startPos = new window.kakao.maps.LatLng(base.lat, base.lng);
        const startMarker = new window.kakao.maps.Marker({ position: startPos, map });
        const startInfo = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:5px;font-size:12px;color:#1F2937;">선택한 위치</div>'
        });
        startInfo.open(map, startMarker);
      } else {
        // 기존 지도가 있으면 중심만 재설정
        console.log('✅ 기존 지도 재사용');
        map.setCenter(new window.kakao.maps.LatLng(base.lat, base.lng));
        map.setLevel(4);
      }

      // 음식점 검색 (메뉴가 변경되면 항상 새로 검색)
      searchPlaces(map, base.lat, base.lng);
      
    } catch (error) {
      console.error('❌ 지도 초기화 중 오류:', error);
      setError('지도를 초기화하는 중 오류가 발생했습니다.');
    }
  };

  // 정렬된 음식점 리스트
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    if (sortBy === 'distance') {
      return a.distance - b.distance;
    } else {
      return b.rating - a.rating;
    }
  });

  // 음식점 클릭 시 지도 중심 이동 및 InfoWindow 열기
  const handleRestaurantClick = (restaurant, index) => {
    if (mapInstance) {
      const position = new window.kakao.maps.LatLng(restaurant.y, restaurant.x);
      mapInstance.setCenter(position);
      mapInstance.setLevel(3);
      
      // 해당 마커의 InfoWindow 열기
      const markerData = markers.find(m => m.placeId === restaurant.id);
      if (markerData) {
        // 다른 모든 InfoWindow 닫기
        markers.forEach(m => {
          if (m.infowindow && m.isOpen) {
            m.infowindow.close();
            m.isOpen = false;
          }
        });
        
        // 선택한 InfoWindow 열기
        if (!markerData.isOpen) {
          markerData.infowindow.open(mapInstance, markerData.marker);
          markerData.isOpen = true;
        }
      }
    }
  };

  const searchPlaces = (map, lat, lng) => {
    // 장소 검색 객체 생성
    const ps = new window.kakao.maps.services.Places();
    
    // 현재 위치 기준으로 반경 내 검색
    const searchOption = {
      location: new window.kakao.maps.LatLng(lat, lng),
      radius: 2000, // 2km 반경
      size: 10 // 최대 10개
    };

    // 🆕 메뉴명에서 핵심 키워드만 추출하는 함수 (안전망)
    const extractCoreKeyword = (name) => {
      // 제거할 수식어 목록
      const modifiers = [
        '따뜻한', '시원한', '차가운', '뜨거운', '얼큰한', '매운', '순한',
        '고급', '프리미엄', '특별한', '신선한', '건강한', '든든한',
        '간편한', '가벼운', '푸짐한', '깔끔한', '부드러운', '바삭한',
        '달콤한', '새콤한', '고소한', '진한', '담백한',
        '정통', '전통', '수제', '직화', '숯불', '수타'
      ];
      
      let keyword = name.trim();
      
      // 앞의 수식어 제거
      modifiers.forEach(modifier => {
        keyword = keyword.replace(new RegExp(`^${modifier}\\s*`, 'g'), '');
      });
      
      // 뒤의 수식어 제거 ("생선구이 정식" -> "생선구이")
      keyword = keyword.replace(/\s*(정식|세트|코스|요리|전문점|맛집|식당)$/g, '');
      
      return keyword.trim() || name; // 빈 문자열이면 원본 반환
    };

    // 검색어 정제
    const searchKeyword = extractCoreKeyword(menuNameStr);
    console.log('🔍 원본 메뉴명:', menuNameStr);
    if (searchKeyword !== menuNameStr) {
      console.log('🔍 정제된 검색어:', searchKeyword);
    }
    
    // 거리 계산 함수 (Haversine formula)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // 지구 반지름 (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // km
    };

    // 키워드로 장소 검색
    console.log('🔍 장소 검색 시작:', searchKeyword, `(반경 2km)`);
    ps.keywordSearch(searchKeyword, (data, status) => {
      console.log('🔍 검색 결과 상태:', status);
      console.log('🔍 검색 결과 데이터:', data);
      
      if (status === window.kakao.maps.services.Status.OK) {
        console.log(`✅ ${data.length}개의 장소를 찾았습니다`);
        
        // 검색 결과에 거리 정보 추가
        const restaurantsWithDistance = data.map(place => ({
          ...place,
          distance: calculateDistance(lat, lng, parseFloat(place.y), parseFloat(place.x)),
          rating: Math.random() * 2 + 3 // 임시 평점 (3.0~5.0)
        }));
        
        setRestaurants(restaurantsWithDistance);
        
        // 검색 결과를 지도에 표시
        const newMarkers = restaurantsWithDistance.map((place, index) => {
          const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
          
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            map: map
          });

          // 인포윈도우 생성
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px;font-size:12px;">
              <strong>${index + 1}. ${place.place_name}</strong><br/>
              <span style="font-size:11px;color:#666;">${place.road_address_name || place.address_name}</span><br/>
              <span style="font-size:11px;color:#FF6B35;">📞 ${place.phone || '전화번호 없음'}</span>
            </div>`
          });

          // 마커 데이터 객체 생성
          const markerData = {
            marker: marker,
            infowindow: infowindow,
            isOpen: false,
            placeId: place.id
          };

          window.kakao.maps.event.addListener(marker, 'click', () => {
            if (markerData.isOpen) {
              // 이미 열려있으면 닫기
              infowindow.close();
              markerData.isOpen = false;
            } else {
              // 닫혀있으면 열기
              infowindow.open(map, marker);
              markerData.isOpen = true;
            }
          });
          
          // 첫 번째 마커는 기본으로 정보창 표시
          if (index === 0) {
            infowindow.open(map, marker);
            markerData.isOpen = true;
          }

          return markerData;
        });

        // 마커 배열 저장
        setMarkers(newMarkers);

        // 검색 결과가 있으면 첫 번째 결과 주변으로 지도 범위 조정
        if (data.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();
          
          // 현재 위치 포함
          bounds.extend(new window.kakao.maps.LatLng(lat, lng));
          
          // 검색 결과들 포함
          data.forEach(place => {
            bounds.extend(new window.kakao.maps.LatLng(place.y, place.x));
          });
          
          map.setBounds(bounds);
          console.log('✅ 지도 범위 조정 완료');
        }
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        console.warn('⚠️ 검색 결과가 없습니다');
        alert(`주변 2km 내에 "${menuName}" 음식점을 찾을 수 없습니다.\n검색 범위를 확대해보세요.`);
      } else if (status === window.kakao.maps.services.Status.ERROR) {
        console.error('❌ 검색 중 오류 발생');
      }
    }, searchOption);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1">
            {/* 상단: 뒤로가기 버튼 + 날씨 정보 */}
            <div className="w-full pt-3 sm:pt-4 pb-2">
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
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-500">
                            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
                          </svg>
                          <span className="text-[11px] sm:text-[13px] text-slate-500">현재 위치</span>
                        </div>
                        <div className="font-semibold text-xs sm:text-sm truncate">{location || weather.location}</div>
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
              <div className="glass rounded-xl shadow-lg p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6">
                          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
                        </svg>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                        {menuNameStr} 맛집 찾기
                      </h1>
                    </div>
                    <p className="text-slate-600 text-sm sm:text-base">
                      주변 2km 반경 내 음식점 {restaurants.length}곳
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 지도 + 음식점 리스트 통합 박스 */}
            <div ref={restaurantInfoRef} className="glass rounded-xl shadow-lg overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* 지도 (60%) */}
                <div className="w-full lg:w-[60%] border-r border-slate-200/50 p-3">
                  {error ? (
                    <div className="h-64 sm:h-80 md:h-96 lg:h-[550px] flex items-center justify-center bg-slate-100 rounded-lg">
                      <div className="text-center p-4">
                        <p className="text-red-600 font-semibold">{error}</p>
                        <p className="text-sm text-slate-600 mt-2">카카오맵 API 키를 확인해주세요</p>
                      </div>
                    </div>
                  ) : !isMapLoaded ? (
                    <div className="h-64 sm:h-80 md:h-96 lg:h-[550px] flex items-center justify-center bg-slate-100 rounded-lg">
                      <div className="text-center">
                        <div className="loading loading-spinner loading-lg text-primary"></div>
                        <p className="mt-4 text-sm">지도를 불러오는 중...</p>
                      </div>
                    </div>
                  ) : (
                    <div id="map" className="w-full h-64 sm:h-80 md:h-96 lg:h-[550px] border border-slate-300/50 rounded-lg"></div>
                  )}
                </div>

                {/* 음식점 리스트 (40%) */}
                <div className="w-full lg:w-[40%] border-t lg:border-t-0 lg:border-l border-slate-200/50">
                  <div className="p-4">
                    {/* 정렬 버튼 */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setSortBy('distance')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sortBy === 'distance' 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      >
                        거리순
                      </button>
                      <button
                        onClick={() => setSortBy('review')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sortBy === 'review' 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      >
                        ⭐ 평점순
                      </button>
                    </div>

                    {/* 음식점 리스트 */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {sortedRestaurants.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">검색 결과가 없습니다</p>
                        </div>
                      ) : (
                        sortedRestaurants.map((restaurant, index) => (
                          <div
                            key={index}
                            onClick={() => handleRestaurantClick(restaurant, index)}
                            className="bg-white/50 rounded-lg p-3 cursor-pointer hover:bg-white/80 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-sm text-slate-800 flex-1">
                                {index + 1}. {restaurant.place_name}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-yellow-500 text-sm">⭐</span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {restaurant.rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-2 line-clamp-1">
                              {restaurant.road_address_name || restaurant.address_name}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-indigo-600 font-medium">
                                {restaurant.distance.toFixed(2)}km
                              </span>
                              {restaurant.phone && (
                                <span className="text-xs text-slate-600">
                                  {restaurant.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="p-4 bg-white/30 border-t border-slate-200/50">
                <div className="flex items-start gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5 text-blue-500 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-xs sm:text-sm text-slate-700">
                    <strong>현재 위치 기반:</strong> 주변 2km 반경 내 음식점을 표시합니다.
                  </span>
                </div>
                
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm text-slate-700">
                    <strong>Tip:</strong> 음식점을 클릭하면 지도에서 위치를 확인할 수 있습니다.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPage;
