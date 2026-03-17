export interface DailyMetrics {
  bandeira: 'sumare' | 'anhanguera';
  total: string;
  novos: string;
  recadastro: string;
  dia_sp: string;
}

export interface ConsultantPerformance {
  consultor: string;
  status: 'GANHO' | 'PERDIDO';
  bandeira: 'sumare' | 'anhanguera';
  total: string;
}

export type ApiData = DailyMetrics | ConsultantPerformance;

export interface AggregatedConsultant {
  name: string;
  ganhos: number;
  perdidos: number;
  bandeira: 'sumare' | 'anhanguera';
}

export interface BrandMetrics {
  total: number;
  novos: number;
  recadastro: number;
  totalGanhos: number;
}

export function isDailyMetrics(data: ApiData): data is DailyMetrics {
  return 'dia_sp' in data && 'novos' in data;
}

export function isConsultantPerformance(data: ApiData): data is ConsultantPerformance {
  return 'consultor' in data && 'status' in data && !('novos' in data);
}
