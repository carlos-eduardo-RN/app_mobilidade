# 🔧 Guia de Configuração - API no Android

## ✅ Problema Resolvido!

O erro "Connection refused" no Android foi corrigido. Agora a configuração detecta automaticamente:
- ✅ Android Emulator → usa `10.0.2.2`
- ✅ Celular físico → configurável
- ✅ iOS Simulator → usa `localhost`
- ✅ Produção → usa URL real

---

## 📱 Como Funciona

### **Android Emulator**
```
localhost → 10.0.2.2 (aponta para o PC host)
```

### **Celular Físico**
```
localhost → IP da sua máquina na rede local (ex: 192.168.1.100)
```

---

## 🚀 Testando Agora (Emulador Android)

### 1. **Certifique-se que o backend está rodando**
```powershell
cd F:\Projetos\VouDeMoto\backend
npm run dev
```

Deve aparecer algo como:
```
Server listening on port 3000
```

### 2. **Rode o app no emulador**
```powershell
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro
flutter run
```

### 3. **Teste o cadastro/login**
- O app agora vai se conectar em `http://10.0.2.2:3000`
- Isso aponta para `localhost:3000` do seu PC

---

## 📲 Usando com Celular Físico

### **Passo 1: Descobrir o IP da sua máquina**

#### Windows:
```powershell
ipconfig
```
Procure por `IPv4 Address` na interface Wi-Fi:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

#### Mac/Linux:
```bash
ifconfig
```
Procure por `inet` (não `inet6`):
```
en0: flags=8863<UP,BROADCAST,SMART,RUNNING>
    inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

### **Passo 2: Configurar o IP no código**

#### App Passageiro:
Abra: `apps/passageiro/app_passageiro/lib/core/config/app_config.dart`

```dart
static const String _physicalDeviceIp = '192.168.1.100'; // ALTERE AQUI!
```

Depois altere a linha 34 de:
```dart
return '10.0.2.2'; // Use _physicalDeviceIp se estiver em celular físico
```

Para:
```dart
return _physicalDeviceIp; // Usando celular físico
```

#### App Motorista:
Abra: `apps/motorista/app_motorista/lib/services/api_client.dart`

```dart
static const String _physicalDeviceIp = '192.168.1.100'; // ALTERE AQUI!
```

Depois altere a linha 35 de:
```dart
return '10.0.2.2'; // Use _physicalDeviceIp se estiver em celular físico
```

Para:
```dart
return _physicalDeviceIp; // Usando celular físico
```

### **Passo 3: Permitir conexão no backend**

O backend precisa aceitar conexões externas. Verifique se está:
```typescript
app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});
```

### **Passo 4: Celular e PC na mesma rede**
- ✅ Ambos conectados na mesma Wi-Fi
- ✅ Firewall do Windows liberado para porta 3000

#### Liberar Firewall (Windows):
```powershell
# Execute como Administrador
New-NetFirewallRule -DisplayName "NodeJS 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### **Passo 5: Testar**
```powershell
curl http://192.168.1.100:3000/api/health
```

Se retornar resposta, está funcionando!

---

## 🏭 Produção

Para produção, altere as URLs nos mesmos arquivos:

### App Passageiro - `app_config.dart`:
```dart
static String _getHost() {
  if (kReleaseMode) {
    return 'api.voudemoto.com'; // SUA URL DE PRODUÇÃO
  }
  // ... resto do código
}
```

### App Motorista - `api_client.dart`:
```dart
String _getHost() {
  if (kReleaseMode) {
    return 'api.voudemoto.com'; // SUA URL DE PRODUÇÃO
  }
  // ... resto do código
}
```

---

## 🐛 Troubleshooting

### Erro: "Connection refused"
- ✅ Backend está rodando? → `npm run dev`
- ✅ No emulador? → deve usar `10.0.2.2`
- ✅ No celular físico? → configurou IP correto?
- ✅ Mesma rede Wi-Fi?
- ✅ Firewall liberado?

### Erro: "Network unreachable"
- ✅ Celular e PC na mesma rede
- ✅ IP correto (rode `ipconfig` novamente)

### Erro: "Timeout"
- ✅ Backend aceitando conexões externas (`0.0.0.0`)
- ✅ Firewall não está bloqueando

---

## 📝 Resumo das Alterações

### Arquivos Modificados:
1. ✅ `apps/passageiro/app_passageiro/lib/core/config/app_config.dart`
2. ✅ `apps/motorista/app_motorista/lib/services/api_client.dart`

### O que foi alterado:
- ✅ Detecção automática de plataforma com `Platform.isAndroid`
- ✅ Modo debug vs release com `kReleaseMode`
- ✅ Configuração centralizada e comentada
- ✅ Suporte a emulador e dispositivo físico

---

## ✨ Pronto para Usar!

Agora é só rodar:
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: App
cd apps/passageiro/app_passageiro
flutter run
```

O app vai se conectar automaticamente no backend! 🚀
