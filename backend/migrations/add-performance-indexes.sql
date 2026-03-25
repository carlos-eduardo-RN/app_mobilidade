-- Índices para otimização de queries frequentes

-- ========================================
-- USERS
-- ========================================

-- Índice para busca por email (login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) 
WHERE status = 'active';

-- Índice para busca por telefone (OTP login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_active 
ON users(phone) 
WHERE status = 'active';

-- Índice composto para tipo de usuário e status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_type_status 
ON users(user_type, status);

-- Índice para verificação de email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users(email_verified) 
WHERE email_verified = false;

-- ========================================
-- DRIVERS
-- ========================================

-- Índice GiST para busca geográfica de motoristas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_location_gist 
ON drivers USING GIST(current_location);

-- Índice para motoristas online e disponíveis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_online_available 
ON drivers(is_online, status, rating DESC) 
WHERE is_online = true AND status = 'approved';

-- Índice para busca por CNH
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_license 
ON drivers(license_number);

-- Índice para total de corridas (ranking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_total_rides 
ON drivers(total_rides DESC) 
WHERE status = 'approved';

-- Índice para avaliação (ranking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_rating 
ON drivers(rating DESC NULLS LAST) 
WHERE status = 'approved';

-- ========================================
-- RIDES
-- ========================================

-- Índice para corridas do passageiro (histórico)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_passenger_created 
ON rides(passenger_id, created_at DESC);

-- Índice para corridas do motorista (histórico)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_created 
ON rides(driver_id, created_at DESC) 
WHERE driver_id IS NOT NULL;

-- Índice para corridas ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_active 
ON rides(status, created_at DESC) 
WHERE status IN ('pending', 'accepted', 'in_progress');

-- Índice para corridas por status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_status_created 
ON rides(status, created_at DESC);

-- Índice GiST para busca geográfica de corridas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_pickup_location 
ON rides USING GIST(pickup_location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_dropoff_location 
ON rides USING GIST(dropoff_location);

-- Índice para análise de corridas por dia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_completed_date 
ON rides(DATE(completed_at)) 
WHERE status = 'completed';

-- Índice composto para dashboard do motorista
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_status_created 
ON rides(driver_id, status, created_at DESC);

-- ========================================
-- RATINGS
-- ========================================

-- Índice para avaliações de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_to_user 
ON ratings(to_user_id, created_at DESC);

-- Índice para avaliações por corrida
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_ride 
ON ratings(ride_id);

-- Índice para avaliações de um usuário sobre outros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_from_user 
ON ratings(from_user_id, created_at DESC);

-- Índice para cálculo de média de avaliações
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_to_user_rating 
ON ratings(to_user_id, rating);

-- ========================================
-- PAYMENTS
-- ========================================

-- Índice para pagamentos de uma corrida
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_ride 
ON payments(ride_id);

-- Índice para pagamentos de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_created 
ON payments(user_id, created_at DESC);

-- Índice para pagamentos por status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_created 
ON payments(status, created_at DESC);

-- Índice para pagamentos pendentes (processamento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_pending 
ON payments(created_at) 
WHERE status IN ('pending', 'processing');

-- Índice para análise financeira por dia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_completed_date 
ON payments(DATE(created_at), amount) 
WHERE status = 'completed';

-- Índice para Stripe payment intents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_intent 
ON payments(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- ========================================
-- NOTIFICATIONS
-- ========================================

-- Índice para notificações não lidas de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- Índice para notificações de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- Índice para notificações por tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type 
ON notifications(type, created_at DESC);

-- ========================================
-- ANALYTICS.METRICS
-- ========================================

-- Índice para métricas por nome e timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_name_timestamp 
ON analytics.metrics(metric_name, timestamp DESC);

-- Índice para métricas por tipo e timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_type_timestamp 
ON analytics.metrics(metric_type, timestamp DESC);

-- Índice para agregação de métricas por hora
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_hour 
ON analytics.metrics(metric_name, DATE_TRUNC('hour', timestamp));

-- Índice para agregação de métricas por dia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_day 
ON analytics.metrics(metric_name, DATE_TRUNC('day', timestamp));

-- ========================================
-- AUDIT.LOGS
-- ========================================

-- Índice para logs de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user 
ON audit.logs(user_id, created_at DESC);

-- Índice para logs por ação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
ON audit.logs(action, created_at DESC);

-- Índice para logs por recurso
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource 
ON audit.logs(resource_type, resource_id, created_at DESC);

-- Índice para logs por IP (segurança)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_ip 
ON audit.logs(ip_address, created_at DESC);

-- ========================================
-- ESTATÍSTICAS DOS ÍNDICES
-- ========================================

-- Análise de estatísticas para o query planner
ANALYZE users;
ANALYZE drivers;
ANALYZE rides;
ANALYZE ratings;
ANALYZE payments;
ANALYZE notifications;
ANALYZE analytics.metrics;
ANALYZE audit.logs;

-- ========================================
-- VACUUM E MANUTENÇÃO
-- ========================================

-- Vacuum para recuperar espaço
VACUUM ANALYZE users;
VACUUM ANALYZE drivers;
VACUUM ANALYZE rides;
VACUUM ANALYZE ratings;
VACUUM ANALYZE payments;
VACUUM ANALYZE notifications;
VACUUM ANALYZE analytics.metrics;
VACUUM ANALYZE audit.logs;

-- ========================================
-- COMENTÁRIOS
-- ========================================

COMMENT ON INDEX idx_drivers_location_gist IS 'Índice GiST para busca geográfica eficiente de motoristas';
COMMENT ON INDEX idx_drivers_online_available IS 'Índice para busca rápida de motoristas disponíveis';
COMMENT ON INDEX idx_rides_passenger_created IS 'Índice para histórico de corridas do passageiro';
COMMENT ON INDEX idx_rides_active IS 'Índice parcial para corridas ativas (otimiza dashboard)';
COMMENT ON INDEX idx_payments_pending IS 'Índice parcial para pagamentos pendentes de processamento';
