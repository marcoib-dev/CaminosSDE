# Caminos Rurales SDE

Sistema de apoyo a la toma de decisiones sobre los caminos rurales de Santiago del Estero.

Este repositorio contiene el **backend** (API REST) y el **frontend** (mapa público, edición y panel de administración).

## Stack

- Node.js 22+ con Express 5 y ES Modules. La importación de `.gpkg` usa `better-sqlite3` 13 (dependencia de `@ngageoint/geopackage`), que requiere Node 22 o superior.
- PostgreSQL (Neon o un contenedor Docker en producción) con Prisma ORM.
- Autenticación con JWT y bcrypt.
- Validación de datos con zod.
- Cálculo y división de geometrías con `@turf/turf`.
- Importación de relevamientos: lectura de `.gpkg` con `@ngageoint/geopackage`, de `.kml` con `@tmcw/togeojson`, reproyección con `proj4` y subida multipart con `multer`.
- Geometrías guardadas como **GeoJSON `LineString`** en columnas `Json` (sin PostGIS).
- Frontend con React 18, Vite, React Router, Tailwind CSS y Leaflet/React-Leaflet, con `react-leaflet-cluster` para agrupar los puntos de interés del mapa.

## Estructura

```text
docker-compose.yaml        PostgreSQL local para desarrollo
docker-compose.prod.yaml   Stack completo para producción (Nginx, API y PostgreSQL)
.env.produccion.example    Variables del despliegue con Docker

backend/
  prisma/
    schema.prisma        Modelos y enums
    seed.js              Usuario ADMIN inicial y caminos de ejemplo
    migrations/          Migraciones de Prisma
  src/
    config/              Variables de entorno y cliente Prisma
    controllers/         Lógica de cada endpoint
    middleware/          Autenticación, roles, validación, errores y rate limit
    routes/              Definición de rutas
    services/            Auditoría, lógica de tramos, prioridad e importación
    utils/               GeoJSON, errores y utilidades
    validators/          Esquemas zod
    app.js               Aplicación Express
    server.js            Arranque del servidor
  ejemplos/              Archivos .kml y .gpkg de prueba para importar
  scripts/               Generador de los archivos de ejemplo
  Dockerfile             Imagen de la API para producción

frontend/
  src/
    components/          Encabezado, mapa, filtros, leyenda, popups y formularios
    components/editor/   Herramientas de dibujo, formularios y panel de edición
    components/importacion/  Mapa de previsualización y filas de importación
    constants/           Estados, superficies, colores y categorías de puntos de interés
    context/             Tema, sesión (JWT) y categorías de puntos de interés
    pages/               Mapa, ranking, login, perfil, sugerencias, importación y administración
    services/api.js      Cliente de la API (VITE_API_URL)
    services/token.js    Lectura y escritura del token en localStorage
    utils/               Formatos, niveles de prioridad y geometría
    App.jsx              Rutas de React Router y protección por rol
    main.jsx             Punto de entrada
  index.html
  tailwind.config.js
  Dockerfile             Build de Vite + Nginx
  nginx.conf             Rutas de React Router y proxy /api/ al backend
```

## Requisitos

- Node.js 22 o superior.
- Una base de datos PostgreSQL accesible (local, Docker o Neon).
- Docker Desktop instalado y en ejecución si vas a usar la base local con Docker.

### Base de datos local con Docker

El archivo `docker-compose.yaml` de la raíz levanta PostgreSQL 16 en `localhost:5432` con las credenciales de desarrollo:

| Variable | Valor por defecto |
|---|---|
| Usuario | `postgres` |
| Contraseña | `postgres` |
| Base de datos | `caminos_rurales` |

Iniciar el contenedor:

```bash
docker compose -f docker-compose.yaml up -d
```

Verificar que esté saludable:

```bash
docker compose -f docker-compose.yaml ps
```

Detenerlo sin borrar los datos:

```bash
docker compose -f docker-compose.yaml down
```

Borrar también el volumen con los datos (útil para reiniciar desde cero):

```bash
docker compose -f docker-compose.yaml down -v
```

Los valores por defecto coinciden con `backend/.env.example`. Si cambiás las credenciales, definí `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT` en un `.env` en la raíz del proyecto (ignorado por git) y actualizá `DATABASE_URL` en `backend/.env`.

Con la base levantada, seguí con las migraciones y el seed que se indican abajo.

## Instalación

```bash
cd backend
npm install
```

Crear el archivo de variables de entorno:

```powershell
# Windows / PowerShell
Copy-Item .env.example .env
```

```bash
# Linux / macOS
cp .env.example .env
```

Editar `.env`, completar `DATABASE_URL`, `JWT_SECRET` y las variables `ADMIN_*`. Luego aplicar migraciones y cargar los datos de ejemplo:

```bash
npx prisma migrate dev --name init
npm run seed
```

Iniciar la API:

```bash
npm run dev
```

La API queda disponible en `http://localhost:3000/api`. Verificación rápida:

```bash
curl http://localhost:3000/api/health
```

### Frontend

En otra terminal:

```bash
cd frontend
npm install
```

Crear el archivo de variables de entorno y verificar la URL de la API:

```powershell
# Windows / PowerShell
Copy-Item .env.example .env
```

```bash
# Linux / macOS
cp .env.example .env
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. El mapa público se abre en `/`, el ranking en `/prioridades` y el ingreso en `/login`.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL. En Neon incluir `?sslmode=require`. |
| `JWT_SECRET` | Sí | Clave aleatoria de al menos 32 caracteres para firmar los tokens JWT. |
| `JWT_EXPIRES_IN` | No | Vigencia del token. Por defecto `1d`. |
| `NODE_ENV` | No | `development` o `production`. En producción activa `trust proxy` para el rate limit detrás de Nginx o de un túnel. |
| `PORT` | No | Puerto HTTP. Por defecto `3000`. |
| `FRONTEND_URL` | No | Origen permitido por CORS. Admite varios separados por coma. En desarrollo también se aceptan `http://localhost:<puerto>`. |
| `ADMIN_NOMBRE` | No | Nombre del administrador inicial. Por defecto `Administrador`. |
| `ADMIN_EMAIL` | Sí (seed) | Email del administrador inicial. |
| `ADMIN_PASSWORD` | Sí (seed) | Contraseña del administrador inicial. |
| `PRIORIDAD_UMBRAL_KM` | No | Distancia máxima en km para sumar puntos por cercanía a puntos de interés. Por defecto `1`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | No | Necesarias para subir fotos. Sin ellas, `POST /api/fotos/firma` responde `503`. |

El archivo `.env` nunca debe commitearse. `.env.example` no contiene secretos reales.

El frontend usa una única variable, definida en `frontend/.env`:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | No | URL base de la API, incluido `/api`. Por defecto `http://localhost:3000/api`. En el despliegue con Docker se deja en `/api`, porque Nginx redirige esa ruta al backend. |

En el despliegue con Docker las variables del backend se definen en `.env.produccion`; ver [Despliegue con Docker](#despliegue-con-docker).

### Scripts

Backend:

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia la API con reinicio automático. |
| `npm start` | Inicia la API en modo producción. |
| `npm run prisma:generate` | Genera el cliente de Prisma. |
| `npm run prisma:migrate` | Ejecuta `prisma migrate dev`. |
| `npm run prisma:studio` | Abre Prisma Studio. |
| `npm run seed` | Crea el ADMIN inicial y las categorías base. Con `SEED_SIN_DEMO=true` omite los 3 caminos y 3 puntos de ejemplo. |
| `npm run ejemplos:importacion` | Regenera los archivos `.kml` y `.gpkg` de `ejemplos/` para probar la importación. |
| `npm run puntos:importar -- --archivo <ruta>` | Importa hospitales, escuelas y UPAs desde GeoJSON o KML. Ver [Importar hospitales y escuelas](#importar-hospitales-y-escuelas). |

Frontend:

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia Vite en modo desarrollo. |
| `npm run build` | Genera la compilación de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de producción. |

## Despliegue con Docker

`docker-compose.prod.yaml` levanta la aplicación completa en un servidor:

| Servicio | Imagen / build | Función |
|---|---|---|
| `frontend` | `frontend/Dockerfile` (Node 22 + Nginx unprivileged) | Compila React y sirve `dist/`. Publica `HTTP_PORT` (80 por defecto) **solo en `127.0.0.1`** y redirige `/api/` al backend. |
| `backend` | `backend/Dockerfile` (Node 22) | API Express. Al arrancar aplica las migraciones de Prisma y luego inicia el servidor. No publica puertos: solo es accesible desde la red interna. |
| `postgres` | `postgres:16-alpine` | Base de datos con el volumen `postgres_data`. No publica puertos. |

El frontend y la API quedan bajo el **mismo origen** (`https://tu-dominio.com/api/...`), así que no hay que configurar CORS entre dominios distintos ni exponer el backend a internet.

### Requisitos del servidor

- Docker Engine 24 o superior con Docker Compose v2 (`docker compose version`).
- **2 GB de RAM** como mínimo y 4 GB recomendados. La importación de `.gpkg` trabaja en memoria y el build del frontend consume cerca de 1 GB.
- **20 GB de disco**. Las fotos no se guardan en el servidor: van a Cloudinary.
- No hace falta abrir 80 ni 443: con Cloudflare Tunnel el tráfico sale del servidor hacia Cloudflare. Si publicás el sitio directamente, abrí esos puertos.
- No hace falta instalar Node.js ni PostgreSQL en el host: todo corre en contenedores.

### 1. Preparar las variables

```bash
cp .env.produccion.example .env.produccion
```

Editar `.env.produccion`:

| Variable | Detalle |
|---|---|
| `POSTGRES_PASSWORD` | Contraseña larga. Usá solo letras, números y guiones: se inserta dentro de `DATABASE_URL` y los caracteres `@ : / #` la rompen. |
| `JWT_SECRET` | 32 caracteres o más, aleatorios. Generarlo con `openssl rand -hex 32`. |
| `FRONTEND_URL` | Origen público exacto, por ejemplo `https://caminos.example.gob.ar`. Si no coincide con el dominio real, las peticiones con `Origin` (login, altas, ediciones) se rechazan por CORS. Acepta varios orígenes separados por coma, por ejemplo `http://192.168.1.36,http://ServerDebian.local`. |
| `ADMIN_NOMBRE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciales del administrador que crea el seed. |
| `SEED_SIN_DEMO` | `true` para crear solo el ADMIN y las categorías base, sin caminos ni puntos de ejemplo. |
| `CLOUDINARY_*` | Sin estos valores la API responde `503` al firmar subidas de fotos. |
| `BIND_HOST` | Interfaz donde Nginx escucha. `127.0.0.1` por defecto (túnel/proxy en el mismo host); para un proxy externo, la IP privada del servidor o `0.0.0.0` con firewall. |
| `HTTP_PORT` | Puerto del host donde Nginx escucha. 80 por defecto; el contenedor escucha en 8080. |
| `VITE_API_URL` | Dejar en `/api`: se compila dentro del frontend y Nginx lo redirige al backend. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Solo si cloudflared corre como servicio de Compose (perfil `tunnel`). Si corre en el host, dejàlo vacío. |

`.env.produccion` está ignorado por git y no debe commitearse.

### 2. Construir y levantar

```bash
docker compose --env-file .env.produccion -f docker-compose.prod.yaml up -d --build
```

La primera construcción descarga dependencias y puede tardar unos minutos. El backend ejecuta `prisma migrate deploy` en cada arranque, así que las migraciones se aplican solas.

Verificar que los servicios estén sanos:

```bash
docker compose --env-file .env.produccion -f docker-compose.prod.yaml ps
docker compose --env-file .env.produccion -f docker-compose.prod.yaml logs -f backend
```

`postgres` y `backend` deben figurar como `healthy`. Como Nginx solo escucha en loopback, probá desde el servidor con `http://localhost:<HTTP_PORT>` o entrá por el dominio del túnel. Para comprobar la API:

```bash
curl http://localhost/api/health
```

Si cambiaste `HTTP_PORT`, usá `curl http://localhost:<HTTP_PORT>/api/health`.

### 3. Crear el administrador inicial

```bash
docker compose --env-file .env.produccion -f docker-compose.prod.yaml exec backend npm run seed
```

El seed es idempotente: se puede volver a ejecutar sin duplicar datos. Con `SEED_SIN_DEMO=true` crea el ADMIN y las categorías base; con `false` agrega además 3 caminos y 3 puntos de ejemplo. Después del primer ingreso, cambiá la contraseña desde `/perfil`.

### 4. Actualizar el proyecto

```bash
git pull
docker compose --env-file .env.produccion -f docker-compose.prod.yaml up -d --build
```

Se recompila el frontend y se recrean solo los contenedores cuya imagen cambió; las migraciones nuevas se aplican al reiniciar el backend. Recordá que `VITE_API_URL` se congela en el build: si la cambiás, hay que reconstruir el frontend.

### Acceso remoto con Cloudflare Tunnel

Con la configuración por defecto (`BIND_HOST=127.0.0.1`), el frontend se publica **solo en loopback** y la LAN no puede llegar a Nginx: el único camino es cloudflared. Hay dos formas de correr el túnel:

> **Antes de desplegar esta versión**, configurá el túnel o una VPN. Si el sitio se accedía por la IP de la LAN, al aplicar el cambio deja de ser accesible desde otras máquinas hasta que cloudflared esté funcionando.

1. **cloudflared instalado en el host (recomendado si ya lo tenés).** El ingress del túnel debe apuntar a `http://localhost:${HTTP_PORT}` (por defecto `http://localhost:80`). El servicio se administra con systemd, fuera de Compose.
2. **cloudflared como servicio de Compose.** Completá `CLOUDFLARE_TUNNEL_TOKEN` en `.env.produccion`, configurá el ingress del túnel hacia `http://frontend:8080` y arrancá con el perfil `tunnel`:

   ```bash
   docker compose --env-file .env.produccion -f docker-compose.prod.yaml --profile tunnel up -d
   ```

En ambos casos Cloudflare termina TLS y el tramo cloudflared → Nginx viaja cifrado por el túnel. `FRONTEND_URL` debe ser el origen público exacto con `https://` (por ejemplo `https://caminos.example.gob.ar`); si no coincide, CORS rechaza el login y las escrituras.

Nginx toma la IP real del cliente de `CF-Connecting-IP` y la envía al backend en `X-Forwarded-For` (sobrescribiéndolo, no concatenándolo). Si no hay `CF-Connecting-IP`, usa el último IP de `X-Forwarded-For`; si tampoco hay cabecera, usa la IP del socket. El backend confía en un solo proxy, así que los rate limits y la auditoría usan la IP del cliente y no la del túnel. No agregues HSTS hasta que el dominio definitivo funcione por HTTPS: los túneles rápidos (`trycloudflare.com`) cambian de nombre.

### Proxy propio o servidor del instituto

El contenedor sirve HTTP y no depende de Cloudflare. Para publicarlo con el proxy/TLS del instituto:

1. Ajustá `BIND_HOST`:
   - `127.0.0.1` si el proxy corre en el mismo host (Caddy, Nginx o Traefik).
   - La IP privada del servidor o `0.0.0.0` si el proxy está en otra máquina o contenedor. Restringí el puerto por firewall para que solo el proxy llegue.
2. Si el proxy corre en el host, usá `HTTP_PORT=8080` (u otro puerto libre) para no chocar con el 80/443 que necesita el proxy para TLS.
3. Poné `FRONTEND_URL` con el origen público exacto, por ejemplo `https://caminos.instituto.edu.ar`.
4. Asegurate de que el proxy envíe `X-Forwarded-For` con la IP del cliente. Nginx usa el último IP de la cadena; si hay varios proxies, el inmediato debe sobrescribirla con `$remote_addr` para no arrastrar valores del cliente.
5. No levantes el perfil `tunnel` ni configures `CLOUDFLARE_TUNNEL_TOKEN`.

| Escenario | `BIND_HOST` | `HTTP_PORT` | Detalle |
|---|---|---|---|
| Proxy en el mismo host (Caddy/Nginx/Traefik) | `127.0.0.1` | `8080` | El proxy administra 80/443. |
| Proxy en otra máquina o contenedor | IP privada del servidor | `8080` | Firewall: solo el proxy debe llegar. |
| Cloudflare Tunnel con cloudflared en el host | `127.0.0.1` | `80` u `8080` | cloudflared apunta a localhost. |
| cloudflared como servicio de Compose | `127.0.0.1` | `80` (solo depuración) | Usa `frontend:8080` por la red interna. |

Ejemplo con Caddy en el mismo host:

```caddy
caminos.instituto.edu.ar {
    reverse_proxy 127.0.0.1:8080
}
```

La app se sirve en la **raíz del dominio**. Si el instituto la publica en un subpath (`https://.../caminos/`), hay que agregar soporte de base path en Vite, React Router y Nginx; conviene pedir un subdominio.

El mapa usa tiles de OpenStreetMap, las fuentes vienen de Google Fonts y las fotos van a Cloudinary. Si el servidor del instituto no tiene salida a internet, hay que self-hostear tiles y fuentes o usar un proxy, y definir otro almacenamiento para las fotos. El build de Docker también necesita npm, Docker Hub y los repositorios de Debian, salvo que lleves las imágenes ya construidas.

Si el instituto provee una base PostgreSQL administrada, se cambia `DATABASE_URL` en el compose o en un archivo de override; el resto del despliegue no cambia.

### Copias de seguridad

El repo incluye `scripts/backup-postgres.sh` (dump comprimido, verificación de gzip, retención y copia opcional con rclone) y `scripts/restaurar-postgres.sh`.

```bash
# Backup manual
scripts/backup-postgres.sh

# Cron diario a las 03:15
15 3 * * * $HOME/CaminosSDE/scripts/backup-postgres.sh >> $HOME/backups/backup.log 2>&1

# Restauración (reemplaza todos los datos)
scripts/restaurar-postgres.sh $HOME/backups/caminos/caminos-2026-10-23_031500.sql.gz --confirmar
```

Variables opcionales: `BACKUP_DIR` (por defecto `~/backups/caminos`), `RETENCION_DIAS` (30), `ENV_FILE`, `RCLONE_REMOTE`. Probá una restauración al menos una vez por trimestre: un backup que nunca se restauró no sirve.

El backup cubre solo PostgreSQL. Guardá aparte una copia de `.env.produccion` (secretos) y tené en cuenta que las fotos viven en Cloudinary, no en el servidor.

#### Copia en una PC con Windows (modelo pull)

`scripts/backup-remoto.ps1` ejecuta el backup en el servidor por SSH y se trae el `.sql.gz` a esta PC, donde queda una segunda copia. No abre puertos en Windows: la conexión sale de la PC hacia el servidor y usa la clave SSH, sin contraseña.

```powershell
# Ejecución manual
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-remoto.ps1

# Tarea diaria a las 13:00 (ejecutar una vez)
$script = Join-Path $PWD 'scripts\backup-remoto.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $PWD
$trigger = New-ScheduledTaskTrigger -Daily -At 13:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName 'CaminosSDE - Backup diario' -Action $action -Trigger $trigger -Settings $settings -Force
```

Parámetros: `-Servidor` (por defecto `ServerDebian.local`, que se resuelve por mDNS y sobrevive a un cambio de IP del servidor), `-Usuario`, `-Destino` (por defecto `D:\Proyectos de python\BACKUPS\CaminosRurales`) y `-RetencionDias` (60). Si la red bloquea mDNS, pasá la IP con `-Servidor 192.168.1.36`. Deja un `backup.log` en el destino, valida el gzip antes de aceptarlo y descarta el archivo si llegó truncado. La tarea corre solo con la PC encendida; `-StartWhenAvailable` la ejecuta al iniciar si se perdió el horario. El servidor conserva además su propia copia con retención de 30 días.

El script debe guardarse en **UTF-8 con BOM**: PowerShell 5.1 lee los `.ps1` sin BOM como ANSI y rompe los acentos.

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml logs -f frontend backend` | Sigue los logs del frontend y la API. |
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml restart backend` | Reinicia la API. |
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml down` | Detiene el stack y conserva la base. |
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml down -v` | Detiene el stack y **borra la base de datos**. |
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml exec postgres psql -U caminos -d caminos_rurales` | Abre la consola SQL. |
| `docker compose --env-file .env.produccion -f docker-compose.prod.yaml --profile tunnel up -d` | Levanta también cloudflared como contenedor. |
| `scripts/backup-postgres.sh` | Genera un backup comprimido y aplica la retención. |
| `powershell -File scripts\backup-remoto.ps1` | Trae el backup del servidor a `D:\Proyectos de python\BACKUPS\CaminosRurales`. |

### Notas

- **Una sola instancia del backend**: el límite de sugerencias (5 cada 15 minutos) se guarda en memoria del proceso. Con varias réplicas, cada una lleva su propio contador.
- **Tamaño de las subidas**: Nginx acepta hasta 30 MB (`frontend/nginx.conf`) para cubrir el `.gpkg` de 25 MB y el JSON de confirmación de 10 MB. Si cambiás esos límites en el backend, actualizá también Nginx.
- **Importación pesada**: es síncrona y consume RAM. En un servidor de 2 GB, evitá importar varios archivos grandes a la vez.
- **Sin volumen para fotos**: las imágenes se guardan en Cloudinary; en la base solo queda la URL.
- **Puertos internos**: `postgres` y `backend` no se publican al host. El frontend se publica en `BIND_HOST:${HTTP_PORT}` (`127.0.0.1` por defecto); el acceso externo pasa por cloudflared o por el proxy institucional.
- **Hardening de contenedores**: backend y frontend con `no-new-privileges`, `cap_drop: ALL` y `read_only`. El frontend usa la imagen unprivileged de Nginx (UID 101, puerto 8080). PostgreSQL conserva las capabilities de inicialización del volumen, pero con `no-new-privileges`.
- **Cabeceras de seguridad**: el backend envía las cabeceras de Helmet (sin CSP ni HSTS). Nginx agrega `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y la CSP, que solo permite el propio origen, Google Fonts, los tiles de OpenStreetMap y Cloudinary. El script de tema es externo (`public/tema.js`) para no necesitar `'unsafe-inline'` en `script-src`.

## Endurecimiento del servidor

Pasos manuales en el host Debian. No los ejecuta la aplicación y conviene probar cada uno desde otra terminal antes de cerrar la sesión actual.

### SSH

```bash
# En tu PC: generar clave y copiarla al servidor
ssh-keygen -t ed25519 -C "usuario@homelab"
ssh-copy-id usuario@servidor

# Probar la clave ANTES de desactivar la contraseña
ssh -o PreferredAuthentications=publickey usuario@servidor 'echo ok'
```

En `/etc/ssh/sshd_config.d/99-hardening.conf`:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 4
```

```bash
sudo systemctl reload ssh
```

Rotá también la contraseña de SSH y la de `sudo` si son la misma.

### fail2ban y actualizaciones automáticas

```bash
sudo apt install fail2ban unattended-upgrades
sudo systemctl enable --now fail2ban
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Firewall

```bash
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <red-lan>/24 to any port 22 proto tcp
sudo ufw enable
```

UFW no filtra los puertos publicados por Docker. El frontend ya queda solo en loopback; para Portainer, Jellyfin y otros contenedores usá la cadena `DOCKER-USER`:

```bash
sudo iptables -I DOCKER-USER -i <interfaz> ! -s <red-lan>/24 -j DROP
```

Revisá la interfaz con `ip route` y probá el acceso remoto antes de dejarlo permanente.

### Netdata y paneles

- Netdata: `bind to = 127.0.0.1` en `/etc/netdata/netdata.conf` y `sudo systemctl restart netdata`, o accedé por túnel SSH (`ssh -L 19999:127.0.0.1:19999 usuario@servidor`).
- Portainer y Jellyfin: solo LAN o VPN, con autenticación activa.

## Autenticación

- Los endpoints protegidos esperan el encabezado `Authorization: Bearer <token>`.
- El token se obtiene con `POST /api/auth/login` y dura 1 día (`JWT_EXPIRES_IN=1d`).
- Un usuario desactivado no puede autenticarse ni seguir usando un token emitido previamente.
- Cada usuario tiene un `tokenVersion`: al cambiar la contraseña o al desactivar la cuenta, los tokens anteriores dejan de ser válidos. `POST /api/auth/change-password` devuelve un token nuevo para que la sesión actual continúe.
- Las contraseñas se guardan con bcrypt (12 rondas). Los hashes creados con el costo anterior se actualizan de forma transparente en el primer login exitoso. La política exige al menos 8 caracteres y rechaza las contraseñas más comunes, las que repiten un solo carácter y las iguales al email.
- Rate limits: 300 requests por IP cada 15 minutos en toda la API, 10 intentos fallidos de login por IP + email cada 15 minutos (30 por IP), 20 consultas por minuto a `/api/tramos/prioridad` y 5 sugerencias cada 15 minutos por IP.
- Roles: `ADMIN` y `EDITOR`. El rol lector no requiere login.
- En el frontend el token se guarda en `localStorage` (`caminos-rurales-token`). Al iniciar la aplicación se valida con `GET /api/auth/me`; si el token expiró, el usuario fue desactivado o la sesión fue revocada, se cierra la sesión automáticamente.
- Las rutas `/perfil` y `/sugerencias` requieren sesión (la segunda, rol EDITOR o ADMIN). `/usuarios` y `/auditoria` requieren rol ADMIN.

Los errores tienen este formato:

```json
{
  "mensaje": "Datos inválidos.",
  "detalles": [
    { "campo": "nombre", "mensaje": "El nombre es obligatorio." }
  ]
}
```

## Convenciones de la API

- Respuestas exitosas: `{ "datos": ... }` para un recurso o listado, y `{ "mensaje": "..." }` para confirmaciones.
- Listados: `{ "datos": [...] }`.
- Coordenadas **siempre** en GeoJSON: `[longitud, latitud]` (EPSG:4326).
- Fechas en formato ISO 8601.
- Los ids son cadenas generadas con `cuid()`.

### Enums

| Enum | Valores |
|---|---|
| Rol | `ADMIN`, `EDITOR` |
| Estado del tramo | `TRANSITABLE`, `REGULAR`, `INTRANSITABLE`, `EN_OBRA` |
| Tipo de superficie | `TIERRA`, `RIPIO`, `ENRIPIADO_MEJORADO`, `PAVIMENTADO` |
| Categoría de punto de interés | Texto libre definido en `CategoriaPunto`. Las categorías base son `HOSPITAL`, `ESCUELA` y `UPA`; los editores pueden crear otras. |
| Estado de sugerencia | `PENDIENTE`, `REVISADA`, `DESCARTADA` |
| Acción de auditoría | `CREAR`, `EDITAR`, `BORRAR` |

## Endpoints

**Roles:** Público = sin login · Autenticado = cualquier usuario activo · EDITOR = `EDITOR` o `ADMIN` · ADMIN = solo `ADMIN`.

| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| GET | `/api/health` | Público | — | `200 { estado: "ok", fecha }` |
| GET | `/api/caminos` | Público | — (query: `q`, `departamento`, `activo`, `pagina`, `limite`) | `200 { datos: Camino[], paginacion }` con `tramos` y `fotos` |
| GET | `/api/caminos/mapa` | Público | — | `200 { datos: Camino[] }` solo activos, con `tramos`, `fotos` y sin timestamps |
| GET | `/api/caminos/:id` | Público | — | `200 { datos: Camino }` con `tramos` y `fotos` · `404` |
| GET | `/api/tramos` | Público | — (query: `caminoId`, `estado`, `tipo`, `departamento`, `pagina`, `limite`) | `200 { datos: Tramo[], paginacion }` con datos básicos del camino |
| GET | `/api/tramos/prioridad` | Público · máx. 20 por minuto por IP | — | `200 { datos: TramoConPrioridad[] }` ordenados de mayor a menor puntaje (cacheado 60 s) · `429` |
| GET | `/api/puntos-interes` | Público | — (query: `categoria`, `pagina`, `limite`) | `200 { datos: PuntoInteres[], paginacion }` |
| GET | `/api/categorias-puntos` | Público | — | `200 { datos: CategoriaPunto[] }` con `totalPuntos` |
| POST | `/api/sugerencias` | Público · máx. 5 cada 15 min por IP | `{ texto, contacto?, caminoId?, tramoId? }` | `201 { datos: { id, estado, creadoEn }, mensaje }` · `429` |
| POST | `/api/auth/login` | Público · máx. 10 fallos por IP + email cada 15 min | `{ email, password }` | `200 { datos: { token, usuario } }` · `401` · `429` |
| GET | `/api/auth/me` | Autenticado | — | `200 { datos: Usuario }` · `401` |
| POST | `/api/auth/change-password` | Autenticado | `{ passwordActual, passwordNueva }` | `200 { datos: { token }, mensaje }` · `400` |
| POST | `/api/caminos` | EDITOR | `{ nombre, localidad, departamento, descripcion?, activo? }` | `201 { datos: Camino, mensaje }` |
| POST | `/api/caminos/importar` | EDITOR | Multipart: `archivo` (.kml/.gpkg) y `mapeo` opcional (JSON en texto) | `200 { datos: PrevisualizacionImportacion }` · `400` · `413` |
| POST | `/api/caminos/importar/confirmar` | EDITOR | `{ features: [...], mapeo? }` | `201 { datos: { resumen, caminos, tramos }, mensaje }` · `400` / `404` |
| PATCH | `/api/caminos/:id` | EDITOR | Cualquier subconjunto de los campos anteriores | `200 { datos: Camino, mensaje }` · `404` |
| DELETE | `/api/caminos/:id` | EDITOR | — | `200 { mensaje }` · `404` |
| POST | `/api/tramos` | EDITOR | `{ caminoId, geometria, estado, tipo, observaciones? }` | `201 { datos: Tramo, mensaje }` · `404` si el camino no existe |
| PATCH | `/api/tramos/:id` | EDITOR | Cualquier subconjunto de `{ caminoId, geometria, estado, tipo, observaciones }` | `200 { datos: Tramo, mensaje }` · `404` |
| PATCH | `/api/tramos/:id/dividir` | EDITOR | `{ desde, hasta, estado?, tipo?, observaciones? }` | `200 { datos: Tramo[] (2 o 3 segmentos), mensaje }` · `400` / `404` |
| GET | `/api/tramos/:id/historial` | EDITOR | — | `200 { datos: HistorialTramo[] }` con usuario · `404` |
| DELETE | `/api/tramos/:id` | EDITOR | — | `200 { mensaje }` · `404` |
| POST | `/api/puntos-interes` | EDITOR | `{ nombre, categoria, latitud, longitud }` | `201 { datos: PuntoInteres, mensaje }` · `400` si la categoría no existe |
| PATCH | `/api/puntos-interes/:id` | EDITOR | Cualquier subconjunto de los campos anteriores | `200 { datos: PuntoInteres, mensaje }` · `400` / `404` |
| DELETE | `/api/puntos-interes/:id` | EDITOR | — | `200 { mensaje }` · `404` |
| POST | `/api/categorias-puntos` | EDITOR | `{ nombre, color?, inicial?, peso? }` | `201 { datos: CategoriaPunto, mensaje }` · `409` si ya existe |
| DELETE | `/api/categorias-puntos/:id` | EDITOR | — | `200 { mensaje }` · `400` si es base · `409` si tiene puntos · `404` |
| POST | `/api/fotos/firma` | EDITOR | — | `200 { datos: { cloudName, apiKey, timestamp, folder, firma, urlSubida } }` · `503` si Cloudinary no está configurado |
| POST | `/api/fotos` | EDITOR | `{ url, descripcion?, caminoId, tramoId? }` | `201 { datos: Foto, mensaje }` · `400` / `404` |
| DELETE | `/api/fotos/:id` | EDITOR | — | `200 { mensaje }` · `404` |
| GET | `/api/sugerencias` | EDITOR | — (query: `estado`, `caminoId`) | `200 { datos: Sugerencia[] }` |
| PATCH | `/api/sugerencias/:id` | EDITOR | `{ estado }` | `200 { datos: Sugerencia, mensaje }` · `404` |
| GET | `/api/usuarios` | ADMIN | — | `200 { datos: Usuario[] }` |
| POST | `/api/usuarios` | ADMIN | `{ nombre, email, password }` | `201 { datos: Usuario, mensaje }` · `409` si el email existe |
| PATCH | `/api/usuarios/:id/estado` | ADMIN | `{ activo: boolean }` | `200 { datos: Usuario, mensaje }` · `400` si el usuario es ADMIN · `404` |
| GET | `/api/auditoria` | ADMIN | — (query: `accion`, `entidad`, `usuarioId`, `desde`, `hasta`, `limite`) | `200 { datos: Auditoria[], total }` |

Todos los endpoints protegidos devuelven `401` sin token válido y `403` si el rol no alcanza. Los errores de validación devuelven `400` con `detalles`.

Toda la API tiene un límite global de 300 requests por IP cada 15 minutos (`429`); `/api/health` no consume cupo. El body JSON acepta hasta 1 MB, salvo `POST /api/caminos/importar/confirmar`, que admite hasta 10 MB.

`DELETE /api/caminos/:id` es una baja definitiva (elimina en cascada sus tramos e historial). Para conservar los datos, usar `PATCH /api/caminos/:id` con `{ "activo": false }`.

Los listados de caminos, tramos y puntos de interés están paginados. `pagina` arranca en 1 y `limite` admite de 1 a 500 registros (por defecto 100). La respuesta incluye `paginacion: { pagina, limite, total, totalPaginas }`. `GET /api/caminos/mapa` no se pagina: devuelve todos los caminos activos con sus tramos para dibujar el mapa.

### Parámetros de consulta

| Endpoint | Parámetro | Descripción |
|---|---|---|
| `GET /api/caminos` | `q` | Búsqueda parcial por nombre (sin distinguir mayúsculas). |
| | `departamento` | Departamento exacto (sin distinguir mayúsculas). |
| | `activo` | `true` o `false`. |
| `GET /api/tramos` | `caminoId` | Filtra por camino. |
| | `estado` | Estado del tramo. |
| | `tipo` | Tipo de superficie. |
| | `departamento` | Departamento del camino. |
| `GET /api/puntos-interes` | `categoria` | Clave de la categoría: `HOSPITAL`, `ESCUELA`, `UPA` o una creada por un editor. |
| `GET /api/caminos`, `GET /api/tramos`, `GET /api/puntos-interes` | `pagina` | Número de página, desde 1 (por defecto 1). |
| | `limite` | Registros por página, de 1 a 500 (por defecto 100). |
| `GET /api/sugerencias` | `estado` | `PENDIENTE`, `REVISADA` o `DESCARTADA`. |
| | `caminoId` | Filtra por camino. |
| `GET /api/auditoria` | `accion` | `CREAR`, `EDITAR` o `BORRAR`. |
| | `entidad` | Nombre de la entidad (`Camino`, `Tramo`, `PuntoInteres`, `CategoriaPunto`, `Foto`, `Sugerencia`, `Usuario`). |
| | `usuarioId` | Autor de la acción. |
| | `desde`, `hasta` | Rango de fechas ISO 8601. |
| | `limite` | Cantidad máxima de registros (1 a 500, por defecto 100). El total no se limita. |

## Formato de los datos

### Camino

```json
{
  "id": "cm...",
  "nombre": "Camino rural a Los Telares",
  "localidad": "Los Telares",
  "departamento": "Salavina",
  "descripcion": "Vincula la planta urbana con los parajes del norte.",
  "activo": true,
  "creadoEn": "2026-10-19T12:00:00.000Z",
  "actualizadoEn": "2026-10-19T12:00:00.000Z",
  "tramos": [],
  "fotos": []
}
```

### Tramo

```json
{
  "id": "cm...",
  "caminoId": "cm...",
  "geometria": {
    "type": "LineString",
    "coordinates": [[-63.43, -28.989], [-63.418, -28.997]]
  },
  "longitudKm": 1.536,
  "estado": "EN_OBRA",
  "tipo": "TIERRA",
  "observaciones": "Trabajos de enripiado en ejecución.",
  "creadoEn": "2026-10-19T12:00:00.000Z",
  "actualizadoEn": "2026-10-19T12:00:00.000Z"
}
```

La `longitudKm` se calcula en el backend con turf cada vez que se crea o edita la geometría.

### Punto de interés

```json
{
  "id": "cm...",
  "nombre": "Hospital Zonal de Añatuya",
  "categoria": "HOSPITAL",
  "latitud": -28.46,
  "longitud": -62.83,
  "creadoEn": "2026-10-19T12:00:00.000Z",
  "actualizadoEn": "2026-10-19T12:00:00.000Z"
}
```

### CategoriaPunto

```json
{
  "id": "cat_hospital",
  "clave": "HOSPITAL",
  "nombre": "Hospital",
  "color": "#dc2626",
  "inicial": "H",
  "peso": 30,
  "orden": 1,
  "protegida": true,
  "creadoEn": "2026-10-19T12:00:00.000Z",
  "actualizadoEn": "2026-10-19T12:00:00.000Z",
  "totalPuntos": 1
}
```

`protegida: true` identifica las categorías base (Hospital, Escuela y UPA), que no se pueden eliminar. El `peso` es el aporte a la prioridad de los tramos cercanos y en las categorías nuevas se puede definir entre 0 y 30 (por defecto 10). La `clave` se genera a partir del nombre en mayúsculas, sin acentos y con guiones bajos.

### Foto

```json
{
  "id": "cm...",
  "url": "https://res.cloudinary.com/.../image/upload/v.../caminos-rurales-sde/foto.jpg",
  "descripcion": "Sector con anegamientos.",
  "caminoId": "cm...",
  "tramoId": "cm...",
  "creadoEn": "2026-10-19T12:00:00.000Z"
}
```

`tramoId` puede ser `null` cuando la foto pertenece solo al camino.

### HistorialTramo

```json
{
  "id": "cm...",
  "tramoId": "cm...",
  "usuarioId": "cm...",
  "usuario": { "id": "cm...", "nombre": "Editor", "email": "editor@ejemplo.com" },
  "estadoAnterior": "REGULAR",
  "tipoAnterior": "TIERRA",
  "geometriaAnterior": { "type": "LineString", "coordinates": [[-63.44, -28.98], [-63.43, -28.99]] },
  "estadoNuevo": "TRANSITABLE",
  "tipoNuevo": "ENRIPIADO_MEJORADO",
  "geometriaNuevo": { "type": "LineString", "coordinates": [[-63.44, -28.98], [-63.43, -28.99]] },
  "fecha": "2026-10-19T12:00:00.000Z"
}
```

`usuario` es `null` si la cuenta fue eliminada. Solo se registra una entrada cuando cambia el estado, el tipo o la geometría.

### Usuario

```json
{
  "id": "cm...",
  "nombre": "Editor",
  "email": "editor@ejemplo.com",
  "rol": "EDITOR",
  "activo": true,
  "creadoEn": "2026-10-19T12:00:00.000Z",
  "actualizadoEn": "2026-10-19T12:00:00.000Z"
}
```

Nunca se devuelve `passwordHash`.

## División de tramos

`PATCH /api/tramos/:id/dividir` recibe dos puntos GeoJSON:

```json
{
  "desde": [-63.441, -28.981],
  "hasta": [-63.43, -28.989],
  "estado": "TRANSITABLE",
  "tipo": "ENRIPIADO_MEJORADO",
  "observaciones": "Segmento reparado en 2026."
}
```

Procedimiento:

1. Los puntos se ajustan a la línea con `nearestPointOnLine` y se ordenan según su posición.
2. Se generan hasta tres segmentos con `lineSlice`: inicial, central y final.
3. El **estado y el tipo nuevos se aplican solo al segmento central**. Los extremos conservan estado, tipo y observaciones del tramo original.
4. El tramo original se conserva como segmento inicial (o como central si `desde` coincide con el comienzo de la línea). Los segmentos nuevos se crean como tramos independientes, sin unir geometrías.
5. Si se omite `estado` o `tipo`, el segmento central hereda el valor original.
6. Se registra el historial del tramo original y una entrada de auditoría por cada segmento afectado.

Respuesta: `200 { datos: [Tramo, Tramo, ...], mensaje }`. Devuelve `400` si los puntos están a menos de 1 metro o si el segmento abarca todo el tramo (no habría división real).

## Carga de fotos

La subida es **firmada desde el backend** y el archivo no pasa por la API:

1. El editor pide la firma con `POST /api/fotos/firma`.
2. El frontend envía el archivo directamente a `urlSubida` (`https://api.cloudinary.com/v1_1/<cloud>/image/upload`) con los campos `file`, `api_key`, `timestamp`, `folder` y `signature`.
3. Cloudinary devuelve `secure_url`.
4. El frontend registra solo la URL con `POST /api/fotos`, indicando `caminoId` y, opcionalmente, `tramoId`.
5. En la base se guarda la URL; Cloudinary conserva el archivo.

La firma es un SHA-1 de `folder=<carpeta>&timestamp=<ts>` concatenado con `CLOUDINARY_API_SECRET`. La carpeta utilizada es `caminos-rurales-sde`. El frontend valida un tamaño máximo de 10 MB antes de subir.

`DELETE /api/fotos/:id` elimina el registro de la base. El archivo original no se borra de Cloudinary.

## Importación de relevamientos

Los editores pueden cargar archivos generados en QGIS. El flujo tiene dos pasos: **previsualización** (no guarda nada) y **confirmación** (crea caminos y tramos).

### Formatos aceptados

| Formato | Extensión | Lectura | Sistema de coordenadas |
|---|---|---|---|
| KML | `.kml` | `@tmcw/togeojson` | EPSG:4326 (por especificación) |
| GeoPackage | `.gpkg` | `@ngageoint/geopackage` | El declarado en cada capa; se reproyecta a EPSG:4326 |

- Tamaño máximo: **25 MB**.
- Se aceptan `LineString` y `MultiLineString`. En un GeoPackage también se recorren las `GeometryCollection` que contengan líneas.
- Cada parte de un `MultiLineString` se convierte en un tramo independiente, **sin unir** las partes. Todas las partes de una misma feature comparten el camino creado.
- Si una coordenada trae una tercera dimensión (altitud, habitual en los KML exportados desde QGIS), se conserva solo `[longitud, latitud]`.
- Puntos y polígonos se descartan y se informan en `advertencias` y `descartados`.
- Si el GPKG tiene varias capas, se leen todas.
- La reproyección usa la definición WKT del SRS de cada capa. Si la capa declara un SRS distinto de EPSG:4326 y no incluye definición, la importación se rechaza con `400`.
- Máximo **2000 tramos** por archivo y por confirmación.

Para KML, un `MultiLineString` se representa con `<MultiGeometry>` y varios `<LineString>` (KML no tiene un elemento `MultiLineString`).

### Atributos reconocidos

Los nombres de campo y los valores se comparan sin distinguir mayúsculas, acentos ni separadores. La previsualización devuelve todos los atributos encontrados y una sugerencia para cada tramo.

| Campo del dominio | Atributos habituales | Valores reconocidos |
|---|---|---|
| Nombre del camino | `nombre`, `name`, `camino`, `ruta`, `denominacion`, `via`, `tramo` | Texto libre |
| Localidad | `localidad`, `municipio`, `pueblo`, `paraje`, `ciudad` | Texto libre |
| Departamento | `departamento`, `dpto`, `depto`, `partido` | Texto libre |
| Estado | `estado`, `estado_camino`, `estado_via`, `condicion`, `transitabilidad`, `situacion` | `transitable`/`bueno`, `regular`, `intransitable`/`malo`, `en_obra`/`obra` |
| Superficie | `tipo`, `tipo_camino`, `tipo_superficie`, `superficie`, `material`, `calzada` | `tierra`, `ripio`/`grava`, `enripiado`/`mejorado`, `pavimentado`/`asfalto` |

Si no hay coincidencia se usa `REGULAR` y `TIERRA` como valores por defecto.

### Mapeo configurable

`mapeo` es opcional y permite indicar qué atributo usar y cómo traducir sus valores:

```json
{
  "estado": {
    "campo": "estado_relevado",
    "valores": { "muy malo": "INTRANSITABLE", "aceptable": "REGULAR" },
    "porDefecto": "REGULAR"
  },
  "tipo": {
    "campo": "material_calzada",
    "valores": { "suelo natural": "TIERRA", "mejorado": "ENRIPIADO_MEJORADO" },
    "porDefecto": "TIERRA"
  }
}
```

En la previsualización se envía como campo de texto `mapeo` del formulario multipart. En la confirmación va dentro del JSON. Las claves de `valores` se normalizan igual que los atributos. El mapeo del backend se aplica si la feature no trae `estado` o `tipo` explícitos; la pantalla de importación permite elegir el campo y el valor por defecto y vuelve a analizar el archivo.

### Previsualización

`POST /api/caminos/importar` recibe `multipart/form-data` con:

- `archivo`: el `.kml` o `.gpkg` (obligatorio).
- `mapeo`: JSON opcional como texto.

No guarda nada. Devuelve `{ datos: PrevisualizacionImportacion }`:

```json
{
  "datos": {
    "archivo": "relevamiento.gpkg",
    "formato": "GPKG",
    "capas": ["caminos_relevados", "caminos_mercator"],
    "sistemasCoordenadas": ["EPSG:4326", "EPSG:3857"],
    "reproyectado": true,
    "total": 4,
    "descartados": 1,
    "advertencias": ["Se descartaron 1 elemento(s) sin geometría de línea..."],
    "clavesAtributos": ["id", "nombre", "estado", "superficie"],
    "features": [
      {
        "id": "caminos_relevados-2-1",
        "origen": "caminos_relevados-2",
        "grupo": "caminos_relevados-2",
        "capa": "caminos_relevados",
        "nombre": "Camino a Los Telares",
        "parte": 1,
        "partes": 2,
        "tipoGeometria": "LineString",
        "tipoGeometriaOriginal": "MultiLineString",
        "longitudKm": 0.739,
        "atributos": { "id": 2, "nombre": "Camino a Los Telares", "estado": "Malo", "superficie": "Ripio" },
        "geometria": { "type": "LineString", "coordinates": [[-63.45, -28.98], [-63.445, -28.975]] },
        "estadoSugerido": "INTRANSITABLE",
        "tipoSugerido": "RIPIO",
        "localidadSugerida": "Los Telares",
        "departamentoSugerido": "Salavina"
      }
    ]
  }
}
```

### Confirmación

`POST /api/caminos/importar/confirmar` recibe solo las features aprobadas:

```json
{
  "features": [
    {
      "id": "caminos_relevados-2-1",
      "grupo": "caminos_relevados-2",
      "nombre": "Camino a Los Telares",
      "localidad": "Los Telares",
      "departamento": "Salavina",
      "estado": "INTRANSITABLE",
      "tipo": "RIPIO",
      "observaciones": null,
      "geometria": { "type": "LineString", "coordinates": [[-63.45, -28.98], [-63.445, -28.975]] }
    }
  ]
}
```

- `nombre`, `localidad` y `departamento` son obligatorios.
- `grupo` agrupa varios tramos en un mismo camino (se usa para las partes de un MultiLineString). Si se omite, cada feature crea su propio camino. La pantalla de importación permite asignar un mismo `grupo` a varios tramos para guardarlos como tramos de un único camino (por ejemplo, los 10 tramos de una ruta).
- `caminoId` es opcional: en lugar de crear un camino, agrega el tramo a uno existente.
- `geometria` debe ser un `LineString` en EPSG:4326. La longitud se recalcula en el backend con turf; no se confía en el valor de la previsualización.
- La operación es transaccional: si falla una feature no se guarda ninguna. Se registra auditoría `CREAR` por cada camino y tramo.

Respuesta: `201 { datos: { resumen, caminos, tramos }, mensaje }`.

```json
{
  "datos": {
    "resumen": { "caminosCreados": 1, "tramosCreados": 2, "longitudTotalKm": 2.216 },
    "caminos": [{ "id": "cm...", "nombre": "Camino a Los Telares", "localidad": "Los Telares", "departamento": "Salavina" }],
    "tramos": [{ "id": "cm...", "caminoId": "cm...", "estado": "INTRANSITABLE", "tipo": "RIPIO", "longitudKm": 0.739 }]
  },
  "mensaje": "Se importaron 2 tramo(s) en 1 camino(s)."
}
```

### Errores frecuentes

| Situación | Respuesta |
|---|---|
| Archivo vacío o extensión distinta de `.kml`/`.gpkg` | `400` |
| Archivo mayor a 25 MB | `413` |
| KML mal formado o sin raíz `<kml>` | `400` |
| GPKG corrupto o que no es SQLite | `400` |
| GPKG sin tablas de entidades | `400` |
| No hay ninguna geometría de línea | `400` |
| SRS distinto de EPSG:4326 sin definición WKT | `400` |
| Más de 2000 tramos | `400` |
| Confirmación sin features o con campos obligatorios vacíos | `400` |

### Archivos de ejemplo

En `backend/ejemplos/` hay dos archivos listos para probar:

- `relevamiento-ejemplo.kml`: `LineString` + `MultiGeometry` con dos `LineString` y atributos `estado`, `superficie`, `localidad` y `departamento`.
- `relevamiento-ejemplo.gpkg`: capa en EPSG:4326 con `LineString`, `MultiLineString` y un polígono descartable, más una capa en EPSG:3857 para comprobar la reproyección.

Se regeneran con `npm run ejemplos:importacion` desde `backend/`.

## Prioridad de tramos

`GET /api/tramos/prioridad` calcula el puntaje de cada tramo en el momento de la consulta y devuelve el listado ordenado de mayor a menor. En caso de empate, ordena por nombre del camino.

La fórmula vive en `backend/src/services/prioridad.js` y sus pesos se pueden ajustar sin tocar el controlador:

| Componente | Pesos | Máximo |
|---|---|---|
| Estado del tramo | `INTRANSITABLE` 50 · `REGULAR` 25 · `EN_OBRA` 10 · `TRANSITABLE` 0 | 50 |
| Tipo de superficie | `TIERRA` 20 · `RIPIO` 12 · `ENRIPIADO_MEJORADO` 6 · `PAVIMENTADO` 0 | 20 |
| Cercanía a puntos de interés | `HOSPITAL` +30 · `UPA` +20 · `ESCUELA` +15 · categoría propia según su `peso` (0 a 30) | 30 |

La cercanía se calcula con `@turf/turf` (`pointToLineDistance`) entre la geometría del tramo y cada punto de interés. Solo suman los puntos ubicados a `PRIORIDAD_UMBRAL_KM` o menos (1 km por defecto). El aporte por cercanía se limita a 30 puntos y el total a 100.

Cada elemento de la respuesta incluye los datos del tramo, los datos básicos del camino y el desglose del puntaje:

```json
{
  "datos": [
    {
      "id": "cm...",
      "caminoId": "cm...",
      "geometria": { "type": "LineString", "coordinates": [[-63.45, -28.97], [-63.44, -28.98]] },
      "longitudKm": 1.35,
      "estado": "INTRANSITABLE",
      "tipo": "TIERRA",
      "observaciones": "Sector sin mantenimiento.",
      "creadoEn": "2026-10-19T12:00:00.000Z",
      "actualizadoEn": "2026-10-19T12:00:00.000Z",
      "camino": {
        "id": "cm...",
        "nombre": "Camino rural a Los Telares",
        "localidad": "Los Telares",
        "departamento": "Salavina"
      },
      "prioridad": {
        "puntaje": 100,
        "estado": 50,
        "tipo": 20,
        "cercania": 30,
        "umbralCercaniaKm": 1,
        "puntosCercanos": [
          {
            "id": "cm...",
            "nombre": "Hospital Zonal de Añatuya",
            "categoria": "HOSPITAL",
            "distanciaKm": 0.42,
            "aporte": 30
          }
        ]
      }
    }
  ]
}
```

## Frontend

### Páginas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Mapa a pantalla completa. Para EDITOR y ADMIN suma las herramientas de edición. |
| `/prioridades` | Público | Ranking de tramos por puntaje, con filtros, detalle de puntos de interés cercanos y acceso al mapa. |
| `/login` | Público | Formulario de ingreso con email y contraseña. |
| `/perfil` | Autenticado | Datos de la cuenta y cambio de contraseña. |
| `/sugerencias` | EDITOR / ADMIN | Revisión de sugerencias ciudadanas. |
| `/importar` | EDITOR / ADMIN | Carga de `.kml`/`.gpkg`, previsualización en el mapa y confirmación de la importación. |
| `/usuarios` | ADMIN | Alta de editores y activación/desactivación. |
| `/auditoria` | ADMIN | Registro de acciones con filtros. |

El encabezado cambia según la sesión y el rol: el lector ve Mapa y Prioridades; el editor suma Sugerencias e Importar; el administrador suma Usuarios y Auditoría. El menú de usuario da acceso a Mi perfil y Cerrar sesión. En móvil las secciones se agrupan en el menú desplegable.

### Mapa público

Mapa de pantalla completa con OpenStreetMap, panel de filtros por estado, superficie, departamento y búsqueda por nombre; selector "Colorear por" estado o superficie (por defecto, estado); leyenda; marcadores de puntos de interés agrupados en clusters según el nivel de zoom. Los puntos están **ocultos por defecto**: se muestran al tocar una categoría en la sección **Explorar caminos**, con un botón flotante **Mostrar puntos de interés** cuando no hay ninguna visible. Al hacer clic en un tramo se muestra un popup con el camino, localidad, longitud del tramo y total del camino, estado, superficie, puntaje de prioridad, fotos y el formulario **Sugerir un cambio** (`POST /api/sugerencias`).

El panel **Explorar caminos** se puede ocultar con el botón **Ocultar filtros** de la cabecera o con la flecha de su encabezado. Cuando está oculto, se vuelve a abrir desde el botón **Mostrar filtros** de la cabecera o desde el botón que aparece junto a la leyenda. El mapa incluye además un botón de **pantalla completa** en la esquina superior derecha, que expande únicamente el mapa y se cierra con el mismo botón o con `Esc`.

### Ranking de prioridades

La pantalla `/prioridades` muestra el ranking de tramos con filtros por camino, estado, superficie y departamento. La columna **Cercanía** resume los puntos de interés próximos (`+N` cuando hay más de dos); al hacer clic se abre un detalle con **todos** los puntos dentro del umbral, indicando categoría, distancia al tramo y aporte al puntaje, con acceso directo para ver el tramo en el mapa.

### Edición en el mapa

Con sesión de EDITOR o ADMIN aparece la barra **Edición** en el mapa:

- **Caminos:** abre la lista de caminos existentes, incluso los que no tienen tramos, para editar sus datos, dibujar un tramo nuevo o eliminarlos.
- **Nuevo camino:** formulario con nombre, localidad, departamento, descripción y estado activo. Al crearlo se abre directamente el formulario para dibujar su primer tramo.
- **Dibujar tramo:** se eligen camino, estado, superficie y observaciones; después se hace clic en el mapa para agregar vértices. El panel inferior permite deshacer el último punto, cancelar o terminar el tramo. Se requieren al menos dos puntos.
- **Editar tramo y camino:** al hacer clic en un tramo, el popup incluye el botón para abrir el panel lateral. Desde ahí se editan los datos del camino, el estado, la superficie y las observaciones del tramo; también se accede a las fotos, al historial y a las bajas.
- **Dividir / reclasificar:** se tocan el punto inicial y el final sobre la línea del tramo (el punto se ajusta a la línea más cercana). Luego se elige estado, superficie y observaciones del segmento central y se aplica `PATCH /api/tramos/:id/dividir`. Los extremos conservan sus valores originales.
- **Puntos de interés:** con **Nuevo punto** se hace clic en el mapa y se completa nombre y categoría. Desde el popup del marcador se pueden editar o eliminar. En el formulario se puede crear una categoría nueva al vuelo, con nombre y color.
- **Categorías de puntos de interés:** el botón **Administrar** de la sección Explorar caminos abre el listado de categorías. Desde ahí se crean categorías propias (nombre, color y aporte a la prioridad) y se eliminan las que no tengan puntos asociados. Hospital, Escuela y UPA son categorías base y no se pueden borrar.
- **Fotos:** el panel del tramo permite subir imágenes a Cloudinary y eliminarlas de la base.
- **Historial:** el panel del tramo muestra los cambios de estado, superficie y geometría con fecha y usuario.
- Las bajas de caminos, tramos y fotos piden confirmación antes de ejecutarse.

### Importación desde QGIS

La pantalla `/importar` (EDITOR o ADMIN) permite:

1. Elegir un `.kml` o `.gpkg` de hasta 25 MB y pedir la previsualización.
2. Revisar formato, capas, sistemas de coordenadas, advertencias y cantidad de elementos descartados.
3. Configurar el mapeo de estado y superficie (campo del archivo y valor por defecto) y volver a analizar.
4. Ver todas las líneas en el mapa: las seleccionadas se colorean según estado y superficie; las excluidas quedan grises. Un clic en una línea la incluye o excluye.
5. Completar la localidad y el departamento en **Datos comunes** y aplicarlos a los tramos seleccionados o a todos, en lugar de cargarlos uno por uno. Ahí también se puede asignar un nombre común y tildar **Unificar en un solo camino** para que varios tramos (por ejemplo, los 10 tramos de una ruta) queden como tramos de un mismo camino.
6. Ajustar por tramo el nombre del camino, la localidad, el departamento, el estado y la superficie. En las partes de un MultiLineString y en los tramos unificados, el nombre, la localidad y el departamento se comparten.
7. Confirmar: solo se envían los tramos tildados. Al terminar se muestra el resumen y el acceso al mapa.

La previsualización no guarda nada. Los polígonos y puntos se descartan y se avisa en la pantalla.

Las rutas protegidas redirigen a `/login` y, después del ingreso, vuelven a la página solicitada. Si el rol no alcanza se muestra un aviso de acceso restringido.

### Temas y diseño

Al colorear por estado, la superficie se distingue por el trazo de la línea (punteada, guiones largos, guion y punto o continua). Al colorear por superficie, cada tipo usa su propio color. Todos los tramos llevan un contorno que sigue el mismo trazo: oscuro sobre el mapa claro y claro sobre el mapa oscuro, para que se distingan mejor del fondo.

El tema claro/oscuro se guarda en `localStorage` y respeta la preferencia inicial del sistema. La interfaz es responsive, con panel de filtros desplegable en móvil.

Verificación de la compilación de producción:

```bash
cd frontend
npm run build
```

## Historial y auditoría

- **HistorialTramo:** se registra automáticamente cuando un `PATCH /api/tramos/:id` (o una división) modifica `estado`, `tipo` o `geometria`. Guarda valores anteriores y nuevos, usuario y fecha. Si se elimina el tramo, su historial se elimina en cascada; si se elimina el usuario, el historial se conserva sin usuario.
- **Auditoría:** se registra en las altas, ediciones y bajas disponibles de caminos, tramos, fotos, puntos de interés, categorías de puntos, sugerencias y usuarios, además del cambio de contraseña. Las sugerencias enviadas por ciudadanos se auditan con usuario nulo. Guarda usuario, acción, entidad, id, detalle, IP y fecha.
- El historial de un tramo se consulta con `GET /api/tramos/:id/historial` (EDITOR o ADMIN) y se muestra en el panel de edición. La auditoría se consulta con rol `ADMIN` y filtros por usuario, acción, entidad y rango de fechas.

## Datos de ejemplo

`npm run seed` crea:

- Un usuario `ADMIN` con los valores de `ADMIN_NOMBRE`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- Tres caminos en los departamentos Atamisqui, Salavina y General Taboada.
- Seis tramos que cubren los cuatro estados (`TRANSITABLE`, `REGULAR`, `INTRANSITABLE`, `EN_OBRA`) y los cuatro tipos de superficie.
- Las categorías base de puntos de interés (Hospital, Escuela y UPA).
- Tres puntos de interés de ejemplo (hospital, escuela y UPA) cercanos a los tramos para probar los marcadores y el cálculo de prioridad.

El seed es idempotente: no duplica el usuario, los caminos ni los puntos de interés si ya existen. Si el ADMIN ya existe, no se sobrescribe su contraseña.

## Importación y datos reales

La importación de relevamientos hechos en QGIS (`.kml` y `.gpkg`) está implementada en esta etapa. Ver [Importación de relevamientos](#importación-de-relevamientos) para el formato esperado, el mapeo de atributos y los archivos de ejemplo.

## Importar hospitales y escuelas

La pantalla `/importar` solo carga tramos (líneas). Para el padrón de puntos de interés (`HOSPITAL`, `ESCUELA`, `UPA`) hay un script de carga única que trabaja con puntos:

```bash
cd backend
npm run puntos:importar -- --archivo ../datos/hospitales.geojson --categoria HOSPITAL
```

Sin `--aplicar` el script solo previsualiza: muestra la categoría, el nombre y las coordenadas de cada punto y no escribe en la base. Es el modo recomendado para revisar antes de cargar.

| Opción | Descripción |
|---|---|
| `--archivo, -a <ruta>` | Archivo `.geojson`, `.json` o `.kml`. Acepta `FeatureCollection`, una `Feature` suelta o una lista de features. |
| `--categoria, -c <valor>` | `HOSPITAL`, `ESCUELA` o `UPA`. Si se omite, la categoría se deduce de los atributos de cada punto. |
| `--umbral-metros <n>` | Distancia para considerar duplicado a un punto con el mismo nombre y categoría. Por defecto `150`. |
| `--aplicar` | Guarda los puntos en la base. |
| `--ayuda, -h` | Muestra la ayuda. |

Solo se importan geometrías `Point` y `MultiPoint`. Un `MultiPoint` genera un punto por coordenada; las líneas y los polígonos se descartan y se informan en el resumen.

### Categoría de cada punto

Con `--categoria`, todos los puntos del archivo se cargan con esa categoría. Si se omite, el script busca los atributos `categoria`, `category`, `amenity`, `healthcare`, `tipo`, `clase` o `tipo_establecimiento` y reconoce valores como:

| Valores en el archivo | Categoría |
|---|---|
| `HOSPITAL`, `hospital`, `sanatorio` | `HOSPITAL` |
| `ESCUELA`, `school`, `colegio`, `instituto`, `establecimiento_educativo` | `ESCUELA` |
| `UPA`, `clinic`, `doctors`, `health_post`, `centro_de_salud`, `puesto_sanitario` | `UPA` |

Los puntos sin nombre o sin categoría se descartan y se cuentan en el resumen. Los nombres se toman de `nombre`, `name`, `nombre_establecimiento`, `denominacion`, `titulo`, `title` o `establecimiento`.

### Deduplicación

Un punto se considera duplicado si tiene la **misma categoría**, el **mismo nombre** (sin distinguir mayúsculas, acentos ni separadores) y está a menos de `--umbral-metros` de uno existente en la base o de otro punto ya aceptado del mismo archivo. Los duplicados se omiten y se listan al final, así que el script se puede volver a ejecutar sin miedo a duplicar datos.

La carga masiva no registra filas en `Auditoria` (no hay usuario asociado). Si se necesita trazabilidad, conviene cargar los puntos con el formulario del editor.

### Obtener los datos

La fuente más simple es OpenStreetMap a través de [Overpass Turbo](https://overpass-turbo.eu), que es gratuito y no requiere clave. Se pega esta consulta, se ejecuta y se exporta como GeoJSON:

```
[out:json][timeout:90];
area["name"="Santiago del Estero"]["admin_level"="4"]["boundary"="administrative"]->.sde;
(
  node["amenity"="hospital"](area.sde);
  way["amenity"="hospital"](area.sde);
  node["amenity"="school"](area.sde);
  way["amenity"="school"](area.sde);
);
out center;
```

`out center` devuelve el centro de los hospitales y escuelas dibujados como polígonos, así que la exportación queda toda en puntos. Para UPAs conviene sumar `amenity=clinic`, `amenity=doctors`, `healthcare=*` o los nombres locales (`centro de salud`, `puesto sanitario`).

El resultado de Overpass se puede exportar por separado (primero hospitales, después escuelas) o en un solo archivo: en ese caso no se usa `--categoria` y se deja que el script la deduzca de `amenity`. Los datos de OpenStreetMap se publican bajo licencia ODbL y requieren atribución.

Otra alternativa son los padrones oficiales de establecimientos educativos y de salud (Ministerio de Educación / Mapa Educativo y Ministerio de Salud / SISA), que suelen venir en CSV o GeoJSON. En ese caso hay que convertirlos a GeoJSON de puntos con los atributos indicados arriba.

Los archivos de la carga inicial de hospitales y escuelas están en `backend/datos/`; el detalle de la consulta, la depuración y la licencia está en `backend/datos/LEEME.md`.
