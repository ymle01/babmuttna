import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const weatherAPI = {
  getWeather: async (location, coords = null) => {
    let url = `/api/weather?location=${encodeURIComponent(location)}`;
    if (coords && coords.latitude && coords.longitude) {
      url += `&lat=${coords.latitude}&lng=${coords.longitude}`;
    }
    const response = await api.get(url);
    return response.data;
  },
};

export const cafeteriaAPI = {
  getRecommendation: async (location, cafeteriaMenu, userLocation = null, preferExternal = true, dailyMenus = null, imageData = null) => {
    const payload = {
      location,
      user_location: userLocation,
      prefer_external: preferExternal,  // CAM 모드 활성화
      daily_menus: dailyMenus  // 오늘의 메뉴 전달
    };
    
    // 이미지 또는 텍스트
    if (imageData) {
      payload.image_data = imageData;
      payload.cafeteria_menu = cafeteriaMenu;  // fallback 텍스트
    } else {
      payload.cafeteria_menu = cafeteriaMenu;
    }
    
    const response = await api.post('/api/recommend-from-cafeteria', payload);
    return response.data;
  },
};

export const dailyRecommendationsAPI = {
  getDailyRecommendations: async (location, coords = null) => {
    let url = `/api/daily-recommendations?location=${encodeURIComponent(location)}`;
    if (coords && coords.latitude && coords.longitude) {
      url += `&lat=${coords.latitude}&lng=${coords.longitude}`;
    }
    const response = await api.get(url);
    return response.data;
  },
  refreshDailyRecommendations: async (location, cafeteriaMenu, userLocation = null) => {
    const response = await api.post('/api/daily-recommendations-refresh', {
      location,
      cafeteria_menu: cafeteriaMenu,
      user_location: userLocation
    });
    return response.data;
  },
};

export default api;

