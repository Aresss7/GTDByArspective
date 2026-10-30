# Спецификация локальной синхронизации Arspective GTD (Windows ↔ Android)

Данный документ описывает протокол и API локальной синхронизации между Windows-приложением (**сервер**) и мобильным Android-приложением (**клиент**).

---

## 1. Концепция и архитектура

- **Тип сети:** Локальная домашняя или рабочая Wi-Fi сеть.
- **Подключение к интернету:** **НЕ требуется**. Все данные передаются напрямую между устройствами.
- **Облачные сервера и сторонние учетные записи:** Отсутствуют.
- **Режим работы:** **Offline-First**. Оба устройства сохраняют полную автономность вне дома. Все действия (создание, изменение, удаление задач) сохраняются в локальной SQLite базе устройства и передаются при появлении связи.
- **Формат обмена:** REST API over HTTP/JSON (порт по умолчанию: `52420`).
- **Синхронизация:** Двусторонняя, инкрементальная (передаются только дельты — изменения с момента последней успешной синхронизации).
- **Идентификаторы сущностей:** Стабильные уникальные строковые ID (например, `task_173029..._a8f9`, `proj_173029..._c3b1`), генерируемые на устройстве создания.

---

## 2. Первоначальное сопряжение (Pairing)

### Шаг 1. Экран сопряжения на Windows
1. Пользователь в Windows-приложении нажимает кнопку **«Подключить устройство»**.
2. Сервер создаёт сессию сопряжения (срок жизни: 10 минут) и отображает:
   - **QR-код**
   - Резервный **6-значный PIN-код**
   - Локальный IP-адрес компьютера (например, `http://192.168.1.45:52420`)

### Шаг 2. Содержимое QR-кода
QR-код содержит строку JSON следующего формата:

```json
{
  "app": "ArspectiveGTD",
  "protocol": 1,
  "ip": "192.168.1.45",
  "port": 52420,
  "pin": "482910",
  "secret": "9a7f3c1b82e45d601a4e..."
}
```

### Шаг 3. Запрос на авторизацию от Android

Android отправляет `POST` запрос на адрес `http://<ip>:<port>/api/v1/pair`:

**Тело запроса (JSON):**
```json
{
  "secretToken": "9a7f3c1b82e45d601a4e...",
  "pinCode": "482910",
  "deviceName": "Google Pixel 8 Pro"
}
```
*(Достаточно передать либо `secretToken` из QR-кода, либо `pinCode` при ручном вводе).*

**Ответ сервера (200 OK):**
```json
{
  "success": true,
  "deviceId": "dev_1730301234_abc123",
  "deviceName": "Google Pixel 8 Pro",
  "authToken": "d8f4e2b01c3a6f9876543210abcdef...",
  "serverName": "Arspective GTD"
}
```

### Шаг 4. Сохранение на Android
Android сохраняет в защищённом хранилище (`EncryptedSharedPreferences` / `DataStore`):
- `serverIp` и `serverPort`
- `deviceId`
- `authToken` (постоянный криптографический ключ доступа)
- `lastSyncedAt = null`

> **Важно:** Повторный ввод кода или сканирование QR-кода при последующих подключениях **не требуются**.

---

## 3. Авторизация запросов

Все последующие запросы к API должны содержать заголовок:
```http
Authorization: Bearer <authToken>
```

Если доступ устройства отозван пользователем на компьютере, сервер вернёт:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{ "error": "Forbidden: Device is not authorized or access was revoked" }
```
При получении `403` Android должен уведомить пользователя о необходимости повторного сопряжения.

---

## 4. Спецификация REST API

### 4.1. Проверка доступности сервера

```http
GET /api/v1/ping
```
*Авторизация не требуется.*

**Ответ (200 OK):**
```json
{
  "status": "ok",
  "server": "Arspective GTD Sync Server",
  "version": "1.0.0",
  "protocolVersion": 1,
  "serverTime": "2026-10-30T14:30:00.000Z"
}
```

---

### 4.2. Первоначальное сопряжение

```http
POST /api/v1/pair
Content-Type: application/json
```
*Авторизация не требуется.*

**Запрос:**
```json
{
  "secretToken": "string (optional, from QR)",
  "pinCode": "string (optional, 6 digits)",
  "deviceName": "string"
}
```

**Ответ (200 OK):**
```json
{
  "success": true,
  "deviceId": "string",
  "deviceName": "string",
  "authToken": "string (64 hex characters)",
  "serverName": "Arspective GTD"
}
```

---

### 4.3. Проверка статуса устройства

```http
GET /api/v1/device/status
Authorization: Bearer <authToken>
```

**Ответ (200 OK):**
```json
{
  "status": "authorized",
  "deviceId": "string",
  "deviceName": "string",
  "lastSyncedAt": "2026-10-30T12:00:00.000Z"
}
```

---

### 4.4. Двусторонняя инкрементальная синхронизация

```http
POST /api/v1/sync
Authorization: Bearer <authToken>
Content-Type: application/json
```

**Тело запроса от Android:**
```json
{
  "protocolVersion": 1,
  "lastSyncedAt": "2026-10-30T10:00:00.000Z",
  "clientChanges": {
    "tasks": [
      {
        "id": "task_1730300000_abc123",
        "title": "Купить билеты на поезд",
        "notes": "Посмотреть купе на вечер",
        "destination": "next_actions",
        "status": "active",
        "project_id": null,
        "project_order": 0,
        "due_date": null,
        "due_time": null,
        "scheduled_date": "2026-11-05",
        "scheduled_time": "18:00",
        "delegated_to": null,
        "waiting_for": null,
        "check_date": null,
        "created_at": "2026-10-30T11:00:00.000Z",
        "updated_at": "2026-10-30T11:15:00.000Z",
        "completed_at": null,
        "deleted_at": null
      }
    ],
    "projects": [
      {
        "id": "proj_1730300000_xyz789",
        "title": "Ремонт в гостиной",
        "description": "Покраска стен и замена плинтусов",
        "first_step_task_id": "task_1730300000_abc123",
        "approximate_plan": "1. Выбрать краску\n2. Заказать материалы",
        "completion_criteria": "Стены покрашены в 2 слоя",
        "status": "active",
        "created_at": "2026-10-30T10:30:00.000Z",
        "updated_at": "2026-10-30T10:30:00.000Z",
        "completed_at": null,
        "deleted_at": null
      }
    ],
    "tombstones": [
      {
        "entity_type": "task",
        "entity_id": "task_1730200000_old001",
        "deleted_at": "2026-10-30T11:20:00.000Z"
      }
    ]
  }
}
```

> **Примечание:** Если это первая синхронизация устройства, поле `lastSyncedAt` передаётся как `null`. При этом сервер возвращает **все существующие задачи и проекты**.

**Ответ сервера (200 OK):**
```json
{
  "protocolVersion": 1,
  "syncedAt": "2026-10-30T14:35:00.000Z",
  "serverChanges": {
    "tasks": [ ... ],
    "projects": [ ... ],
    "tombstones": [ ... ]
  },
  "stats": {
    "appliedTasks": 1,
    "appliedProjects": 1,
    "appliedTombstones": 1,
    "conflictsResolved": 0
  }
}
```

После успешного ответа клиент обновляет своё локальное значение `lastSyncedAt = syncedAt`.

---

## 5. Структуры данных (Модели)

### 5.1. Задача (`Task`)
| Поле | Тип | Описание |
|---|---|---|
| `id` | `String` | Уникальный ID (`task_<timestamp>_<random>`) |
| `title` | `String` | Название задачи |
| `notes` | `String?` | Описание, примерный план, детали, ссылки |
| `destination` | `String` | `inbox`, `next_actions`, `calendar`, `waiting_for`, `someday`, `notes`, `trash` |
| `status` | `String` | `active` или `completed` |
| `project_id` | `String?` | Ссылка на проект (или null) |
| `project_order` | `Int` | Порядковый номер шага в проекте |
| `due_date` | `String?` | Крайний срок (формат: `YYYY-MM-DD`) |
| `due_time` | `String?` | Время крайнего срока (формат: `HH:mm`) |
| `scheduled_date`| `String?` | Дата в календаре (`YYYY-MM-DD`) |
| `scheduled_time`| `String?` | Время в календаре (`HH:mm`) |
| `delegated_to` | `String?` | Кому поручено дело |
| `waiting_for` | `String?` | Ожидаемый результат |
| `check_date` | `String?` | Дата проверки делегированного дела |
| `created_at` | `String` | ISO 8601 дата создания |
| `updated_at` | `String` | ISO 8601 дата последнего изменения |
| `completed_at` | `String?` | ISO 8601 дата выполнения (если завершено) |
| `deleted_at` | `String?` | ISO 8601 дата мягкого удаления в корзину |

### 5.2. Проект (`Project`)
| Поле | Тип | Описание |
|---|---|---|
| `id` | `String` | Уникальный ID (`proj_<timestamp>_<random>`) |
| `title` | `String` | Название проекта |
| `description` | `String?` | Описание проекта |
| `first_step_task_id` | `String?` | ID задачи, являющейся первым физическим шагом |
| `approximate_plan` | `String?` | Примерный план действий проекта |
| `completion_criteria` | `String?` | Критерии завершения проекта |
| `status` | `String` | `active`, `completed`, `archived`, `on_hold` |
| `created_at` | `String` | ISO 8601 дата создания |
| `updated_at` | `String` | ISO 8601 дата последнего изменения |
| `completed_at` | `String?` | ISO 8601 дата завершения проекта |
| `deleted_at` | `String?` | ISO 8601 дата удаления проекта |

### 5.3. Метка удаления (`Tombstone`)
| Поле | Тип | Описание |
|---|---|---|
| `entity_type` | `String` | `'task'` или `'project'` |
| `entity_id` | `String` | ID удаленной сущности |
| `deleted_at` | `String` | ISO 8601 время окончательного удаления |

---

## 6. Стратегия разрешения конфликтов (Conflict Resolution)

1. **Редактирование vs Редактирование:**
   - Если задача была изменена на обоих устройствах в офлайне, сервер сравнивает `updated_at`.
   - Если текст заметок (`notes`) различается и содержит уникальную информацию на обеих сторонах, сервер **не уничтожает** данные, а объединяет их:
     ```
     <Текст более свежей версии>

     [Версия с компьютера (<дата>)]:
     <Текст альтернативной версии>
     ```
2. **Удаление vs Редактирование:**
   - Если задача была удалена на одном устройстве, но отредактирована на другом — побеждает **сохранение данных** (задача восстанавливается с новыми правками).
3. **Идемпотентность:**
   - Повторная отправка пакета изменений (например, при обрыве Wi-Fi до получения ответа) безопасна: записи обновляются по своим уникальным ID без дублирования.
