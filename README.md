# ONE — Event Flow

Sistema integral de gestión logística, control de invitados (RSVP & Check-in en puerta), diseño de croquis interactivo y contabilidad para eventos en tiempo real.

## Características Principales

- **Dashboard & Enlaces Directos**: Gestión multi-evento con rutas directas (`/events/:eventId?tab=...`) y exportación directa a Google Calendar.
- **Gestión de Invitados & Check-in**:
  - Búsqueda tolerante a acentos, filtros por estado/mesa y exportación/importación vía CSV y Excel (`.xlsx`).
  - Modo *Check-in en Puerta* con preservación del estado previo al deshacer.
  - Generador de mensajes de WhatsApp con enlace al pase QR del invitado.
- **Croquis Interactivo (`SeatingPlan`)**:
  - Lienzo con zoom, paneo, cuadrícula y arrastrar/redimensionar controlado (`react-rnd`) para mesas (redondas, cuadradas, rectangulares) y elementos arquitectónicos.
  - Exportación en alta resolución a PNG y reporte completo en PDF.
- **Cronograma (`EventTimeline`)**: Línea de tiempo minuto a minuto con responsables y seguimiento de hitos completados.
- **Contabilidad (`AccountingManager`)**: Subcolección independiente en Firestore (`events/{eventId}/financials/{txId}`) protegida por permisos granulares (`canViewAccounting`).
- **Seguridad y Roles en Tiempo Real**: Sincronización instantánea con `authorized_emails/{email}` y reglas de seguridad en [`firestore.rules`](./firestore.rules).

## Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), Framer Motion, Lucide Icons.
- **Backend / BaaS**: Firebase Authentication (Google Sign-In + Email/Password) y Cloud Firestore en tiempo real.
- **Testing**: Vitest + Testing Library.

## Scripts Disponibles

```sh
# Iniciar servidor de desarrollo (puerto 8080)
npm run dev

# Compilar para producción
npm run build

# Ejecutar linter
npm run lint

# Ejecutar pruebas unitarias
npm test
```

## Despliegue en Firebase

1. Verifica la configuración en [`firebase.json`](./firebase.json) y las reglas en [`firestore.rules`](./firestore.rules).
2. Compila la aplicación y despliega:

```sh
npm run build
firebase deploy
```
