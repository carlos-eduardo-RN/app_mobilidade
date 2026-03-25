/**
 * Timeout Models Domain
 * Interfaces e enums para gerenciamento de timeouts
 */

/**
 * Tipos de timeout suportados no sistema
 */
export enum TimeoutType {
  /** Timeout para aceitação do driver (30s) */
  DRIVER_ACCEPT = 'DRIVER_ACCEPT',
  
  /** Timeout para conclusão do matching (60s) */
  MATCHING = 'MATCHING',
  
  /** Timeout por inatividade de ride (5 minutos) */
  RIDE_INACTIVITY = 'RIDE_INACTIVITY',
}

/**
 * Status de um timeout
 */
export enum TimeoutStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

/**
 * Configuração de timeout
 */
export interface TimeoutConfig {
  /** ID único do timeout */
  timeoutId: string;
  
  /** Tipo de timeout */
  type: TimeoutType;
  
  /** ID do ride associado */
  rideId: string;
  
  /** Duração inicial em ms */
  durationMs: number;
  
  /** Timestamp de quando foi criado */
  createdAt: Date;
  
  /** Extensões de tempo (em ms) */
  extensions: number[];
  
  /** Callback ao expirar */
  onExpire?: () => Promise<void>;
  
  /** Callback ao cancelar */
  onCancel?: () => Promise<void>;
}

/**
 * Estado de um timeout em progresso
 */
export interface TimeoutState {
  /** ID único do timeout */
  timeoutId: string;
  
  /** Tipo de timeout */
  type: TimeoutType;
  
  /** ID do ride */
  rideId: string;
  
  /** Status atual */
  status: TimeoutStatus;
  
  /** Tempo total alocado (ms) */
  totalAllocatedMs: number;
  
  /** Tempo usado até agora (ms) */
  timeUsedMs: number;
  
  /** Tempo restante (ms) */
  timeRemainingMs: number;
  
  /** Quando expirará */
  expiresAt: Date;
  
  /** Timestamp de criação */
  createdAt: Date;
  
  /** Timestamp de última atividade */
  lastActivityAt: Date;
  
  /** Tentativas de extensão realizadas */
  extensionAttempts: number;
  
  /** Motivo da expiração (se expir) */
  expireReason?: string;
}

/**
 * Resultado final de um timeout
 */
export interface TimeoutResult {
  /** ID do timeout */
  timeoutId: string;
  
  /** Tipo */
  type: TimeoutType;
  
  /** ID do ride */
  rideId: string;
  
  /** Se expirou ou foi cancelado */
  expired: boolean;
  
  /** Status final */
  finalStatus: TimeoutStatus;
  
  /** Tempo total utilizado (ms) */
  totalTimeUsedMs: number;
  
  /** Duração total alocada (ms) */
  totalAllocatedMs: number;
  
  /** Número de extensões */
  extensionCount: number;
  
  /** Motivo da conclusão */
  reason: string;
  
  /** Timestamp de conclusão */
  completedAt: Date;
}

/**
 * Parâmetros para extensão de timeout
 */
export interface TimeoutExtensionParams {
  /** ID do timeout */
  timeoutId: string;
  
  /** Tempo adicional em ms */
  additionalMs: number;
  
  /** Motivo da extensão */
  reason: string;
  
  /** Máximo de extensões permitidas */
  maxExtensions?: number;
}

/**
 * Resposta de operação de timeout
 */
export interface TimeoutOperationResult {
  success: boolean;
  timeoutId: string;
  state?: TimeoutState;
  error?: string;
}

/**
 * Listener para eventos de timeout
 */
export interface TimeoutEventListener {
  onStarted?: (timeout: TimeoutState) => Promise<void>;
  onExtended?: (timeout: TimeoutState, previousMs: number) => Promise<void>;
  onCancelled?: (timeoutId: string, reason: string) => Promise<void>;
  onExpired?: (timeout: TimeoutResult) => Promise<void>;
  onCompleted?: (timeout: TimeoutResult) => Promise<void>;
}

/**
 * Configuração padrão de timeouts por tipo
 */
export const DEFAULT_TIMEOUT_CONFIGS: Record<TimeoutType, number> = {
  [TimeoutType.DRIVER_ACCEPT]: 30_000,      // 30 segundos
  [TimeoutType.MATCHING]: 60_000,           // 60 segundos
  [TimeoutType.RIDE_INACTIVITY]: 300_000,   // 5 minutos
};

/**
 * Limite máximo de extensões por tipo
 */
export const MAX_EXTENSIONS: Record<TimeoutType, number> = {
  [TimeoutType.DRIVER_ACCEPT]: 2,      // Máx 2 extensões (60s total)
  [TimeoutType.MATCHING]: 3,           // Máx 3 extensões (180s total)
  [TimeoutType.RIDE_INACTIVITY]: 5,    // Máx 5 extensões (25min total)
};

/**
 * Duração de cada extensão por tipo
 */
export const EXTENSION_DURATION_MS: Record<TimeoutType, number> = {
  [TimeoutType.DRIVER_ACCEPT]: 15_000,     // +15 segundos
  [TimeoutType.MATCHING]: 30_000,          // +30 segundos
  [TimeoutType.RIDE_INACTIVITY]: 120_000,  // +2 minutos
};
