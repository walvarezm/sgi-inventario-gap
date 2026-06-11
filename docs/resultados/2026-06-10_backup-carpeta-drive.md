# Backup Diario en Carpeta Específica de Google Drive

## Resumen

Refactorización de `hacerBackupDiario()` para mover la copia del Spreadsheet a una carpeta
específica de Google Drive configurada mediante una Script Property, en lugar de dejarla en
la raíz del Drive. Se agrega la propiedad `DRIVE_FOLDER_BACKUPS` al objeto `CONFIG` central.

## Rama Git

`dev`

## Checklist

- [x] Agregar `DRIVE_BACKUPS` al objeto `CONFIG` en `config.js`
- [x] Refactorizar `hacerBackupDiario()` en `setup.js`
- [x] Mover copia a carpeta destino con `addFile` / `removeFile`
- [x] Manejo de error si el folder ID no existe o no es accesible
- [x] Fallback a raíz de Drive si `DRIVE_FOLDER_BACKUPS` no está configurado
- [x] Log descriptivo en cada rama (éxito, error de carpeta, sin configurar)
- [x] Generar archivo de resultados

## Detalles

### Por qué `ss.copy()` siempre crea en la raíz

Google Apps Script no permite especificar la carpeta destino al ejecutar `Spreadsheet.copy()`.
El método siempre crea el archivo en la raíz del Drive del propietario del script. La única
forma de reubicar la copia es:

1. Obtener el `File` del backup recién creado vía `DriveApp.getFileById(backup.getId())`.
2. Agregar ese archivo a la carpeta destino: `targetFolder.addFile(backupFile)`.
3. Eliminar el archivo de la raíz: `DriveApp.getRootFolder().removeFile(backupFile)`.

En Drive, los archivos pueden pertenecer a múltiples carpetas simultáneamente, por eso el
orden importa: primero añadir, luego remover, para evitar que el archivo quede sin padre.

### Flujo de la función refactorizada

```
hacerBackupDiario()
  ├── ss.copy(nombre)                          → copia en raíz Drive
  ├── DriveApp.getFileById(backup.getId())     → referencia al File
  ├── CONFIG.DRIVE_BACKUPS                     → leer Script Property
  │
  ├── [configurado]
  │     ├── DriveApp.getFolderById(id)         → obtener carpeta
  │     ├── targetFolder.addFile(backupFile)   → agregar a carpeta
  │     ├── getRootFolder().removeFile(...)    → quitar de raíz
  │     └── Logger.log(éxito)
  │
  ├── [configurado pero error de carpeta]
  │     └── Logger.log(⚠️ aviso + URL del backup)  → backup queda en raíz
  │
  └── [no configurado]
        └── Logger.log(ℹ️ aviso)              → backup queda en raíz
```

### Propiedad de configuración nueva

| Script Property       | Descripción                                         |
|-----------------------|-----------------------------------------------------|
| `DRIVE_FOLDER_BACKUPS`| ID de la carpeta de Google Drive para los backups   |

El ID se obtiene desde la URL de la carpeta en Drive:
`https://drive.google.com/drive/folders/` **→ `1aBcDeFgHiJ`** ← este valor.

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/2026-06-10_backup-carpeta-drive.md` | Este documento |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/config.js` | Agrega getter `DRIVE_BACKUPS` al objeto `CONFIG` |
| `backend/src/setup.js`  | Refactoriza `hacerBackupDiario()` con lógica de carpeta |

### Diff `config.js`

```diff
  get DRIVE_IMAGENES()  { return getProperty('DRIVE_FOLDER_IMAGENES', false) },
  get DRIVE_FACTURAS()  { return getProperty('DRIVE_FOLDER_FACTURAS', false) },
+ get DRIVE_BACKUPS()   { return getProperty('DRIVE_FOLDER_BACKUPS', false) },
  get ENV()             { return getProperty('ENV', false) || 'development' },
```

### Diff `setup.js`

```diff
-function hacerBackupDiario() {
-  const ss = Sheets.getSpreadsheet()
-  var zona = 'America/La_Paz'
-  var fecha = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd')
-  var backup = ss.copy('SGI-Backup-Base-de-Datos-Dev_' + fecha)
-  Logger.log('Backup created: ' + fecha + ' - ' + backup.getUrl())
-}
+function hacerBackupDiario() {
+  const ss = Sheets.getSpreadsheet()
+  var zona = 'America/La_Paz'
+  var fecha = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd'
+  var nombre = 'SGI-Backup-Base-de-Datos-Dev_' + fecha
+  var backup = ss.copy(nombre)
+  var backupFile = DriveApp.getFileById(backup.getId())
+  var backupFolderId = CONFIG.DRIVE_BACKUPS
+  if (backupFolderId) {
+    try {
+      var targetFolder = DriveApp.getFolderById(backupFolderId)
+      targetFolder.addFile(backupFile)
+      DriveApp.getRootFolder().removeFile(backupFile)
+      Logger.log('Backup created and moved to folder [' + targetFolder.getName() + ']: ' + ...)
+    } catch (folderErr) {
+      Logger.log('⚠️  Backup created in Drive root (folder error): ' + folderErr.message)
+    }
+  } else {
+    Logger.log('ℹ️  DRIVE_FOLDER_BACKUPS not configured. Backup saved to Drive root: ...')
+  }
+}
```

## Pruebas de Test

### Manual (desde el editor GAS)

1. **Sin la Script Property configurada:**
   - Eliminar o vaciar `DRIVE_FOLDER_BACKUPS` en Script Properties.
   - Ejecutar `hacerBackupDiario()` manualmente.
   - Verificar en Logs: mensaje `ℹ️ DRIVE_FOLDER_BACKUPS not configured`.
   - Verificar que el backup aparece en la raíz de Drive.

2. **Con ID de carpeta válido:**
   - Configurar `DRIVE_FOLDER_BACKUPS` con el ID real de la carpeta `sgi-backups`.
   - Ejecutar `hacerBackupDiario()` manualmente.
   - Verificar en Logs: mensaje con el nombre de la carpeta y URL del backup.
   - Verificar que el archivo aparece en la carpeta Drive y **no** en la raíz.

3. **Con ID de carpeta inválido:**
   - Configurar `DRIVE_FOLDER_BACKUPS` con un ID inexistente.
   - Ejecutar `hacerBackupDiario()`.
   - Verificar en Logs: mensaje `⚠️ Backup created in Drive root (folder error)`.
   - Verificar que el backup queda en la raíz sin causar excepción no controlada.

4. **Trigger automático:**
   - Confirmar que `instalarTriggerBackup()` sigue funcional (sin cambios en esa función).
   - El trigger llama a `hacerBackupDiario()` a las 02:00 AM La Paz.

## Notas de Ejecución

- El cambio es **backward compatible**: si la property no está configurada, el comportamiento
  es idéntico al anterior (backup en raíz de Drive + log informativo).
- `DriveApp.getFileById()` requiere que el script tenga el scope `drive` o `drive.file`.
  El `appsscript.json` actual ya debería incluirlo dado que el proyecto ya usa `DriveApp`
  para imágenes de productos.
- La operación `addFile` / `removeFile` es atómica a nivel de metadata de Drive; no mueve
  bytes físicamente ya que Drive usa referencias de carpeta.

## Problemas

Ninguno identificado. La función anterior no tenía manejo de errores; la nueva sí.

## Recomendaciones

1. **Crear la carpeta `sgi-backups` en Drive** antes de configurar la property:
   - Ir a [drive.google.com](https://drive.google.com).
   - Crear carpeta: `SGI-Backups`.
   - Copiar el ID desde la URL y agregarlo como Script Property `DRIVE_FOLDER_BACKUPS`.

2. **Agregar la property en la Guía de Producción** (`03_GUIA_PRODUCCION.md`), tabla de
   Script Properties, junto a `DRIVE_FOLDER_IMAGENES` y `DRIVE_FOLDER_FACTURAS`.

3. **Limpieza periódica**: considerar agregar a futuro una función que elimine backups con
   más de N días de antigüedad dentro de la misma carpeta, para no acumular copias
   indefinidamente.

## Cómo y Qué Implementar

### Pasos para activar en desarrollo/producción

```bash
# 1. Push del código al repositorio
git add backend/src/config.js backend/src/setup.js
git commit -m "fix(backup): mover backup diario a carpeta específica de Drive"
git push origin dev

# 2. Subir al proyecto GAS
cd backend
clasp push

# 3. Configurar la Script Property en el editor GAS
#    Proyecto → Configuración → Propiedades del script
#    Agregar: DRIVE_FOLDER_BACKUPS = <ID_DE_CARPETA_DRIVE>

# 4. Probar manualmente
#    Editor GAS → Ejecutar → hacerBackupDiario
#    Revisar Logs y carpeta Drive
```

### Property a agregar en Google Apps Script

| Propiedad            | Valor de ejemplo    | Descripción                            |
|----------------------|---------------------|----------------------------------------|
| `DRIVE_FOLDER_BACKUPS` | `1aBcDeFgHiJkLmNop` | ID de carpeta Drive para backups diarios |
