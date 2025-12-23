# 🔐 WALLESTER API RSA KEYS - ГЕНЕРИРАНИ! ✅

## 📁 Локация на ключовете:
```
.wallester_keys/
  ├── wallester_private.pem  (PRIVATE - НЕ СПОДЕЛЯЙ!)
  ├── wallester_public.pem   (PUBLIC - За Wallester)
```

---

## ✅ ГЕНЕРИРАНИ КЛЮЧОВЕ

### 🔑 PUBLIC KEY (Копирай това в Wallester dashboard):

```
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAgLLFDJrw9pJTppECLb4G
VMbx6KichAIpfO87n611okqUNJE9/OjxvbwMY2xqY++5QlEcvHy6oFh/gpIuRnHj
IXbsTb99rv68meJqLomMuBGPBmbMdHYqihbvGLu03MX8EYW4EnP5UF/42nTL7f2T
plro+FTGbxn4/Cz6zHSM1rl4s5gusiXDnMM4wpnAE7SqwDPm46QatMhVR3k+L5L0
P4U2R/1yUBJmEe4nrPaCMNUkZ5ipuI9r8wwK2kgXyVPlMQBfCwVZxJgJBBFe6ZL7
9BgZNn/quEZupvwi5up4i3h4R1Ej9Ublo2cmITcRHu0ZxztJabuJ+I/mY7nm7Txe
lLfaNW8rtVKGTIf6AVGmh6oeBPN961h0xXnechzLE5zzG68pMXFshnNPL9N9UdyF
y7G5B/B6Q5tPsNsfkoD2HeLMKfBh0P84koiMCo5fMM/WQMMQK/k/gHhR2bJdAY2g
DB/Q1kSMrRmcR3NDiLK6ZTrZvSCoUnWIntGMB+dNUpksXTWDp80C3p+xHRPCfEAR
wYgkFcmHTQgTdTpwjt+dakHmqJxo6WSKHXQx4rBUGd9UlO/43Bvwlkv/InPzrml8
VUhTsPj2NkXa8tD9hrbpa3MoUCS5dLrFlwC+toOkAjM6ayd2RED86qxU8fWnA2i3
SZYJHmy5VqG5XRE2vdBDkXcCAwEAAQ==
-----END PUBLIC KEY-----
```

---

## 🔒 СИГУРНОСТ

- ✅ `.wallester_keys/` директорията има права `700` (само собственик)
- ✅ Добавена в `.gitignore` (няма да се качи в Git)
- ✅ PRIVATE ключът НЕ СЕ СПОДЕЛЯ никога и никъде!

---

## 📋 КАКВО СЛЕДВА:

### 1️⃣ Копирай PUBLIC KEY-а по-горе
### 2️⃣ Влез в Wallester Dashboard
### 3️⃣ Намери секцията "API Settings" или "RSA Keys"
### 4️⃣ Постави PUBLIC ключа в полето
### 5️⃣ Запази настройките

---

## 🧪 КАК ДА ИЗПОЛЗВАШ КЛЮЧОВЕТЕ В КОД

### Node.js пример (crypto):

```javascript
import crypto from 'crypto';
import fs from 'fs';

// Зареди PRIVATE ключа за декриптиране
const privateKey = fs.readFileSync('.wallester_keys/wallester_private.pem', 'utf8');

// Декриптирай данни от Wallester
function decryptWallesterData(encryptedData) {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
  return decrypted.toString('utf8');
}

// Използване:
const encryptedFromWallester = "..."; // От Wallester webhook
const decryptedData = decryptWallesterData(encryptedFromWallester);
console.log(JSON.parse(decryptedData));
```

---

## 🔧 КОМАНДИ ЗА ПОВТОРНО ГЕНЕРИРАНЕ (ако е необходимо)

```bash
# Генерирай нови ключове
cd .wallester_keys

# 1. PRIVATE key
openssl genrsa -out wallester_private.pem 4096

# 2. PUBLIC key
openssl rsa -in wallester_private.pem -pubout -out wallester_public.pem

# 3. Покажи PUBLIC key
cat wallester_public.pem
```

---

## ⚠️ ВАЖНО:

- **PRIVATE key** = `.wallester_keys/wallester_private.pem` - НИКОГА не го споделяй!
- **PUBLIC key** = `.wallester_keys/wallester_public.pem` - Това даваш на Wallester
- Ако регенерираш ключовете, трябва да актуализираш PUBLIC key-а в Wallester dashboard!

---

## 🎯 СТАТУС: ГОТОВО! ✅

Ключовете са генерирани и защитени. Копирай PUBLIC ключа в Wallester и системата ще е готова за secure communication!
