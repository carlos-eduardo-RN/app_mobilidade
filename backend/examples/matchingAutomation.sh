#!/bin/bash
# ETAPA 2 - Exemplos de API REST
# Testar Matching Automation via cURL

API_URL="http://localhost:3000/api"
PASSENGER_TOKEN="Bearer passenger-123:PASSENGER"
DRIVER_TOKEN="Bearer driver-456:DRIVER"

echo "=========================================="
echo "ETAPA 2 - Matching Automation Examples"
echo "=========================================="

# ==============================================
# EXEMPLO 1: Criar Passageiro
# ==============================================

echo -e "\n### EXEMPLO 1: Criar Passageiro ###\n"

PASSENGER_RESPONSE=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "role": "PASSENGER"
  }')

echo "Response:"
echo $PASSENGER_RESPONSE | jq .

PASSENGER_ID=$(echo $PASSENGER_RESPONSE | jq -r '.data.id')
echo "Passenger ID: $PASSENGER_ID"

# ==============================================
# EXEMPLO 2: Criar Motorista Online
# ==============================================

echo -e "\n### EXEMPLO 2: Criar Motorista ###\n"

DRIVER_RESPONSE=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria@example.com",
    "phone": "+5511988888888",
    "role": "DRIVER"
  }')

DRIVER_ID=$(echo $DRIVER_RESPONSE | jq -r '.data.id')
echo "Driver ID: $DRIVER_ID"

# Colocar motorista online
echo -e "\nColocando motorista online..."

curl -s -X POST "$API_URL/driver/status/online" \
  -H "Authorization: Bearer $DRIVER_ID:DRIVER" \
  -H "Content-Type: application/json" | jq .

# ==============================================
# EXEMPLO 3: Criar Corrida
# ==============================================

echo -e "\n### EXEMPLO 3: Criar Corrida ###\n"

RIDE_RESPONSE=$(curl -s -X POST "$API_URL/passenger/rides" \
  -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "dropoffLocation": {
      "latitude": -23.55,
      "longitude": -46.63
    }
  }')

echo "Response:"
echo $RIDE_RESPONSE | jq .

RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.data.id')
echo "Ride ID: $RIDE_ID"

# ==============================================
# EXEMPLO 4: Iniciar Matching Automático
# ==============================================

echo -e "\n### EXEMPLO 4: Iniciar Matching Automático ###\n"

curl -s -X POST "$API_URL/passenger/rides/$RIDE_ID/start-matching" \
  -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" \
  -H "Content-Type: application/json" | jq .

echo "⏳ Automação iniciada! Aguardando resultado..."
sleep 2

# ==============================================
# EXEMPLO 5: Obter Status da Corrida
# ==============================================

echo -e "\n### EXEMPLO 5: Obter Status da Corrida ###\n"

curl -s -X GET "$API_URL/passenger/rides/$RIDE_ID" \
  -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" | jq .

# ==============================================
# EXEMPLO 6: Admin - Ver Evento de Matching
# ==============================================

echo -e "\n### EXEMPLO 6: Admin - Ver Eventos ###\n"

curl -s -X GET "$API_URL/admin/events" \
  -H "Authorization: Bearer admin:ADMIN" | jq '.data[] | select(.eventType | contains("matching"))'

# ==============================================
# EXEMPLO 7: Motorista Rejeita Corrida (se atribuída)
# ==============================================

echo -e "\n### EXEMPLO 7: Motorista Rejeita Corrida ###\n"

# Verificar se motorista foi atribuído
RIDE_STATUS=$(curl -s -X GET "$API_URL/passenger/rides/$RIDE_ID" \
  -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" | jq -r '.data.status')

if [ "$RIDE_STATUS" = "DRIVER_ASSIGNED" ]; then
  echo "Motorista atribuído! Rejeitando corrida..."
  
  curl -s -X POST "$API_URL/driver/rides/$RIDE_ID/reject" \
    -H "Authorization: Bearer $DRIVER_ID:DRIVER" \
    -H "Content-Type: application/json" \
    -d '{ "reason": "Não estou indo nessa direção" }' | jq .
  
  echo "✓ Corrida rejeitada - reatribuição em andamento..."
else
  echo "Status atual: $RIDE_STATUS"
  echo "(Motorista ainda não foi atribuído)"
fi

# ==============================================
# EXEMPLO 8: Listar Corridas Ativas (Admin)
# ==============================================

echo -e "\n### EXEMPLO 8: Admin - Corridas Ativas ###\n"

curl -s -X GET "$API_URL/admin/rides" \
  -H "Authorization: Bearer admin:ADMIN" | jq '.data[] | {id, status, passengerId, driverId}'

# ==============================================
# EXEMPLO 9: Cancelar Corrida
# ==============================================

echo -e "\n### EXEMPLO 9: Cancelar Corrida ###\n"

curl -s -X POST "$API_URL/passenger/rides/$RIDE_ID/cancel" \
  -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Mudei de ideia" }' | jq .

# ==============================================
# EXEMPLO 10: Múltiplas Corridas Simultâneas
# ==============================================

echo -e "\n### EXEMPLO 10: Múltiplas Corridas Simultâneas ###\n"

echo "Criando 3 corridas simultâneas..."

for i in {1..3}; do
  echo -e "\nCorrida $i:"
  
  RIDE=$(curl -s -X POST "$API_URL/passenger/rides" \
    -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" \
    -H "Content-Type: application/json" \
    -d "{
      \"pickupLocation\": {
        \"latitude\": $(-23.5505 + 0.00$i),
        \"longitude\": -46.6333
      },
      \"dropoffLocation\": {
        \"latitude\": -23.55,
        \"longitude\": -46.63
      }
    }")
  
  RID=$(echo $RIDE | jq -r '.data.id')
  echo "  Ride ID: $RID"
  
  # Iniciar matching
  curl -s -X POST "$API_URL/passenger/rides/$RID/start-matching" \
    -H "Authorization: Bearer $PASSENGER_ID:PASSENGER" > /dev/null
  
  echo "  Matching iniciado"
done

echo -e "\n✓ Todas as corridas foram criadas com automação iniciada"

# ==============================================
# DEBUG ENDPOINTS (se implementados)
# ==============================================

echo -e "\n### ENDPOINTS DE DEBUG (Opcional) ###\n"

echo "Verificar estado de automação de uma corrida:"
echo "GET /api/admin/automation/:rideId"
echo "curl -s -X GET \"$API_URL/admin/automation/$RIDE_ID\" -H \"Authorization: Bearer admin:ADMIN\" | jq ."

echo -e "\nVerificar status de todos os jobs:"
echo "GET /api/admin/jobs"
echo "curl -s -X GET \"$API_URL/admin/jobs\" -H \"Authorization: Bearer admin:ADMIN\" | jq ."

echo -e "\n=========================================="
echo "FIM DOS EXEMPLOS"
echo "=========================================="
