# Mülk Kira Takip Sistemi — API Dokümantasyonu

## Genel Bilgiler

| Özellik | Değer |
|---|---|
| Base URL (doğrudan backend) | `http://localhost:8300/api/v1` |
| Base URL (Nginx üzerinden) | `http://localhost:9080/api/v1` |
| Format | JSON |
| Kimlik Doğrulama | Bearer Token (JWT) |

### Ortak Response Formatı

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Hata mesajı" }
```

### Pagination (Listeleme uç noktaları)

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

Query parametreleri: `?page=1&limit=20`

### Authorization Header

Giriş dışındaki tüm endpoint'lerde gereklidir:

```
Authorization: Bearer <token>
```

---

## Health Check

```
GET /health
```

Auth gerektirmez.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-04-22T10:00:00.000Z" }
```

---

## 1. Auth — `/api/v1/auth`

### 1.1 Giriş Yap

```
POST /api/v1/auth/login
```

**Rate Limit:** 20 istek / 15 dakika

**Request Body:**
```json
{
  "email": "admin@kiratakip.local",
  "password": "Admin123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Admin",
      "email": "admin@kiratakip.local",
      "role": "admin"
    }
  }
}
```

---

### 1.2 Yeni Kullanıcı Oluştur

```
POST /api/v1/auth/register
```

Sadece **admin** rolü erişebilir.

**Request Body:**
```json
{
  "name": "Ali Veli",
  "email": "ali@ornek.com",
  "password": "Sifre123!",
  "role": "owner",
  "phone": "05551234567"
}
```

**role değerleri:** `owner` | `accountant` | `agent` | `admin`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ali Veli",
    "email": "ali@ornek.com",
    "role": "owner",
    "phone": "05551234567",
    "created_at": "2026-04-22T10:00:00.000Z"
  }
}
```

---

### 1.3 Mevcut Kullanıcı Bilgisi

```
GET /api/v1/auth/me
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@kiratakip.local",
    "role": "admin",
    "phone": null,
    "created_at": "2026-04-22T10:00:00.000Z"
  }
}
```

---

### 1.4 Şifre Değiştir

```
PUT /api/v1/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "EskiSifre123!",
  "newPassword": "YeniSifre456!"
}
```

**Response (200):**
```json
{ "success": true, "message": "Şifre güncellendi" }
```

---

## 2. Mülkler — `/api/v1/properties`

### 2.1 Mülk Listesi

```
GET /api/v1/properties
```

**Query Parametreleri:**

| Parametre | Tür | Açıklama |
|---|---|---|
| `status` | string | `available` \| `rented` \| `maintenance` |
| `type` | string | `residential` \| `commercial` \| `land` |
| `building_id` | uuid | Belirli binaya göre filtrele |
| `search` | string | Mülk adı veya kapı no ile arama |
| `page` | number | Sayfa no (varsayılan: 1) |
| `limit` | number | Sayfa boyutu (varsayılan: 20) |

**Örnek:** `GET /api/v1/properties?status=rented&page=1&limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "building_id": "uuid",
      "building_name": "Merkez Apartmanı",
      "name": "Daire 5",
      "type": "residential",
      "floor": 2,
      "unit_number": "5",
      "area_sqm": 90,
      "status": "rented",
      "monthly_rent": "5000.00",
      "tenant_name": "Ahmet Yılmaz",
      "active_contract_id": "uuid"
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 20 }
}
```

---

### 2.2 Mülk Detayı

```
GET /api/v1/properties/:id
```

---

### 2.3 Mülk Oluştur

```
POST /api/v1/properties
```

**Request Body:**
```json
{
  "name": "Daire 3",
  "type": "residential",
  "building_id": "uuid (opsiyonel)",
  "floor": 1,
  "unit_number": "3",
  "area_sqm": 75,
  "deed_info": "Tapu bilgisi",
  "description": "Açıklama",
  "purchase_price": 1500000,
  "market_value": 2000000
}
```

---

### 2.4 Mülk Güncelle

```
PUT /api/v1/properties/:id
```

Body alanları opsiyoneldir, sadece gönderilen alanlar güncellenir. Ek olarak `status` da gönderilebilir.

---

### 2.5 Mülk Sil

```
DELETE /api/v1/properties/:id
```

---

## 3. Kiracılar — `/api/v1/tenants`

### 3.1 Kiracı Listesi

```
GET /api/v1/tenants?page=1&limit=20
```

---

### 3.2 Kiracı Detayı

```
GET /api/v1/tenants/:id
```

Aktif sözleşme bilgilerini de içerir.

---

### 3.3 Kiracı Oluştur

```
POST /api/v1/tenants
```

**Request Body:**
```json
{
  "first_name": "Ahmet",
  "last_name": "Yılmaz",
  "email": "ahmet@ornek.com",
  "phone": "05551234567",
  "national_id": "12345678901",
  "birth_date": "1990-05-15",
  "address": "Örnek Mah. Test Sok. No:1",
  "emergency_contact": "Mehmet Yılmaz",
  "emergency_phone": "05559876543",
  "notes": "Notlar"
}
```

---

### 3.4 Kiracı Güncelle

```
PUT /api/v1/tenants/:id
```

---

### 3.5 Kiracı Sil

```
DELETE /api/v1/tenants/:id
```

---

## 4. Sözleşmeler — `/api/v1/contracts`

### 4.1 Sözleşme Listesi

```
GET /api/v1/contracts
```

**Query Parametreleri:**

| Parametre | Tür | Açıklama |
|---|---|---|
| `status` | string | `active` \| `expired` \| `terminated` |
| `property_id` | uuid | Mülke göre filtrele |
| `tenant_id` | uuid | Kiracıya göre filtrele |
| `page` | number | Sayfa no |
| `limit` | number | Sayfa boyutu |

---

### 4.2 Sözleşme Detayı

```
GET /api/v1/contracts/:id
```

Ödeme geçmişini de içerir (`payments` dizisi).

---

### 4.3 Sözleşme Oluştur

```
POST /api/v1/contracts
```

Aynı mülk için çakışan aktif sözleşme varsa `409` döner. Başarılı oluşturmada mülk durumu otomatik olarak `rented` yapılır.

**Request Body:**
```json
{
  "property_id": "uuid",
  "tenant_id": "uuid",
  "start_date": "2026-05-01",
  "end_date": "2027-04-30",
  "monthly_rent": 5000,
  "deposit_amount": 10000,
  "increase_type": "percent",
  "increase_rate": 10,
  "special_terms": "Evcil hayvan yasak",
  "eviction_date": null
}
```

---

### 4.4 Sözleşme Güncelle

```
PUT /api/v1/contracts/:id
```

---

## 5. Ödemeler — `/api/v1/payments`

### 5.1 Ödeme Listesi

```
GET /api/v1/payments
```

**Query Parametreleri:**

| Parametre | Tür | Açıklama |
|---|---|---|
| `status` | string | `pending` \| `paid` \| `overdue` \| `cancelled` |
| `contract_id` | uuid | Sözleşmeye göre filtrele |
| `from_date` | date | Başlangıç tarihi (YYYY-MM-DD) |
| `to_date` | date | Bitiş tarihi (YYYY-MM-DD) |
| `page` | number | Sayfa no |
| `limit` | number | Sayfa boyutu |

---

### 5.2 Ödeme Oluştur

```
POST /api/v1/payments
```

**Request Body:**
```json
{
  "contract_id": "uuid",
  "amount": 5000,
  "due_date": "2026-05-01",
  "payment_date": null,
  "status": "pending",
  "method": "bank_transfer",
  "reference_no": "TF202605001",
  "notes": "Mayıs kirası"
}
```

---

### 5.3 Ödemeyi Tahsil Et

```
PUT /api/v1/payments/:id/mark-paid
```

**Request Body:**
```json
{
  "payment_date": "2026-05-03",
  "method": "cash",
  "reference_no": null,
  "notes": "Elden ödendi"
}
```

---

### 5.4 Aylık Tahakkuk Oluştur

```
POST /api/v1/payments/generate-monthly
```

Tüm aktif sözleşmeler için belirtilen ay/yıla ait ödeme kaydı oluşturur (zaten mevcut olanları atlar).

**Request Body:**
```json
{
  "year": 2026,
  "month": 6
}
```

**Response (200):**
```json
{ "success": true, "data": { "created": 12, "skipped": 3 } }
```

---

## 6. Giderler — `/api/v1/expenses`

### 6.1 Gider Listesi

```
GET /api/v1/expenses
```

**Query Parametreleri:**

| Parametre | Tür | Açıklama |
|---|---|---|
| `property_id` | uuid | Mülke göre filtrele |
| `category` | string | Gider kategorisi |
| `from_date` | date | Başlangıç tarihi |
| `to_date` | date | Bitiş tarihi |
| `page` | number | Sayfa no |
| `limit` | number | Sayfa boyutu |

---

### 6.2 Gider Oluştur

```
POST /api/v1/expenses
```

**Request Body:**
```json
{
  "property_id": "uuid (opsiyonel)",
  "category": "maintenance",
  "amount": 1500,
  "date": "2026-04-20",
  "vendor": "Tesisatçı Mehmet",
  "description": "Su tesisatı onarımı",
  "receipt_url": null
}
```

---

### 6.3 Gider Güncelle

```
PUT /api/v1/expenses/:id
```

---

### 6.4 Gider Sil

```
DELETE /api/v1/expenses/:id
```

---

## 7. Bakım Talepleri — `/api/v1/maintenance`

### 7.1 Talep Listesi

```
GET /api/v1/maintenance?page=1&limit=20
```

---

### 7.2 Talep Detayı

```
GET /api/v1/maintenance/:id
```

---

### 7.3 Talep Oluştur

```
POST /api/v1/maintenance
```

**Request Body:**
```json
{
  "property_id": "uuid",
  "tenant_id": "uuid (opsiyonel)",
  "title": "Mutfak Bataryası Arızası",
  "description": "Soğuk su gelmiyor",
  "priority": "high",
  "category": "plumbing",
  "reported_date": "2026-04-22"
}
```

**priority değerleri:** `low` | `medium` | `high` | `urgent`

---

### 7.4 Talep Güncelle

```
PUT /api/v1/maintenance/:id
```

**Request Body (örnek — durum güncelleme):**
```json
{
  "status": "in_progress",
  "assigned_to": "Tesisatçı Firma",
  "estimated_cost": 800,
  "actual_cost": null,
  "resolved_date": null
}
```

**status değerleri:** `open` | `in_progress` | `resolved` | `cancelled`

---

## 8. Raporlar — `/api/v1/reports`

### 8.1 Dashboard Özeti

```
GET /api/v1/reports/dashboard
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "properties": {
      "available": 5,
      "rented": 10,
      "maintenance": 2,
      "total": 17
    },
    "payments": {
      "collected_this_month": "50000.00",
      "overdue_total": "7500.00",
      "overdue_count": "3"
    },
    "expiring_contracts": [
      {
        "id": "uuid",
        "end_date": "2026-06-01",
        "monthly_rent": "5000.00",
        "property_name": "Daire 5",
        "tenant_name": "Ahmet Yılmaz",
        "phone": "05551234567"
      }
    ],
    "recent_payments": [ ... ],
    "open_maintenance": 4
  }
}
```

---

### 8.2 Gelir / Gider Raporu

```
GET /api/v1/reports/income-expense?year=2026
```

**Query Parametreleri:**

| Parametre | Tür | Açıklama |
|---|---|---|
| `year` | number | Yıl (varsayılan: mevcut yıl) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "income": [
      { "month": "2026-01", "total": "45000.00" },
      { "month": "2026-02", "total": "48000.00" }
    ],
    "expenses": [
      { "month": "2026-01", "total": "3200.00" }
    ]
  }
}
```

---

### 8.3 Mülk Karlılık Raporu

```
GET /api/v1/reports/profitability?year=2026
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Daire 5",
      "unit_number": "5",
      "total_income": "60000.00",
      "total_expenses": "4000.00",
      "net": "56000.00"
    }
  ]
}
```

---

## Hata Kodları

| HTTP Kodu | Açıklama |
|---|---|
| `400` | Eksik veya geçersiz parametreler |
| `401` | Kimlik doğrulama başarısız / token geçersiz |
| `403` | Yetki yok (role insufficient) |
| `404` | Kayıt bulunamadı |
| `409` | Çakışma (örn. aynı mülkte aktif sözleşme) |
| `429` | Rate limit aşıldı |
| `500` | Sunucu hatası |

---

## Hızlı Test (curl)

```bash
# 1. Giriş yap — token al
curl -s -X POST http://localhost:8300/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kiratakip.local","password":"Admin123!"}' | jq .

# 2. TOKEN değişkenine ata (bash)
TOKEN=$(curl -s -X POST http://localhost:8300/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kiratakip.local","password":"Admin123!"}' | jq -r .data.token)

# 3. Mülk listesi
curl -s http://localhost:8300/api/v1/properties \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Dashboard
curl -s http://localhost:8300/api/v1/reports/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. Aylık tahakkuk oluştur
curl -s -X POST http://localhost:8300/api/v1/payments/generate-monthly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"year":2026,"month":5}' | jq .
```

> **PowerShell için** `curl` yerine `Invoke-RestMethod` veya Postman kullanın.

---

## Postman Environment Değişkenleri

```
base_url  = http://localhost:8300/api/v1
token     = (login sonrası buraya yapıştır)
```

Tüm isteklerde `Authorization` header: `Bearer {{token}}`
