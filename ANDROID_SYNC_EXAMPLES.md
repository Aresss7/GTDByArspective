# Примеры сетевого обмена и данных для Android-клиента (Arspective GTD)
`ANDROID_SYNC_EXAMPLES.md`

Все примеры в данном документе основаны на **фактическом коде** серверной части Windows-приложения (`src/main/sync/syncServer.ts` и `src/storage/repositories/syncRepository.ts`).

---

## 1. Пример содержимого QR-кода при подключении

При нажатии «Подключить устройство» в Windows генерируется QR-код, внутри которого закодирована следующая JSON-строка:

```json
{
  "app": "ArspectiveGTD",
  "protocol": 1,
  "ip": "192.168.1.105",
  "port": 52420,
  "pin": "739201",
  "secret": "d4e5f6a1b2c30718293a4b5c6d7e8f90123456789abcdef0"
}
```

### Назначение полей:
- `app`: Идентификатор приложения (`"ArspectiveGTD"`).
- `protocol`: Версия протокола обмена (`1`).
- `ip`: Локальный IPv4-адрес компьютера в Wi-Fi сети.
- `port`: Активный TCP-порт сервера Windows (`52420`).
- `pin`: 6-значный цифровой код (дублируется на экране крупными цифрами для ручного ввода).
- `secret`: 48-символьный одноразовый hex-секрет для мгновенной привязки без ручного ввода цифр.

---

## 2. Примеры запросов и ответов сопряжения (Pairing)

### 2.1 Запрос через QR-код (с secretToken)
**Запрос:**
```http
POST http://192.168.1.105:52420/api/v1/pair HTTP/1.1
Content-Type: application/json; charset=utf-8

{
  "deviceName": "Samsung Galaxy S24 (Android)",
  "secretToken": "d4e5f6a1b2c30718293a4b5c6d7e8f90123456789abcdef0"
}
```

### 2.2 Запрос через ручной ввод (с pinCode)
**Запрос:**
```http
POST http://192.168.1.105:52420/api/v1/pair HTTP/1.1
Content-Type: application/json; charset=utf-8

{
  "deviceName": "Xiaomi 13 Pro (Android)",
  "pinCode": "739201"
}
```

### 2.3 Успешный ответ сервера (200 OK)
```json
{
  "success": true,
  "deviceId": "dev_1730310000000_w8x2pa",
  "deviceName": "Samsung Galaxy S24 (Android)",
  "authToken": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "serverName": "Arspective GTD"
}
```

### 2.4 Ошибки сопряжения
- Если не переданы ни `pinCode`, ни `secretToken` (`400 Bad Request`):
```json
{
  "error": "Missing pinCode or secretToken"
}
```
- Если PIN неверен, уже использован или истёк срок в 10 минут (`401 Unauthorized`):
```json
{
  "error": "Invalid or expired pairing code"
}
```

---

## 3. Проверка статуса сопряжённого устройства

**Запрос:**
```http
GET http://192.168.1.105:52420/api/v1/device/status HTTP/1.1
Authorization: Bearer e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Ответ (200 OK):**
```json
{
  "status": "authorized",
  "deviceId": "dev_1730310000000_w8x2pa",
  "deviceName": "Samsung Galaxy S24 (Android)",
  "lastSyncedAt": "2026-10-30T17:00:00.000Z"
}
```

**Ответ при отзыве доступа (403 Forbidden):**
```json
{
  "error": "Forbidden: Device is not authorized or access was revoked"
}
```

---

## 4. Примеры двусторонней синхронизации (`POST /api/v1/sync`)

### 4.1 Первая синхронизация (Первичная загрузка базы на телефон)
Android передаёт `lastSyncedAt: null`, сервер отдаёт всю существующую базу.

**Запрос с Android:**
```http
POST http://192.168.1.105:52420/api/v1/sync HTTP/1.1
Authorization: Bearer e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Content-Type: application/json; charset=utf-8

{
  "lastSyncedAt": null,
  "clientChanges": {
    "tasks": [],
    "projects": [],
    "tombstones": []
  }
}
```

**Ответ Windows:**
```json
{
  "protocolVersion": 1,
  "syncedAt": "2026-10-30T17:15:00.000Z",
  "serverChanges": {
    "tasks": [
      {
        "id": "task_1730308000000_a1",
        "title": "Купить билеты в театр",
        "notes": "Посмотреть бельэтаж или 1 ряд партера",
        "destination": "next_actions",
        "status": "active",
        "project_id": null,
        "project_order": 0,
        "due_date": "2026-11-12",
        "due_time": "19:00",
        "scheduled_date": null,
        "scheduled_time": null,
        "delegated_to": null,
        "waiting_for": null,
        "check_date": null,
        "created_at": "2026-10-30T16:00:00.000Z",
        "updated_at": "2026-10-30T16:05:00.000Z",
        "completed_at": null,
        "deleted_at": null
      },
      {
        "id": "task_1730308000000_b2",
        "title": "Инструкция по настройке роутера",
        "notes": "## Параметры сети\n- IP: `192.168.1.1`\n- Логин: `admin`\n\n> Важно: не сбрасывать до заводских настроек!\n\n---\nСсылка на панель: [Роутер](http://192.168.1.1)",
        "destination": "notes",
        "status": "active",
        "project_id": null,
        "project_order": 0,
        "due_date": null,
        "due_time": null,
        "scheduled_date": null,
        "scheduled_time": null,
        "delegated_to": null,
        "waiting_for": null,
        "check_date": null,
        "created_at": "2026-10-30T15:00:00.000Z",
        "updated_at": "2026-10-30T15:20:00.000Z",
        "completed_at": null,
        "deleted_at": null
      }
    ],
    "projects": [
      {
        "id": "proj_1730307000000_p1",
        "title": "Запуск мобильного приложения",
        "description": "Разработка и синхронизация GTD клиента",
        "first_step_task_id": "task_1730308000000_a1",
        "approximate_plan": "1. Спецификация\n2. UI на Compose\n3. Sync Engine",
        "completion_criteria": "Приложение успешно синхронизируется в Wi-Fi сети",
        "status": "active",
        "created_at": "2026-10-30T14:00:00.000Z",
        "updated_at": "2026-10-30T14:30:00.000Z",
        "completed_at": null,
        "deleted_at": null
      }
    ],
    "tombstones": []
  },
  "stats": {
    "appliedTasks": 0,
    "appliedProjects": 0,
    "appliedTombstones": 0,
    "conflictsResolved": 0
  }
}
```

---

### 4.2 Регулярная синхронизация (Передача правок с Android на ПК и получение новых данных)

**Запрос с Android:**
Пользователь на телефоне:
1. Завершил задачу `task_1730308000000_a1`.
2. Создал новую задачу на телефоне `task_android_999`.

```http
POST http://192.168.1.105:52420/api/v1/sync HTTP/1.1
Authorization: Bearer e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Content-Type: application/json; charset=utf-8

{
  "lastSyncedAt": "2026-10-30T17:15:00.000Z",
  "clientChanges": {
    "tasks": [
      {
        "id": "task_1730308000000_a1",
        "title": "Купить билеты в театр",
        "notes": "Посмотреть бельэтаж или 1 ряд партера",
        "destination": "next_actions",
        "status": "completed",
        "project_id": null,
        "project_order": 0,
        "due_date": "2026-11-12",
        "due_time": "19:00",
        "scheduled_date": null,
        "scheduled_time": null,
        "delegated_to": null,
        "waiting_for": null,
        "check_date": null,
        "created_at": "2026-10-30T16:00:00.000Z",
        "updated_at": "2026-10-30T17:20:00.000Z",
        "completed_at": "2026-10-30T17:20:00.000Z",
        "deleted_at": null
      },
      {
        "id": "task_android_999",
        "title": "Позвонить врачу",
        "notes": "Записаться на четверг",
        "destination": "inbox",
        "status": "active",
        "project_id": null,
        "project_order": 0,
        "due_date": null,
        "due_time": null,
        "scheduled_date": null,
        "scheduled_time": null,
        "delegated_to": null,
        "waiting_for": null,
        "check_date": null,
        "created_at": "2026-10-30T17:21:00.000Z",
        "updated_at": "2026-10-30T17:21:00.000Z",
        "completed_at": null,
        "deleted_at": null
      }
    ],
    "projects": [],
    "tombstones": []
  }
}
```

**Ответ Windows:**
```json
{
  "protocolVersion": 1,
  "syncedAt": "2026-10-30T17:25:00.000Z",
  "serverChanges": {
    "tasks": [],
    "projects": [],
    "tombstones": []
  },
  "stats": {
    "appliedTasks": 2,
    "appliedProjects": 0,
    "appliedTombstones": 0,
    "conflictsResolved": 0
  }
}
```

---

### 4.3 Пример передачи физического удаления через Tombstone

Когда на мобильном клиенте или на ПК объект удаляется **навсегда** (из раздела «Мусор»):

**Пакет клиента с Tombstone:**
```json
{
  "lastSyncedAt": "2026-10-30T17:25:00.000Z",
  "clientChanges": {
    "tasks": [],
    "projects": [],
    "tombstones": [
      {
        "entity_type": "task",
        "entity_id": "task_android_999",
        "deleted_at": "2026-10-30T17:30:00.000Z"
      }
    ]
  }
}
```

**Реакция сервера:**
Сервер выполняет: `DELETE FROM tasks WHERE id = 'task_android_999'` и сохраняет метку удаления в свою таблицу `sync_tombstones`.
```json
{
  "protocolVersion": 1,
  "syncedAt": "2026-10-30T17:35:00.000Z",
  "serverChanges": {
    "tasks": [],
    "projects": [],
    "tombstones": []
  },
  "stats": {
    "appliedTasks": 0,
    "appliedProjects": 0,
    "appliedTombstones": 1,
    "conflictsResolved": 0
  }
}
```

---

## 5. Пример разрешения конфликта заметок (Smart Notes Merge)

Если задача `task_shared_1` имела исходные заметки `Начальный план`.
- В Windows в 17:00 записали: `Начальный план\n- Добавлена деталь на ПК` (`updated_at: 17:00:00Z`).
- На Android в 17:05 без интернета записали: `Начальный план\n- Добавлена деталь на Телефоне` (`updated_at: 17:05:00Z`).

При синхронизации сервер обнаруживает конкурентное редактирование и объединяет текст:

**Итоговый текст заметки в базе (`notes`):**
```markdown
Начальный план
- Добавлена деталь на Телефоне

[Версия с компьютера (2026-10-30T17:00:00.000Z)]:
Начальный план
- Добавлена деталь на ПК
```

В ответе сервера возвращается:
```json
"stats": {
  "appliedTasks": 1,
  "appliedProjects": 0,
  "appliedTombstones": 0,
  "conflictsResolved": 1
}
```
Данные обеих сторон сохранены полностью, потеря информации исключена.
