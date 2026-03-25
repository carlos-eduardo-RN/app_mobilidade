/**
 * Pricing Domain
 * Cálculo de preços e tarifas
 */

export interface PricingConfig {
  basePrice: number; // R$ baseado na plataforma
  pricePerKm: number;
  pricePerMinute: number;
  minimumPrice: number;
  surgeFactor?: number; // 1.0 = sem surge, 1.5 = 50% mais caro
}

export interface PriceEstimate {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  surgePrice?: number;
  totalPrice: number;
  currency: string;
}

export interface CalculatePriceDTO {
  distanceMeters: number;
  estimatedDurationSeconds: number;
  surgeFactor?: number;
}
