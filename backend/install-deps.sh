#!/bin/bash

echo "📦 Instalando dependências do VouDeMoto Backend..."

# Instalar dependências principais
npm install --save \
  express \
  uuid \
  dotenv \
  winston \
  winston-daily-rotate-file \
  @opentelemetry/api

# Instalar dependências de desenvolvimento
npm install --save-dev \
  @types/express \
  @types/node \
  @types/jest \
  @types/uuid \
  typescript \
  ts-node \
  jest \
  ts-jest \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser

echo "✅ Dependências instaladas com sucesso!"
echo "🧪 Execute 'npm test' para rodar os testes"
echo "🚀 Execute 'npm run dev' para iniciar o servidor"
