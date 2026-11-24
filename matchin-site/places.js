// 실제 장소 검색 (카카오 로컬). 키가 없으면 null을 돌려주고, 앱은 기본 매장 목록으로 대신 찾아요.
import { kakaoJsKey } from './firebase-config.js';

let loading = null;
export const placesReady = () => !!kakaoJsKey;

function loadKakao(){
  if (!kakaoJsKey) return Promise.reject(new Error('no-key'));
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoJsKey)}&libraries=services&autoload=false`;
    s.onload = () => window.kakao.maps.load(res);
    s.onerror = () => { loading = null; rej(new Error('kakao-load')); };
    document.head.appendChild(s);
  });
  return loading;
}

const CAT_RULES = [['곱창', /곱창|막창|대창|양곱/], ['회', /회|해산물|일식|초밥|수산/], ['고기', /육류|고기|삼겹|갈비|돼지|소고기|족발|보쌈/], ['국밥', /국밥|해장|순대|감자탕|곰탕|설렁탕|국수|칼국수|냉면/], ['중식', /중식|중국|마라|양꼬치/], ['분식', /분식|떡볶이|김밥|패스트푸드|햄버거|피자|치킨/]];
export function catFrom(cname, group){
  if (group === 'CE7' || /카페|디저트|베이커리|제과/.test(cname || '')) return '카페';
  const hit = CAT_RULES.find(([, re]) => re.test(cname || ''));
  return hit ? hit[0] : '한식';
}

// 흑석역 기준으로 가까운 순 + 정확도. 음식점(FD6)·카페(CE7) 우선.
const CENTER = { lat: 37.5088, lng: 126.9637 };
export async function searchPlaces(q){
  await loadKakao();
  const k = window.kakao.maps;
  const ps = new k.services.Places();
  const list = await new Promise(res => ps.keywordSearch(q, (data, status) => res(status === k.services.Status.OK ? data : [] ), { location: new k.LatLng(CENTER.lat, CENTER.lng), sort: k.services.SortBy.ACCURACY, size: 15 }));
  const food = list.filter(p => p.category_group_code === 'FD6' || p.category_group_code === 'CE7');
  return (food.length ? food : list).map(p => ({
    id: 'k' + p.id,
    name: p.place_name,
    cat: catFrom(p.category_name, p.category_group_code),
    cname: (p.category_name || '').split('>').slice(-1)[0].trim(),
    addr: p.road_address_name || p.address_name || '',
    area: (p.road_address_name || p.address_name || '').split(' ').slice(1, 3).join(' '),
    lat: +p.y, lng: +p.x,
    url: p.place_url || '',
    phone: p.phone || ''
  }));
}
