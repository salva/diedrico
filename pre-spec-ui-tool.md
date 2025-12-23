# Especificación de Interfaz de Usuario – Modelo de barras de herramientas

> Documento independiente. Este texto describe el **modelo de funcionamiento de las barras de herramientas** para una aplicación de geometría interactiva y constructiva. No hace referencia a ninguna aplicación concreta ni a modelos geométricos internos específicos.

El objetivo es definir un patrón de interacción claro, consistente y pedagógicamente eficaz.

---

## 1. Herramienta activa única

En cada momento existe **una única herramienta activa**.

- La herramienta activa determina:
  - cómo se interpretan los clics del ratón,
  - qué tipos de elementos pueden seleccionarse,
  - qué acciones están permitidas.
- Mientras una herramienta está activa, los clics **no se interpretan como selección genérica**, sino como entradas para completar la operación asociada.

El estado de la herramienta activa debe ser:
- claramente visible,
- persistente hasta que la operación se complete o se cancele.

---

## 2. Organización por familias de herramientas

Las herramientas se agrupan en **familias funcionales**, cada una representada por un botón principal.

- Cada familia contiene varias **subherramientas** relacionadas conceptualmente.
- El acceso a las subherramientas se realiza mediante un menú desplegable asociado al botón.
- La última subherramienta utilizada puede permanecer como predeterminada para usos posteriores.

Este enfoque permite:
- mantener la barra compacta,
- agrupar operaciones similares,
- hacer explícita la intención del usuario.

---

## 3. Flujo secuencial de interacción

Cada herramienta define un **flujo secuencial explícito** de pasos.

- Cada paso espera un tipo concreto de entrada:
  - selección de un punto,
  - selección de una recta,
  - introducción de un valor numérico,
  - etc.
- El sistema conoce en todo momento:
  - el paso actual de la herramienta,
  - qué entradas son válidas en dicho paso.

El usuario no puede avanzar al siguiente paso sin completar correctamente el anterior.

---

## 4. Restricción de entradas válidas

Mientras una herramienta está activa:

- Solo pueden seleccionarse los elementos **válidos** para el paso actual.
- Los elementos válidos pueden resaltarse visualmente.
- Los elementos no válidos se ignoran o no reaccionan al clic.

Este comportamiento reduce errores y refuerza la comprensión del proceso geométrico.

---

## 5. Feedback visual continuo

Durante la interacción, el sistema proporciona **feedback visual constante**, incluyendo:

- resaltado de elementos seleccionables,
- indicación clara del paso actual,
- previsualización del resultado cuando sea posible,
- mensajes breves de estado.

El feedback guía al usuario sin automatizar decisiones.

---

## 6. Creación explícita del resultado

Al completar correctamente todos los pasos de una herramienta:

- se crea la construcción de forma explícita,
- se registra como una acción coherente y trazable,
- se establecen las dependencias correspondientes.

No se crean entidades implícitas ni se completan construcciones ambiguas.

---

## 7. Finalización y repetición

Tras completar una operación:

- la herramienta puede permanecer activa para permitir repetir la misma acción,
- o puede volver a un estado neutro.

El comportamiento debe ser consistente y predecible para el usuario.

---

## 8. Cancelación de la operación

El usuario puede cancelar una herramienta en cualquier momento:

- mediante una acción explícita de cancelación (por ejemplo, una tecla dedicada),
- o seleccionando otra herramienta distinta.

Al cancelar:
- se descartan las selecciones parciales,
- no se crea ninguna entidad,
- el sistema vuelve a un estado coherente.

---

## 9. Separación entre navegación y construcción

Las acciones de navegación (desplazamiento, zoom) están separadas conceptualmente de las herramientas constructivas.

- La navegación puede estar disponible en cualquier momento.
- El uso de navegación no cancela ni altera la herramienta activa.

Esto permite trabajar con dibujos complejos sin interrumpir el flujo de construcción.

---

## 10. Ausencia de inferencias ocultas

El sistema de herramientas **no introduce inferencias implícitas**:

- No se crean puntos automáticos a partir de clics aproximados.
- No se combinan posiciones arbitrarias con restricciones geométricas.
- Toda entidad utilizada como entrada debe existir explícitamente.

Cada construcción refleja exactamente las decisiones tomadas por el usuario.

---

## 11. Objetivo pedagógico del diseño

Este modelo de barras de herramientas está diseñado para:

- hacer explícito el razonamiento geométrico,
- evitar ambigüedades en la interacción,
- reforzar la relación entre acción y resultado,
- permitir al usuario reconstruir mentalmente el proceso seguido.

Las barras de herramientas constituyen un **lenguaje de interacción**, no solo un conjunto de botones.

