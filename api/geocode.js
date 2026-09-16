/**
 * Lines in Transit Studio - Reverse Geocoding Serverless Proxy
 * Securely transforms GPS coordinates (lat, lon) into clean editorial location strings.
 * Primary: OpenStreetMap Nominatim with compliant User-Agent & in-memory caching
 * Optional: Kakao Maps coord2regioncode if KAKAO_REST_API_KEY environment variable is configured.
 */

// In-memory cache & rate limiter for serverless instance lifetime
const cache = new Map();
let lastNominatimRequestTime = 0;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { lat, lon, lang = 'ko,en' } = req.query;

  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
    return res.status(400).json({ success: false, error: '유효한 위도(-90~90) 및 경도(-180~180) 값을 입력해 주세요.' });
  }

  const cacheKey = `${parsedLat.toFixed(4)},${parsedLon.toFixed(4)},${lang}`;
  if (cache.has(cacheKey)) {
    return res.status(200).json({ ...cache.get(cacheKey), cached: true });
  }

  // 1. Optional Kakao Maps integration if server environment variable is present
  if (process.env.KAKAO_REST_API_KEY) {
    try {
      const kakaoUrl = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${parsedLon}&y=${parsedLat}`;
      const kakaoResp = await fetch(kakaoUrl, {
        headers: {
          'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
        }
      });
      if (kakaoResp.ok) {
        const data = await kakaoResp.json();
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents.find(d => d.region_type === 'H') || data.documents[0];
          const region1 = doc.region_1depth_name || '';
          const region2 = doc.region_2depth_name || '';
          const region3 = doc.region_3depth_name || '';

          const shortLabel = [region2, region3].filter(Boolean).join(' ') || region1;
          const fullLabel = [region1, region2, region3].filter(Boolean).join(' ');

          const result = {
            success: true,
            source: 'kakao',
            shortLabel,
            fullLabel,
            city: region1,
            district: region2,
            neighborhood: region3,
            country: '대한민국',
            attribution: '카카오맵'
          };

          cache.set(cacheKey, result);
          return res.status(200).json(result);
        }
      }
    } catch (err) {
      console.warn('Kakao geocoding error, falling back to Nominatim:', err);
    }
  }

  // 2. Default OpenStreetMap Nominatim Provider (Respect 1 request/sec rate limit)
  try {
    const now = Date.now();
    const elapsed = now - lastNominatimRequestTime;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
    lastNominatimRequestTime = Date.now();

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsedLat}&lon=${parsedLon}&accept-language=${encodeURIComponent(lang)}`;

    const nominatimResp = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'LinesInTransitStudio/1.0 (+https://github.com/Jeongmingz/lines-in-transit-studio)',
        'Referer': 'https://lines-in-transit-studio.vercel.app/'
      }
    });

    if (!nominatimResp.ok) {
      return res.status(nominatimResp.status).json({
        success: false,
        error: `주소 조회 서버 응답 오류 (${nominatimResp.status})`
      });
    }

    const data = await nominatimResp.json();
    const address = data.address || {};

    const city = address.city || address.town || address.village || address.municipality || address.county || '';
    const district = address.suburb || address.borough || address.quarter || address.city_district || address.neighbourhood || '';
    const state = address.state || address.province || '';
    const country = address.country || '';

    let shortLabel = '';
    if (city && district) {
      shortLabel = `${city} · ${district}`;
    } else if (city) {
      shortLabel = city;
    } else if (district) {
      shortLabel = district;
    } else if (state) {
      shortLabel = state;
    } else {
      shortLabel = country || '위치 미상';
    }

    const fullLabel = [country, state, city, district]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(' ');

    const result = {
      success: true,
      source: 'nominatim',
      shortLabel,
      fullLabel,
      city,
      district,
      state,
      country,
      attribution: 'Address data © OpenStreetMap contributors'
    };

    if (cache.size > 200) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(cacheKey, result);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `역지오코딩 처리 실패: ${err.message}`
    });
  }
}
