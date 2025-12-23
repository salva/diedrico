# Especificación de Interfaz de Usuario – Aplicación de dibujo para aprendizaje del Dibujo Diédrico

> Documento centrado **exclusivamente en la interfaz de usuario (UI)** y en las **interacciones del usuario**. No describe el modelo geométrico interno ni el fundamento teórico del sistema diédrico, que se asume definido en la especificación conceptual principal.

El objetivo de este documento es describir **qué ve el usuario**, **qué controles existen**, y **qué ocurre cuando interactúa con ellos**.

---

## 1. Disposición general de la interfaz

La interfaz de usuario se organiza en cuatro zonas principales:

1. **Barra superior de herramientas**
2. **Área central de dibujo 2D**
3. **Vista 3D auxiliar superpuesta**
4. **Paneles laterales apilables (lado izquierdo)**

La interfaz está pensada para funcionar principalmente con **ratón y teclado**, sin requerir dispositivos especiales.

---

## 2. Área central de dibujo 2D

### 2.1 Descripción general

El área central de la pantalla está ocupada por la **vista 2D**, que constituye el espacio principal de trabajo.

En esta vista:
- Se superponen varios **planos de proyección**.
- Cada plano contiene elementos geométricos 2D.
- En todo momento existe un **plano activo**.

La vista 2D es donde se realizan todas las operaciones constructivas.

---

### 2.2 Navegación en la vista 2D

Las interacciones de navegación están siempre disponibles, independientemente de la herramienta activa:

- **Desplazamiento (pan)**
  - Tecla **Shift** + arrastre con botón izquierdo del ratón.

- **Zoom**
  - Rueda del ratón.

Estas acciones:
- No cancelan la operación en curso.
- No modifican la geometría.

---

### 2.3 Interacción con elementos 2D

- Los elementos se pueden **seleccionar** mediante clic.
- Puede existir selección simple o múltiple (según herramienta).
- Al pasar el ratón por encima de un elemento, puede activarse el **resaltado por dependencias** (si el modo correspondiente está activo).

---

## 3. Vista 3D auxiliar

### 3.1 Disposición

La vista 3D aparece como un **rectángulo superpuesto** sobre la vista 2D, normalmente en una esquina (configurable).

Su función es **exclusivamente visual**.

---

### 3.2 Interacciones en la vista 3D

Las interacciones permitidas son:

- **Rotación de la vista**
  - Arrastre del ratón.

- **Desplazamiento (pan)**
  - Tecla **Shift** + arrastre del ratón.

- **Zoom**
  - Rueda del ratón.

No se permite:
- Seleccionar elementos para edición.
- Crear ni modificar geometría.

---

### 3.3 Opciones de visualización en la vista 3D

Mediante controles (checkboxes o botones), el usuario puede:

- Activar/desactivar:
  - Visualización de elementos constructivos 2D sobre los planos de proyección.
  - Visualización de elementos de unión entre elementos 3D y sus proyecciones (p. ej. líneas discontinuas).

---

## 4. Barra superior de herramientas

La barra superior contiene los controles principales de acción del usuario. Las herramientas se agrupan por **tipo de operación**.

### 4.0 Principios de interacción constructiva (restricción clave)

Para mantener el enfoque didáctico y la trazabilidad del proceso:

- Las acciones constructivas **no deben mezclar** una posición “dada por el usuario” (por ejemplo, un clic aproximado en 2D) con una restricción geométrica *salvo* que ese clic cree primero una **construcción 2D sencilla** que pueda usarse como base explícita.
- En particular, **no se permite** que una herramienta “acepte” como entrada un **punto arbitrario sobre un elemento** (por ejemplo, “seleccionar un punto dentro de un segmento” mediante un clic sobre el segmento) si ese punto no existe previamente como entidad 2D.

Implicaciones prácticas en UI:
- Si el usuario necesita un punto sobre un segmento/recta/circunferencia, debe crearlo mediante una herramienta explícita (por ejemplo, “crear punto sobre elemento” o “intersección”), y **después** usar ese punto existente como input de otras acciones.
- El programa puede ofrecer ayudas visuales (highlight, mensajes de estado) pero no debe introducir entidades implícitas que oculten el proceso.

---

### 4.1 Barra de selección de plano activo

- Muestra los planos disponibles.
- Permite seleccionar el **plano activo**.

Interacciones:
- Clic sobre un plano → se convierte en plano activo.

Efectos visuales:
- Elementos del plano activo se muestran con mayor intensidad.
- Elementos de otros planos se atenúan.

---

### 4.2 Barra de navegación

Incluye controles explícitos para:
- Pan de la vista 2D.
- Ajuste/restablecimiento de vista (opcional).

Estas herramientas son complementarias al uso de atajos de teclado.

---

### 4.3 Barra de dibujo 2D

Esta barra contiene todas las **herramientas de creación de primitivas 2D**. Cada herramienta puede ofrecer **variantes explícitas**, accesibles mediante menús desplegables. Las variantes no son automáticas: el usuario selecciona conscientemente el tipo de construcción.

#### 4.3.1 Punto

- Crear punto libre mediante clic.
- Crear punto sobre un elemento existente (recta, segmento, circunferencia).
  - Esta operación **crea una entidad punto real** (no un punto implícito).
  - El usuario no “selecciona un punto dentro de un segmento”; crea primero el punto sobre el elemento.
- Crear punto como intersección de dos elementos seleccionados.

#### 4.3.2 Segmento

- Crear segmento a partir de **dos puntos**.
- Crear segmento entre dos puntos existentes seleccionados.
- Crear segmento como recorte entre dos puntos sobre una recta existente.

#### 4.3.3 Recta

- Crear recta a partir de **dos puntos**.
- Crear recta que pasa por un punto y es **paralela** a una recta dada.
- Crear recta que pasa por un punto y es **perpendicular** a una recta dada.

#### 4.3.4 Circunferencia

- Crear circunferencia a partir de **centro y punto**.
- Crear circunferencia a partir de **centro y radio numérico**.
  - El radio se introduce mediante un **campo numérico explícito** (diálogo o barra contextual).
  - El valor del radio constituye un **parámetro geométrico** editable.
- Crear circunferencia a partir de **tres puntos**.

#### 4.3.5 Arco (si se mantiene)

 Arco (si se mantiene)

- Crear arco a partir de **centro, punto inicial y punto final**.
- Crear arco a partir de **tres puntos**.

---

### 4.4 Barra de guías y transporte

Esta barra contiene las herramientas específicas del **método diédrico**, relacionadas con HL, guías y transporte de distancias.

#### 4.4.1 Creación de guía

- Crear guía seleccionando:
  - una **HL**,
  - un **punto** en el plano activo.

Resultado:
- Guía perpendicular a la HL, perteneciente a los dos planos asociados.

#### 4.4.2 Transporte de punto mediante guía

- Transportar un punto de un plano a otro a lo largo de una guía existente.

#### 4.4.3 Transporte de distancia

- Transportar la distancia definida por:
  - dos puntos,
  - o un segmento,
  a otro plano mediante guías.

#### 4.4.4 Transporte entre HL distintas que comparten un plano

- Transporte encadenado de distancias entre distintas HL con un plano común.
- Puede implicar creación explícita de planos auxiliares.

---

### 4.5 Barra de creación de elementos 3D

Esta barra contiene las herramientas para definir **elementos 3D** a partir de construcciones 2D existentes. Todas las operaciones requieren selección explícita de las proyecciones correspondientes.

#### 4.5.1 Crear punto 3D

- Selección de dos proyecciones compatibles de un punto (por ejemplo, A_H y A_V).

#### 4.5.2 Crear recta 3D

- Selección de **dos rectas 2D compatibles** (una en cada plano).

#### 4.5.3 Crear segmento 3D

- Selección de **dos segmentos 2D compatibles**.
- Verificación de correspondencia de extremos.

#### 4.5.4 Crear plano 3D

- Selección de **dos trazas 2D compatibles**.

Comportamiento común:
- Si la selección no define un elemento válido:
  - no se crea el elemento,
  - la acción se marca como inviable,
  - se refleja visualmente en los paneles.

---

## 5. Paneles laterales (lado izquierdo)

Todos los paneles se sitúan en el **lado izquierdo** de la pantalla y son **apilables y colapsables**.

---

### 5.1 Panel de acciones constructivas

Muestra el historial de acciones realizadas, organizado jerárquicamente por subprocesos.

Interacciones:
- Expandir/colapsar subprocesos.
- Hover sobre una acción:
  - resalta el elemento foco,
  - ancestros directos,
  - descendientes directos.

---

### 5.2 Panel de elementos

Lista jerárquica de elementos 2D y 3D.

Interacciones:
- Hover → mismo comportamiento que en acciones constructivas.
- Click → apertura de diálogo de propiedades.

---

### 5.3 Panel de planos

Permite:
- Activar/desactivar la visualización de planos.
- Activar/desactivar HL.
- Activar/desactivar elementos 2D asociados.

---

## 6. Diálogos y controles

### 6.1 Diálogo de propiedades de elemento

Se abre al hacer clic sobre un elemento en el panel de elementos.

Permite:
- Modificar color.
- Modificar grosor.
- Modificar tipo de línea.
- Activar/desactivar visibilidad.
- Restablecer herencia visual.

---

## 7. Resaltado visual y feedback

- El sistema utiliza códigos de color para indicar:
  - elemento foco,
  - ancestros directos,
  - descendientes directos,
  - elementos inviables,
  - dependencias de elementos inviables.

- El resaltado por hover es:
  - inmediato,
  - temporal,
  - no modifica la selección.

---

## 8. Comportamiento ante errores

- No se muestran errores modales.
- Las acciones inválidas se reflejan visualmente en los paneles.
- El usuario puede corregir la geometría directamente.

---

## 9. Accesibilidad y usabilidad

- Uso extensivo de iconografía clara.
- Feedback visual constante.
- Interacciones consistentes entre paneles.

---

## 10. Casos de uso básicos y verificación de soporte en UI

Esta sección describe varios **casos de uso** típicos y verifica que la interfaz descrita en este documento los soporta de forma directa.

> Nota: la verificación se hace **solo** contra los componentes e interacciones UI definidos aquí (barras, paneles, diálogos, atajos), sin entrar en cómo se resuelve internamente la geometría.

---

### Caso de uso 1 — Crear un punto 2D libre en el plano activo

**Objetivo**: colocar un punto de referencia inicial.

**Pasos del usuario**:
1. En la **barra de selección de plano activo**, el usuario selecciona el plano donde quiere trabajar.
2. En la **barra de dibujo 2D**, selecciona la herramienta **Punto → punto libre**.
3. Clic en el área de dibujo 2D para crear el punto.

**Soporte UI**:
- Soportado por **4.1** (selección de plano activo) y **4.3.1 Punto**.
- La creación genera una entrada en el **panel de acciones constructivas** (**5.1**).

---

### Caso de uso 2 — Crear un segmento 2D a partir de dos puntos

**Objetivo**: dibujar un segmento base para construcciones posteriores.

**Pasos del usuario**:
1. Crear o seleccionar dos puntos existentes (si no existen, crearlos con **Punto**).
2. En la **barra de dibujo 2D**, seleccionar **Segmento → segmento por dos puntos**.
3. Clic/selección del primer punto y del segundo punto.

**Soporte UI**:
- Soportado por **4.3.2 Segmento**.
- Respeta el principio **4.0**: no se introduce un punto implícito “dentro” de un segmento; se trabaja con puntos explícitos.

---

### Caso de uso 3 — Crear una recta perpendicular a otra recta pasando por un punto

**Objetivo**: realizar una construcción clásica (perpendicular).

**Pasos del usuario**:
1. Disponer de una recta base y de un punto existente.
2. En **Recta**, elegir la variante: **recta por punto perpendicular a recta dada**.
3. Seleccionar el punto, luego seleccionar la recta base.

**Soporte UI**:
- Soportado por **4.3.3 Recta** (variante perpendicular).
- La herramienta guía la secuencia de selección y la registra en el panel de acciones.

---

### Caso de uso 4 — Crear una circunferencia por centro y radio numérico

**Objetivo**: construir una circunferencia con radio exacto.

**Pasos del usuario**:
1. Crear/seleccionar el punto centro.
2. En **Circunferencia**, elegir **centro + radio numérico**.
3. Introducir el valor del radio en el campo numérico (diálogo o barra contextual).

**Soporte UI**:
- Soportado por **4.3.4 Circunferencia**.
- El radio es un parámetro explícito (consistente con **4.0**).

---

### Caso de uso 5 — Crear una guía a partir de HL y un punto

**Objetivo**: preparar correspondencias y transportes entre dos planos.

**Pasos del usuario**:
1. En la **barra de guías y transporte**, seleccionar **Crear guía**.
2. Seleccionar la **HL** correspondiente.
3. Seleccionar un **punto** del plano activo.

**Soporte UI**:
- Soportado por **4.4.1 Creación de guía**.
- La guía queda creada como entidad (no implícita) y se registra como acción.

---

### Caso de uso 6 — Transportar un punto de un plano a otro mediante una guía

**Objetivo**: obtener la correspondencia de un punto en otro plano.

**Pasos del usuario**:
1. Disponer de una guía y un punto origen.
2. Seleccionar **Transporte de punto mediante guía**.
3. Seleccionar el punto origen.
4. Seleccionar la guía (si es necesario según herramienta).
5. El sistema crea/actualiza la proyección o el punto transportado en el plano destino.

**Soporte UI**:
- Soportado por **4.4.2 Transporte de punto mediante guía**.
- El usuario no “clickea una posición aproximada” en el plano destino: el resultado es derivado de la operación explícita.

---

### Caso de uso 7 — Transportar una distancia entre HL distintas que comparten un plano

**Objetivo**: encadenar un transporte clásico entre charnelas diferentes.

**Pasos del usuario**:
1. Definir la distancia origen (por ejemplo, un segmento o dos puntos).
2. Elegir **Transporte entre HL distintas con plano común**.
3. Seleccionar HL origen y HL destino.
4. Confirmar/seleccionar elementos auxiliares requeridos por la herramienta (si aplica).

**Soporte UI**:
- Soportado por **4.4.4 Transporte entre HL distintas**.
- La UI contempla pasos explícitos y la posibilidad de planos auxiliares como parte del flujo.

---

### Caso de uso 8 — Crear un punto 3D a partir de dos proyecciones 2D

**Objetivo**: definir un punto espacial a partir de sus proyecciones.

**Pasos del usuario**:
1. Disponer de dos proyecciones compatibles (por ejemplo, A_H y A_V).
2. En la **barra de creación 3D**, seleccionar **Crear punto 3D**.
3. Seleccionar ambas proyecciones.

**Soporte UI**:
- Soportado por **4.5.1 Crear punto 3D**.
- La UI especifica comprobación de validez; si falla, la acción se marca inviable.

---

### Caso de uso 9 — Crear un segmento 3D a partir de dos segmentos 2D

**Objetivo**: definir un segmento espacial a partir de sus proyecciones.

**Pasos del usuario**:
1. Disponer de dos segmentos 2D (uno por plano) que representen el mismo segmento espacial.
2. Seleccionar **Crear segmento 3D**.
3. Seleccionar los dos segmentos 2D.

**Soporte UI**:
- Soportado por **4.5.3 Crear segmento 3D**.
- Incluye verificación de compatibilidad; en caso de incompatibilidad, se marca inviable.

---

### Caso de uso 10 — Revisar dependencias por hover (acciones y elementos)

**Objetivo**: entender el razonamiento geométrico y sus dependencias.

**Pasos del usuario**:
1. Abrir el **panel de acciones**.
2. Pasar el ratón por una acción: se resaltan foco/ancestros directos/descendientes directos.
3. Abrir el **panel de elementos**.
4. Pasar el ratón por un elemento: mismo comportamiento de resaltado.

**Soporte UI**:
- Soportado por **5.1 Panel de acciones** y **5.2 Panel de elementos**.
- Se especifica un **hover unificado** y no destructivo.

---

### Caso de uso 11 — Editar propiedades visuales de un elemento

**Objetivo**: ajustar estilo sin alterar la geometría.

**Pasos del usuario**:
1. En el **panel de elementos**, hacer clic sobre un elemento.
2. En el **diálogo de propiedades**, ajustar color/grosor/tipo de línea/visibilidad.
3. (Opcional) Restablecer herencia visual.

**Soporte UI**:
- Soportado por **6.1 Diálogo de propiedades de elemento**.

---

### Caso de uso 12 — Navegar (pan/zoom) sin cancelar una operación

**Objetivo**: mantener fluidez durante construcciones.

**Pasos del usuario**:
1. Iniciar una herramienta (por ejemplo, crear segmento).
2. Antes de terminar, usar **Shift + arrastre** para mover la vista y **rueda** para zoom.
3. Continuar la selección para completar la operación.

**Soporte UI**:
- Soportado por **2.2 Navegación en vista 2D**.
- El documento especifica que pan/zoom están siempre disponibles.

---

### Caso de uso 13 — Activar/desactivar elementos en la vista 3D

**Objetivo**: usar la vista 3D como ayuda didáctica configurable.

**Pasos del usuario**:
1. En los controles de la vista 3D, activar/desactivar:
   - elementos 2D sobre planos,
   - líneas de unión 3D–2D.

**Soporte UI**:
- Soportado por **3.3 Opciones de visualización en la vista 3D**.

---

## 11. Consideraciones finales

La UI está diseñada para que el usuario pueda completar construcciones típicas del sistema diédrico mediante operaciones explícitas, registradas y visualmente trazables. Los casos de uso anteriores cubren el recorrido mínimo de:
- creación 2D,
- transporte y guías,
- definición 3D,
- navegación,
- inspección por dependencias,
- y edición visual.

