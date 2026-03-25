/**
 * Haversine Distance Calculator
 * Calcula distância entre dois pontos no globo
 */

export class DistanceCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;

  static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c;

    return Math.round(distance * 1000) / 1000; // 3 casas decimais
  }

  static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.calculateDistanceKm(lat1, lon1, lat2, lon2) * 1000;
  }

  static estimateETA(distanceKm: number, averageSpeedKmh: number = 30): number {
    // Retorna ETA em segundos
    const hours = distanceKm / averageSpeedKmh;
    return Math.round(hours * 3600);
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
