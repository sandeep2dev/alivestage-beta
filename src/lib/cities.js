import { apiFetch } from '@/lib/api';

export function formatCityLabel(city) {
  if (!city) return '';
  return city.state ? `${city.name}, ${city.state}` : city.name;
}

export function fetchCities() {
  return apiFetch('/api/cities');
}
