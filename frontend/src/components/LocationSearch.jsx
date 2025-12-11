import React, { useEffect, useRef, useState } from 'react';

export default function LocationSearch({ onResolved, queryPrefix = '' }) {
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const placesRef = useRef(null);
  const markersRef = useRef([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const waitKakao = () =>
      new Promise((resolve) => {
        const check = () => {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) resolve();
          else setTimeout(check, 50);
        };
        check();
      });

    (async () => {
      await waitKakao();
      const kakao = window.kakao;

      if (!mapElRef.current) return;
      const center = new kakao.maps.LatLng(37.5665, 126.9780);
      const map = new kakao.maps.Map(mapElRef.current, {
        center,
        level: 5,
      });
      mapRef.current = map;
      placesRef.current = new kakao.maps.services.Places();

      clearMarkers();
      setItems([]);
    })();
  }, []);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const searchKeyword = async (text) => {
    const kakao = window.kakao;
    if (!placesRef.current) return;
    const query = `${queryPrefix ? queryPrefix + ' ' : ''}${text}`.trim();
    if (!query) {
      setItems([]);
      clearMarkers();
      return;
    }

    setLoading(true);
    placesRef.current.keywordSearch(query, (data, status) => {
      setLoading(false);
      if (status !== kakao.maps.services.Status.OK) {
        setItems([]);
        clearMarkers();
        return;
      }

      clearMarkers();
      const bounds = new kakao.maps.LatLngBounds();
      const mapped = data.map((d) => {
        const lat = parseFloat(d.y);
        const lng = parseFloat(d.x);
        const pos = new kakao.maps.LatLng(lat, lng);
        bounds.extend(pos);

        const marker = new kakao.maps.Marker({ position: pos });
        marker.setMap(mapRef.current);
        markersRef.current.push(marker);

        kakao.maps.event.addListener(marker, 'click', () => {
          handlePick({
            id: d.id,
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat,
            lng,
          });
        });

        return {
          id: d.id,
          name: d.place_name,
          address: d.road_address_name || d.address_name,
          lat,
          lng,
        };
      });

      if (!bounds.isEmpty()) {
        mapRef.current.setBounds(bounds, 24, 24, 24, 24);
      }
      setItems(mapped);
    });
  };

  const handlePick = (place) => {
    onResolved?.(place);
  };

  useEffect(() => {
    const t = setTimeout(() => searchKeyword(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="시/구/동/건물명으로 검색 (예: 강남구 삼성역 그랑서울)"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {loading && <div className="mt-2 text-sm text-slate-500">검색중…</div>}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded h-72 overflow-auto bg-white">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500 p-3">검색 결과가 없습니다.</div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  onClick={() => handlePick(it)}
                >
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-slate-500">{it.address}</div>
                  <div className="text-[11px] text-slate-400">({it.lat.toFixed(5)}, {it.lng.toFixed(5)})</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div ref={mapElRef} className="border rounded h-72" />
      </div>
      <div className="text-[11px] text-slate-500 mt-2">
        지도 마커를 클릭해도 건물을 선택할 수 있습니다.
      </div>
    </div>
  );
}


