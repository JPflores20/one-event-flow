

# Plataforma de Gestión de Eventos — "ONE"

## Visión General
Plataforma interna operativa para gestionar eventos, invitados y mesas. Diseñada para uso rápido en tablets/móviles durante el check-in en puerta.

## Diseño
- Dashboard estilo admin, limpio y minimalista
- Paleta: blanco, negro, grises con acento dorado (#C4A265) representando la marca "ONE"
- Mobile-first, optimizado para tablets y uso de pie
- Tipografía clara y botones grandes para operación rápida

## Pantallas y Funcionalidades

### 1. Dashboard Principal — Lista de Eventos
- Tarjetas con nombre, fecha, lugar y conteo de invitados confirmados/total
- Badge de estado: Activo / Pasado
- Botón "Crear Nuevo Evento" → modal con campos: Nombre, Fecha (datepicker), Lugar
- Filtro rápido por estado

### 2. Vista de Evento (workspace aislado)
Navegación por tabs dentro del evento:

#### Tab: Invitados
- Tabla con: Nombre, Teléfono, Estado (Pendiente/Confirmado/Cancelado), Acompañantes, Mesa asignada
- **Barra de búsqueda prominente** en la parte superior — filtrado instantáneo por nombre (optimizada para check-in en puerta)
- Botón para agregar invitado con formulario
- Edición inline del estado de confirmación (un tap para cambiar)
- Contadores: Total invitados, Confirmados, Pendientes, Cancelados

#### Tab: Mesas (Seating Plan)
- Lista/grid de mesas con nombre y capacidad
- Botón "Crear Mesa" → nombre + capacidad máxima
- Indicador visual de ocupación por mesa (barra de progreso: asientos ocupados/disponibles)
- Asignación de invitados a mesas mediante selector desplegable en cada mesa
- Vista de invitados asignados por mesa con opción de remover

### 3. Almacenamiento
- localStorage para persistencia de datos sin backend (toda la data se guarda localmente)
- Estructura: cada evento tiene su propio espacio con invitados y mesas independientes

## Componentes Clave
- `EventDashboard` — lista de eventos y creación
- `EventWorkspace` — vista con tabs del evento seleccionado
- `GuestManager` — tabla de invitados con búsqueda instantánea
- `SeatingPlan` — gestión de mesas y asignaciones
- `GuestForm` / `TableForm` — modales de creación/edición
- Hook `useEventStore` — gestión de estado con localStorage

