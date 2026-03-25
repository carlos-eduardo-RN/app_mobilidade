# Conformidade LGPD - VouDeMoto Backend

## Visão Geral

Este documento detalha as medidas implementadas para garantir conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

## Princípios Implementados

### 1. Consentimento
- ✅ Coleta explícita de consentimento no cadastro
- ✅ Finalidade específica para cada tipo de dado
- ✅ Possibilidade de revogar consentimento
- ✅ Registro de consentimentos no banco de dados

### 2. Transparência
- ✅ Política de privacidade clara e acessível
- ✅ Notificação sobre coleta e uso de dados
- ✅ Informação sobre compartilhamento com terceiros
- ✅ Lista de dados coletados e finalidade

### 3. Segurança
- ✅ Criptografia de dados em trânsito (TLS 1.3)
- ✅ Criptografia de dados em repouso (AES-256)
- ✅ Hashing de senhas (bcrypt)
- ✅ Autenticação multifator (MFA)
- ✅ Logs de acesso e auditoria

### 4. Minimização
- ✅ Coleta apenas de dados necessários
- ✅ Validação de campos obrigatórios
- ✅ Dados opcionais claramente marcados
- ✅ Retenção limitada de dados

## Direitos dos Titulares

### 1. Acesso aos Dados
**Endpoint**: `GET /api/users/me/data`
- Retorna todos os dados pessoais do usuário
- Formato JSON estruturado
- Download em PDF disponível

### 2. Retificação de Dados
**Endpoint**: `PUT /api/users/me`
- Permite atualização de dados pessoais
- Validação de dados
- Auditoria de alterações

### 3. Eliminação de Dados (Direito ao Esquecimento)
**Endpoint**: `DELETE /api/users/me`
- Exclusão de todos os dados pessoais
- Anonimização de dados em transações históricas
- Retenção legal respeitada (5 anos para transações financeiras)
- Confirmação por email

### 4. Portabilidade
**Endpoint**: `GET /api/users/me/export`
- Exportação em formato JSON
- Exportação em formato CSV
- Inclui todos os dados: perfil, corridas, pagamentos, avaliações

### 5. Revogação de Consentimento
**Endpoint**: `POST /api/users/me/consent/revoke`
- Revoga consentimento para finalidades específicas
- Limita uso de dados conforme revogação
- Registro de revogação

### 6. Oposição ao Tratamento
**Endpoint**: `POST /api/users/me/data-processing/oppose`
- Permite oposição a tratamentos específicos
- Marketing direto pode ser desativado
- Processamento de dados para finalidades legítimas

## Dados Coletados

### Dados Pessoais Básicos
- Nome completo
- Email
- Telefone
- CPF (apenas para motoristas)
- Data de nascimento (opcional)

### Dados de Localização
- **Finalidade**: Rastreamento de corridas, cálculo de rotas
- **Base Legal**: Execução de contrato
- **Retenção**: 90 dias após conclusão da corrida
- **Compartilhamento**: Não compartilhado com terceiros

### Dados de Pagamento
- **Dados coletados**: Últimos 4 dígitos do cartão, bandeira
- **Armazenamento**: Tokenização via Stripe
- **Retenção**: Enquanto conta ativa + 5 anos (obrigação legal)
- **Compartilhamento**: Stripe (processador de pagamentos)

### Dados de Navegação
- **Dados coletados**: IP, user-agent, páginas acessadas
- **Finalidade**: Segurança, detecção de fraudes
- **Retenção**: 6 meses
- **Base Legal**: Interesse legítimo

### Fotos e Documentos (Motoristas)
- **Dados coletados**: Foto CNH, foto perfil, foto veículo
- **Finalidade**: Verificação de identidade, segurança
- **Retenção**: Enquanto conta ativa + 1 ano
- **Armazenamento**: S3 com criptografia

## Medidas de Segurança Técnicas

### Criptografia
```yaml
Em trânsito:
  - TLS 1.3 para todas as comunicações
  - Certificados SSL válidos
  - HSTS habilitado

Em repouso:
  - AES-256 para dados sensíveis
  - Criptografia de disco (AWS EBS)
  - Backup criptografado
```

### Controle de Acesso
```yaml
Autenticação:
  - JWT com expiração de 15 minutos
  - Refresh token com 7 dias
  - MFA opcional

Autorização:
  - RBAC (Role-Based Access Control)
  - Princípio do menor privilégio
  - Auditoria de acessos
```

### Anonimização
```yaml
Quando aplicável:
  - Anonimização de dados em análises agregadas
  - Pseudonimização de IPs em logs
  - Exclusão de PII após período de retenção
```

## Políticas de Retenção

| Tipo de Dado | Período de Retenção | Base Legal |
|--------------|---------------------|------------|
| Dados de cadastro | Enquanto conta ativa | Execução de contrato |
| Histórico de corridas | 2 anos | Interesse legítimo |
| Dados financeiros | 5 anos após transação | Obrigação legal (Lei 12.965/2014) |
| Logs de acesso | 6 meses | Obrigação legal (Marco Civil) |
| Dados de localização | 90 dias | Execução de contrato |
| Mensagens in-app | 30 dias | Execução de contrato |

## Compartilhamento de Dados

### Terceiros Autorizados
1. **Stripe**: Processamento de pagamentos
2. **Twilio**: Envio de SMS (OTP)
3. **SendGrid**: Envio de emails
4. **Google Maps**: Geolocalização e rotas
5. **AWS**: Hospedagem e infraestrutura

### Transferência Internacional
- Cláusulas contratuais padrão (SCC)
- Adequação de terceiros à LGPD
- Criptografia de dados em trânsito

## Gestão de Incidentes

### Plano de Resposta a Incidentes
1. **Detecção**: Monitoramento 24/7, alertas automáticos
2. **Contenção**: Isolamento imediato, bloqueio de acesso
3. **Análise**: Investigação forense, identificação de impacto
4. **Notificação**: 
   - ANPD: até 72 horas
   - Titulares: até 72 horas (se alto risco)
5. **Remediação**: Correção de vulnerabilidades, melhoria de controles

### Registro de Incidentes
- Logs de segurança centralizados
- Auditoria de acessos não autorizados
- Relatórios de incidentes documentados

## DPO (Encarregado de Dados)

**Contato**: dpo@voudemoto.com

**Responsabilidades**:
- Orientar sobre conformidade LGPD
- Atender solicitações de titulares
- Comunicação com a ANPD
- Auditoria de práticas de dados

## Treinamento e Conscientização

- ✅ Treinamento anual obrigatório em LGPD
- ✅ Política de segurança documentada
- ✅ Procedimentos de resposta a incidentes
- ✅ Conscientização sobre phishing

## Auditoria e Conformidade

### Auditorias Regulares
- Auditoria interna: Trimestral
- Auditoria externa: Anual
- Revisão de políticas: Semestral

### Documentação
- ✅ RIPD (Relatório de Impacto à Proteção de Dados)
- ✅ Registro de atividades de tratamento
- ✅ Contratos com processadores
- ✅ Políticas de privacidade atualizadas

## Bases Legais

| Tratamento | Base Legal | Artigo LGPD |
|------------|------------|-------------|
| Cadastro de usuários | Execução de contrato | Art. 7º, V |
| Processamento de pagamentos | Execução de contrato | Art. 7º, V |
| Envio de marketing | Consentimento | Art. 7º, I |
| Detecção de fraudes | Interesse legítimo | Art. 7º, IX |
| Cumprimento de obrigações fiscais | Obrigação legal | Art. 7º, II |

## Checklist de Conformidade

### Implementado ✅
- [x] Política de privacidade clara
- [x] Termos de uso atualizados
- [x] Formulários de consentimento
- [x] Endpoints de direitos dos titulares
- [x] Criptografia de dados
- [x] Controles de acesso
- [x] Logs de auditoria
- [x] Política de retenção
- [x] Plano de resposta a incidentes
- [x] Treinamento de equipe
- [x] DPO designado
- [x] Contratos com terceiros revisados

### Em andamento ⏳
- [ ] Certificação ISO 27001
- [ ] Auditoria externa independente
- [ ] Privacy by Design em novas features

## Referências Legais

- Lei nº 13.709/2018 (LGPD)
- Lei nº 12.965/2014 (Marco Civil da Internet)
- Resolução ANPD nº 2/2022
- GDPR (referência para boas práticas)

## Última Atualização

**Data**: 28 de janeiro de 2026
**Responsável**: Equipe DevOps
**Próxima Revisão**: 28 de julho de 2026
