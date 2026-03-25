/**
 * User Domain
 * Representa usuários do sistema (passageiro ou motorista)
 */

export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Passenger extends User {
  role: UserRole.PASSENGER;
  paymentMethod?: string;
  rating?: number;
}

export interface Driver extends User {
  role: UserRole.DRIVER;
  documentId: string;
  vehicleId?: string;
  rating?: number;
  totalRides?: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  documentId?: string; // Para motoristas
  password?: string;
  passwordHash?: string;
}
