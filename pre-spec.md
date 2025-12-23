# Especificación detallada – Programa de dibujo para el aprendizaje del Dibujo Diédrico

> Documento funcional y descriptivo. Este texto **no busca ser esquemático**, sino explicar con claridad **qué debe hacer el programa, cómo se comporta y por qué**, incluso a costa de repetir conceptos en distintas secciones para facilitar la comprensión.

---

## 1. Naturaleza y objetivo de la aplicación

Esta aplicación es **una herramienta educativa** diseñada específicamente para el **aprendizaje del dibujo diédrico**.

El objetivo principal **no es producir un dibujo final correcto**, sino **guiar y hacer visible el proceso geométrico completo** que conduce a dicho resultado. El programa debe ayudar al usuario a:

- Comprender cómo se relacionan las distintas proyecciones.
- Visualizar el papel de los planos de proyección y las rectas de abatimiento.
- Entender cómo una construcción depende de otras anteriores.
- Experimentar qué ocurre cuando una hipótesis geométrica deja de ser válida.

Por este motivo:
- El programa **no automatiza construcciones complejas**.
- El programa **no “arregla” errores** del usuario.
- El programa **no oculta los pasos intermedios**.

El usuario debe poder **ver el razonamiento geométrico**, no solo el resultado.

---

## 2. Idea general de funcionamiento

El trabajo del usuario se desarrolla principalmente en una **vista 2D**, donde se superponen varios **planos de proyección**. En estos planos el usuario dibuja primitivas geométricas (puntos, rectas, circunferencias) y construye guías que permiten transportar distancias entre planos.

A partir de estas construcciones 2D, el usuario puede definir **elementos 3D** (puntos, rectas y planos). Estos elementos 3D:

- No se editan directamente.
- Existen como consecuencia lógica de las construcciones 2D.
- Se muestran en una **vista 3D auxiliar**, cuyo único propósito es ayudar a la comprensión espacial.

Todo el sistema es **paramétrico**: si el usuario modifica un elemento base, el resto del dibujo se recalcula automáticamente.

---

## 3. Planos de proyección y rectas de abatimiento

### 3.1 Planos de proyección

Un **plano de proyección** es una superficie 2D sobre la que se dibujan elementos geométricos.

- Cada plano tiene una **letra identificativa**.
- Los planos principales son:
  - **P_H**: Plano Horizontal.
  - **P_V**: Plano Vertical.

El sistema permite crear **planos adicionales** (auxiliares, de perfil, etc.). Un plano 3D puede **promoverse** a plano de proyección, pasando a formar parte del sistema diédrico.

En todo momento existe un **plano activo**, que es aquel sobre el que se crean los nuevos elementos.

### 3.2 Rectas de abatimiento (HL)

Las **rectas de abatimiento (HL)** representan la intersección entre dos planos de proyección.

- Se nombran como **HL_XY**, donde X e Y son las letras de los planos.
- Ejemplo: **HL_HV** es la recta común a P_H y P_V.
- En el caso de los planos principales, HL_HV es la **Línea de Tierra**.

A efectos de cálculo geométrico (intersecciones, paralelismo, perpendicularidad), las HL **se comportan exactamente como rectas**.

---

## 4. Guías y transporte de distancias

Las **guías** son uno de los elementos fundamentales del sistema.

Una guía:
- Es una recta **perpendicular a una HL**.
- Se crea a partir de una HL y un punto del plano activo.
- Pertenece simultáneamente a los **dos planos** asociados a la HL.

Las guías permiten:
- Transportar puntos de un plano a otro.
- Transportar **distancias** entre planos.
- Encadenar transportes entre **HL distintas que comparten un plano**.

Desde el punto de vista geométrico, las guías se comportan como rectas normales.

---

## 5. Elementos 2D y 3D

### 5.1 Convención de nombres

- Elementos 2D → nombres en **minúsculas**.
- Elementos 3D → nombres en **mayúsculas**.
- Las proyecciones se nombran con sufijos:
  - A_H, A_V, etc.

Los identificadores **P** y **HL** están reservados.

### 5.2 Elementos 2D

Los elementos 2D se crean siempre sobre el **plano activo** y son:

- Puntos.
- Rectas / segmentos.
- Circunferencias.
- Arcos (si se mantienen).

Los elementos 2D pertenecen a un plano concreto.

### 5.3 Elementos 3D

Los elementos 3D se crean exclusivamente a partir de elementos 2D:

- **Punto 3D** → a partir de sus proyecciones 2D.
- **Recta 3D** → a partir de dos rectas 2D (proyecciones compatibles).
- **Segmento 3D** → a partir de **dos segmentos 2D**, uno en cada plano de proyección.
- **Plano 3D** → a partir de dos trazas 2D.

La creación de elementos 3D es **limitada, directa y explícita**. El sistema no infiere nada adicional.

**Compatibilidad de segmentos 2D para definir un segmento 3D**:
- Para poder definir un segmento 3D, los dos segmentos 2D seleccionados deben ser **compatibles**, lo que implica:
  - Que representen proyecciones del **mismo segmento espacial**.
  - Que sus extremos correspondan a las proyecciones de **los mismos puntos 3D**.
  - Que las longitudes proyectadas y la correspondencia mediante guías/HL sean coherentes.

- Si los segmentos no son compatibles:
  - El sistema **no crea** el segmento 3D.
  - La acción constructiva se marca como **inviable**, siguiendo las reglas generales de inviabilidad (no se dibuja y se indica en rojo en los paneles).

- La comprobación de compatibilidad forma parte explícita del proceso didáctico y **no se corrige automáticamente**.

---

## 6. Proyecciones y su visualización

Se distinguen dos tipos de proyecciones:

- **Proyecciones generatrices**: aquellas utilizadas directamente para definir un elemento 3D.
- **Proyecciones derivadas**: aquellas que existen solo como consecuencia geométrica.

Las proyecciones derivadas se muestran con **tonos más claros**.

En la vista 2D:
- Si el elemento 3D se definió a partir del plano activo, sus proyecciones se muestran con tono fuerte.
- Si se definió a partir de otro plano, sus proyecciones se muestran con tono débil, incluso si pertenecen al plano activo.

---

## 7. Modelo paramétrico y dependencias

Todo el sistema es **paramétrico**.

- Cada acción constructiva genera dependencias.
- El proyecto mantiene un **grafo de dependencias**.
- Al mover un elemento base, todo lo dependiente se recalcula.

### 7.1 Inviabilidad

Una modificación puede hacer que una construcción deje de ser posible.

En ese caso:
- El elemento inviable **no se dibuja**.
- No se muestra error.
- En los paneles:
  - Rojo → elemento inviable.
  - Naranja → dependientes directos.

---

## 8. Vistas

### 8.1 Vista 2D

Es la vista principal de trabajo.

- Superpone varios planos.
- Usa intensidad visual para distinguir plano activo y dependencias.

**Interacciones**:
- Shift + arrastre → pan.
- Rueda → zoom.

Estas acciones funcionan siempre, incluso durante una operación activa.

### 8.2 Vista 3D

La vista 3D es auxiliar y solo informativa.

- Permite rotar, desplazar y hacer zoom.
- No permite seleccionar ni editar geometría.

**Representación**:
- Puntos 3D → punto + etiqueta.
- Rectas → segmentos finitos.
- Planos → cuadriláteros traslúcidos.

El tamaño de rectas y planos se determina mediante un **cubo envolvente**, cuyo cálculo es experimental.

El usuario puede activar o desactivar:
- Elementos 2D sobre planos.
- Líneas de unión entre elementos 3D y sus proyecciones.

---

## 9. Barras de herramientas

Las **barras de herramientas** constituyen el principal mecanismo de interacción activa del usuario con el sistema. Su diseño debe reflejar de forma clara el **enfoque procedimental** de la aplicación: el usuario elige *qué tipo de operación geométrica* desea realizar y la ejecuta de manera explícita.

Las barras se sitúan en la **parte superior** de la pantalla y están siempre visibles. Las herramientas se agrupan por **familias funcionales**, no por tipos abstractos de objetos.

Cada herramienta:
- Tiene un **estado activo** claramente visible.
- Puede requerir una secuencia de selecciones (puntos, rectas, planos, HL, etc.).
- Genera siempre una **acción constructiva** registrada en el panel correspondiente.
- No modifica automáticamente otras construcciones más allá de sus dependencias explícitas.

Las barras deben permitir realizar, como mínimo, las siguientes operaciones:

---

### 9.1 Barra de selección de plano activo

Esta barra permite seleccionar explícitamente el **plano 2D activo**, es decir, el plano sobre el cual se crearán los nuevos elementos.

Comportamiento:
- Muestra la lista de planos de proyección disponibles (P_H, P_V, planos auxiliares).
- El plano activo se indica de forma clara y persistente.
- Cambiar el plano activo:
  - No modifica la geometría existente.
  - Afecta únicamente a dónde se crean los nuevos elementos.

Efectos visuales asociados:
- Los elementos pertenecientes al plano activo se muestran con **mayor intensidad**.
- Los elementos de planos no activos se muestran con **tonos atenuados**.

---

### 9.2 Barra de navegación de la vista 2D

Esta barra agrupa las herramientas relacionadas con la **navegación del dibujo**, independientes de la lógica constructiva.

Incluye, como mínimo:
- Herramienta de desplazamiento (pan) de la vista.
- Herramienta de ajuste o restablecimiento de vista (opcional).

Notas importantes:
- Estas herramientas son conceptualmente independientes de las herramientas constructivas.
- En la práctica, la navegación mediante **Shift + arrastre** y **rueda del ratón** está siempre disponible, incluso durante una operación activa.

---

### 9.3 Barra de dibujo 2D (primitivas)

Esta barra contiene las herramientas para la **creación directa de elementos 2D** sobre el plano activo.

Herramientas básicas:
- Creación de **puntos**.
- Creación de **segmentos / rectas**.
- Creación de **circunferencias**.
- Creación de **arcos** (si se mantienen).

Subvariantes:
- Cada herramienta puede incluir un **menú desplegable** con variantes geométricas clásicas, por ejemplo:
  - Recta por dos puntos.
  - Recta que pasa por un punto y es perpendicular a otra recta.
  - Recta paralela a una recta dada por un punto.
  - Circunferencia por centro y punto.

Comportamiento:
- Todas las primitivas se crean **exclusivamente** en el plano activo.
- Las restricciones geométricas implícitas (perpendicularidad, paralelismo, etc.) forman parte de la herramienta seleccionada.

---

### 9.4 Barra de guías y transporte

Esta barra contiene herramientas específicas del **método diédrico**, centradas en el uso de HL y guías.

Herramientas principales:

1. **Creación de guía**
   - Entrada:
     - Selección de una **HL**.
     - Selección de un **punto** en el plano activo.
   - Resultado:
     - Creación de una **guía perpendicular a la HL** que pertenece a los dos planos definidos por dicha HL.

2. **Transporte de distancias**
   - Permite transportar una distancia medida sobre una guía o elemento entre planos.
   - El usuario selecciona:
     - distancia origen,
     - HL origen,
     - HL destino (cuando proceda).

3. **Transporte entre HL distintas que comparten un plano**
   - Permite encadenar transportes clásicos del dibujo diédrico.
   - Puede implicar la creación de planos intermedios auxiliares.

Restricciones:
- Estas herramientas **no crean geometría 3D**.
- Operan exclusivamente sobre planos 2D, HL y guías.

---

### 9.5 Barra de creación de elementos 3D

Esta barra agrupa las herramientas para definir **elementos 3D** a partir de construcciones 2D existentes.

Principio general:
- La creación de elementos 3D es **limitada, directa y deliberadamente simple**.
- El sistema no infiere información adicional ni completa construcciones incompletas.

Herramientas disponibles:
- Crear **punto 3D** a partir de sus proyecciones 2D.
- Crear **recta 3D** a partir de dos rectas 2D compatibles.
- Crear **segmento 3D** a partir de dos segmentos 2D compatibles.
- Crear **plano 3D** a partir de dos trazas 2D.

Comprobaciones:
- En todos los casos se verifica la **compatibilidad geométrica** de las proyecciones seleccionadas.
- Si la definición no es válida:
  - No se crea el elemento 3D.
  - La acción se marca como **inviable**.

Restricciones explícitas:
- No existe edición directa de geometría 3D.
- No existen herramientas de transformación 3D.
- El usuario no puede mover, rotar ni escalar elementos 3D.

---

### 9.6 Relación con acciones constructivas

- El uso de cualquier herramienta genera una **acción constructiva**.
- Dicha acción:
  - aparece en el panel de acciones,
  - establece dependencias claras,
  - participa en el modelo paramétrico.

La barra de herramientas no es solo un conjunto de botones, sino la **expresión operativa del razonamiento geométrico** que el usuario está siguiendo.

## 10. Paneles laterales

Todos los paneles se sitúan en el **lado izquierdo** y son apilables.

### 10.1 Panel de acciones constructivas

Muestra el historial jerárquico de acciones y subprocesos.

**Interacción (hover unificado)**:
- El comportamiento de *hover* es **idéntico** al de la lista de elementos.
- Al pasar el cursor por una acción:
  - se resalta el **elemento foco** asociado a la acción,
  - sus **ancestros directos** (inputs),
  - y sus **descendientes directos** (outputs).
- El resaltado es **visual, temporal y no modifica la selección**.

Muestra el historial jerárquico de acciones y subprocesos.

- Hover → foco, ancestros directos y descendientes directos.

### 10.2 Panel de elementos

Lista jerárquica de elementos 2D y 3D.

**Interacción (hover unificado)**:
- El comportamiento de *hover* es **idéntico** al del panel de acciones constructivas.
- Al pasar el cursor por un elemento:
  - se resalta el **elemento foco**,
  - sus **ancestros directos**,
  - y sus **descendientes directos**.
- El resaltado es **visual, temporal y no modifica la selección**.

**Interacción (click)**:
- Click sobre un elemento → apertura de **diálogo de propiedades**.

Lista jerárquica de elementos 2D y 3D.

- Hover → resaltado.
- Click → edición de propiedades.

### 10.3 Panel de planos

Permite activar y desactivar la visualización de planos, HL y elementos asociados.

---

## 11. Subprocesos y estilo visual

Los subprocesos agrupan pasos del razonamiento.

- Pueden activarse/desactivarse.
- Definen propiedades visuales heredadas.
- Los elementos pueden sobrescribir dichas propiedades.

---

## 12. Requisitos no funcionales

- Precisión numérica configurable.
- Rendimiento fluido.
- Portabilidad web o escritorio.

