/**
 * Location Domain
 * Representa coordenadas geográficas e localização
 */

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number; // em metros
  bearing?: number; // direção em graus
  speed?: number; // velocidade em m/s
}

export interface Address {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface Place {
  id: string;
  address: Address;
  location: Location;
  placeType: 'pickup' | 'dropoff' | 'intermediate';
}

export interface UpdateLocationDTO {
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number;
  speed?: number;
}
