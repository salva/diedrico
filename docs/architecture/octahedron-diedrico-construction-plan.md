# Plan constructivo del octaedro del problema

## Objetivo

Construir en Diedrico un octaedro regular de lado `90` apoyado por la cara `1-2-3` en un plano `P`, donde:

- `P` forma `60°` con `P_H`;
- `P` forma `30°` con `P_V`;
- `P` contiene el punto `A=(-20,105,0)`;
- el vertice `1` tiene cota `0`;
- el vertice `2` tiene cota `60`.

Se toma como condicion de trabajo que `A` es el vertice `1`. Si `A` solo fuese un punto cualquiera de `P`, el problema no fijaria la posicion del octaedro y quedaria una familia de soluciones.

La construccion debe usar herramientas geometricas de Diedrico. No se deben calcular coordenadas finales ni crear vertices derivados mediante entrada XYZ. La entrada numerica solo se admite para datos del enunciado: coordenadas del dato inicial, lado `90`, angulos `60°` y `30°`.

## Correcciones de orientacion para la solucion elegida

La solucion que se va a construir usa la rama del plano que en la interfaz queda medida como el angulo suplementario. Dicho de forma operativa:

- si la herramienta mide la rama anterior como `60°`, se debe elegir la rama equivalente a `120°`;
- el perfil del plano en `P_YZ` debe corresponder a `z = -sqrt(3)(y - 105)`;
- la traza vertical queda por encima de la linea de tierra, no por debajo;
- al construir la cara equilatera `1-2-3`, se debe escoger la interseccion para la que `3` tambien tenga cota positiva;
- los vertices `4,5,6` se levantan en el lado de la normal cuya componente de cota es positiva.

El vertice `1` conserva cota `0`, porque esto forma parte del enunciado. Por tanto, cuando se diga que la base queda con cotas positivas se entiende como `z_1 = 0`, `z_2 > 0`, `z_3 > 0`.

## Estado del octaedro anterior

El octaedro construido en la pasada anterior no quedo como una construccion persistente hecha con herramientas normales de Diedrico. Fue una escena creada desde el runtime del navegador con objetos de dominio añadidos directamente para poder validar la geometria. Al recargar la aplicacion esa escena no es una receta recuperable de usuario.

Por eso este documento redefine el trabajo como una construccion estricta con herramientas de Diedrico y subprocesos visibles/encapsulables.

## Herramientas permitidas

Herramientas actuales de Diedrico que se pueden usar:

- `3D Point XYZ`, solo para el punto dato inicial `1=(-20,105,0)`.
- `Add YZ Plane`, para disponer del plano de perfil `P_YZ`.
- `Free Point`, con coordenadas directas solo para datos iniciales o puntos auxiliares de colocacion, no para vertices derivados.
- `Line Through Points`.
- `Line With Angle`.
- `Parallel Line`.
- `Perpendicular Line`.
- `Circle`, tanto por centro-punto como por centro-radio cuando el radio es dato o distancia construida.
- `Intersection Point`.
- `Segment`.
- `Guide`.
- `3D Point`, desde dos proyecciones 2D.
- `3D Segment`, desde dos proyecciones 2D.
- `3D Plane`, desde trazas.
- `Projection Plane`, para abatir un plano auxiliar.

Nota importante:

- La herramienta `Transport` no se usa como operacion atomica porque actualmente es un placeholder. Todo transporte de distancia debe resolverse con paralelas, perpendiculares, circulos y puntos de interseccion.

Herramientas no permitidas para los resultados:

- `3D Point XYZ` para vertices `2,3,4,5,6`.
- Crear puntos derivados escribiendo coordenadas calculadas.
- Introducir directamente la altura del octaedro como formula o numero calculado.

## Comparacion de enfoques

### Enfoque A: trabajar solo en `P_H` y `P_V`

Idea:

1. Construir las trazas de `P`.
2. Construir directamente las proyecciones de la cara `1-2-3`.
3. Construir las proyecciones de las normales por los pies de los vertices restantes.
4. Obtener `4,5,6` directamente en `P_H` y `P_V`.

Ventajas:

- Evita crear un plano auxiliar verdadero de `P`.
- Sigue el lenguaje clasico de Monge.

Coste:

- La cara `1-2-3` no se ve en verdadera magnitud en `P_H` ni en `P_V`.
- La condicion de lado `90` exige varios abatimientos parciales o cambios auxiliares.
- La determinacion de `3` y de los pies de `4,5,6` seria larga.
- Es facil mezclar distancia proyectada con distancia verdadera.

Valoracion:

Es el enfoque mas propenso a errores y no minimiza construccion.

### Enfoque B: abatir `P` y resolver casi todo en verdadera magnitud

Idea:

1. Construir `P`.
2. Abatir `P` como plano auxiliar `P_aux`.
3. Resolver en `P_aux` la cara equilatera `1-2-3`.
4. Resolver en `P_aux` los pies de los vertices `4,5,6` sobre `P`.
5. Construir una sola seccion normal reusable para obtener la distancia normal del octaedro y sus componentes proyectadas.
6. Transportar esas componentes a cada pie y crear las proyecciones `P_H`/`P_V` de `4,5,6`.
7. Reconstruir puntos y aristas 3D.

Ventajas:

- La cara apoyada se construye en verdadera magnitud.
- La condicion `2` con cota `60` se reduce a cortar una recta de cota con un circulo de radio `90`.
- La altura del octaedro se obtiene geometricamente con un triangulo rectangulo, no por formula.
- Los subprocesos son claros y repetibles.

Coste:

- Hay que proyectar de vuelta varios puntos de `P_aux` a `P_H` y `P_V`.
- Hay que construir una seccion normal para levantar `4,5,6`.

Valoracion:

Es correcto, pero todavia infrautiliza `P_YZ`: en este problema concreto el plano `P` es paralelo a la linea de tierra, asi que su perfil en `P_YZ` contiene mucha mas informacion de la habitual.

### Enfoque C: construir varias secciones normales, una por vertice alto

Idea:

1. Construir la cara base en `P`.
2. Para cada pie de `4,5,6`, crear una seccion auxiliar perpendicular a `P`.
3. En cada seccion, levantar la altura normal.
4. Proyectar cada vertice.

Ventajas:

- Muy sistematico.
- Cada vertice alto se obtiene localmente.

Coste:

- Triplica construcciones casi identicas.
- El arbol de proceso queda grande y dificil de leer.

Valoracion:

Correcto, pero mas largo que el enfoque B. Solo conviene si falla el transporte de componentes desde una unica seccion normal.

### Enfoque D: usar `P_YZ` como plano director y `P_aux` como plano verdadero

Idea:

1. Usar `P_YZ` para dibujar directamente el perfil del plano `P`.
2. Obtener ahi las cotas, trazas, distancias de perfil y posiciones de nivel.
3. Construir `P_aux` como verdadera magnitud de `P`, pero gobernado por lo que ya se ha fijado en `P_YZ`.
4. Resolver en `P_aux` solo lo que necesita distancia verdadera dentro de `P`: triangulo `1-2-3`, pies `F4,F5,F6` y construccion de la altura.
5. Proyectar de vuelta usando `P_YZ` como intermediario natural para cotas/perfiles.

Ventajas:

- El plano `P` se dibuja en `P_YZ` como una sola recta.
- La condicion de cota `60` para el vertice `2` se obtiene con una horizontal en `P_YZ`.
- Las trazas `p_H` y `p_V` se derivan de cortes del perfil, no de una construccion espacial larga.
- La proyeccion de puntos de `P_aux` a `P_H`/`P_V` se organiza mejor: primero se controla la posicion sobre el perfil en `P_YZ`, y despues se transporta el desplazamiento paralelo a la linea de tierra.
- Reduce el numero de secciones auxiliares.

Coste:

- `P_YZ` no muestra la distancia verdadera completa dentro de `P`, porque colapsa la direccion paralela a la linea de tierra.
- Por tanto no basta con dibujar todo en `P_YZ`: para lados de longitud `90` sigue haciendo falta un plano de verdadera magnitud o una construccion equivalente que combine desplazamiento de perfil y desplazamiento paralelo a la linea de tierra.

Valoracion:

Es el enfoque elegido. Es mas sencillo que usar `P_aux` como origen de todo, porque `P_YZ` fija de forma inmediata el plano, las cotas y las trazas. `P_aux` queda como un plano operativo de verdadera magnitud, no como el lugar donde descubrir todos los datos.

## Enfoque elegido

Usar el enfoque D:

1. crear `P_YZ`;
2. dibujar el perfil de `P` en `P_YZ`;
3. derivar de ese perfil `p_H`, `p_V` y las rectas de cota;
4. crear `P` y abatirlo como `P_aux`;
5. construir en `P_aux` la cara verdadera y los pies de los vertices opuestos;
6. construir una unica seccion normal para obtener geometricamente la altura y sus componentes;
7. transportar esas distancias por paralelas y compas;
8. reconstruir puntos 3D y aristas 3D desde proyecciones reales.

## Correccion tras ejecucion en Diedrico

Al ejecutar el plan con las herramientas actuales de la aplicacion aparecen tres
restricciones que el plan original infraestimaba:

1. `Projection Plane` crea la bisagra principal entre `P_aux` y el plano de la
   traza de abatimiento, pero no deja disponible automaticamente una bisagra rota
   operativa con el otro plano de proyeccion para proyectar puntos de vuelta.
2. `3D Point` permite seleccionar puntos en dos planos cualesquiera, pero no toda
   pareja de planos sirve como par de proyecciones compatible. En particular,
   `P_aux + P_YZ` solo reconstruye correctamente puntos en casos degenerados de
   la charnela; para los vertices generales de la base la realizacion queda
   infeasible. Por tanto, no se puede usar `P_aux + P_YZ` como atajo para crear
   los vertices 3D.
3. La herramienta `Transport` sigue siendo un placeholder y `Circle` no acepta
   aun un radio definido por un segmento construido en otro plano. Cuando se
   traslada una distancia con compas, la app obliga hoy a materializarla como
   `circle-by-radius` con un radio-vector numerico medido del segmento construido.
   Conceptualmente es un transporte con compas, pero no queda como dependencia
   geometrica editable.

Consecuencia:

- La construccion de `P`, `P_aux`, la cara verdadera `1-2-3`, el centro de cara,
  los pies `F4,F5,F6` y la altura normal `h` si es ejecutable con las herramientas
  actuales.
- La reconstruccion estricta de los vertices `2,3,4,5,6` en `P_H` y `P_V`, y por
  tanto las aristas 3D finales, no es ejecutable de forma limpia sin una de estas
  dos mejoras:
  - una herramienta de transporte de distancia que acepte como radio un segmento
    construido, incluso entre planos mediante charnela;
  - una herramienta explicita `3D Point from projection on plane` y otra
    `3D Point by plane normal offset`, ambas ya modeladas conceptualmente en el
    dominio, para convertir puntos abatidos y pies+altura en puntos 3D sin
    introducir coordenadas finales.

La opcion de crear puntos libres en `P_H`/`P_V` con coordenadas calculadas queda
descartada para este problema porque violaria la condicion de calculo
geometrico.

## Plan jerarquico

### 1. Preparacion de la escena

#### 1.1. Crear el plano de perfil

1. Usar `Add YZ Plane`.
2. Confirmar que aparece `P_YZ`.
3. Encapsular el subproceso automaticamente generado, dejando visible solo `P_YZ` y sus ejes relevantes si hacen falta.

Salida:

- `P_YZ`.

#### 1.2. Crear el punto dato `1`

1. Usar `3D Point XYZ`.
2. Introducir `(-20,105,0)`.
3. Etiquetar el punto 3D como `1`.
4. Mantener visibles sus proyecciones `1_H`, `1_V` y, si se crea, `1_YZ`.

Salida:

- vertice `1`;
- proyecciones `1_H`, `1_V`.

### 2. Construccion del plano `P`

#### 2.1. Dibujar el perfil de `P` en `P_YZ`

Dato usado:

- `P` forma `60°` con `P_H`;
- `P` forma `30°` con `P_V`;
- `1` pertenece a `P`.

Razon geometrica:

- Las inclinaciones `60°` con `P_H` y `30°` con `P_V` son complementarias.
- Eso fuerza que la normal de `P` no tenga componente paralela a la linea de tierra.
- Por tanto `P` es paralelo a la linea de tierra y en `P_YZ` se ve como una recta.

Pasos:

1. Obtener la proyeccion de perfil `1_YZ`.
2. En `P_YZ`, por `1_YZ`, usar `Line With Angle` para dibujar el perfil `p_yz` de `P`.
3. Usar como referencia la charnela que representa `P_V`; el perfil debe formar `30°` con `P_V` y `60°` con `P_H`.
4. Mantener visible `p_yz`, porque sera la guia principal para cotas y trazas.

Salida:

- perfil `p_yz` del plano `P` en `P_YZ`.

#### 2.2. Construir la traza horizontal `p_H`

Dato usado:

- `1` pertenece a `P` y tiene cota `0`, luego `1_H` pertenece a `p_H`.
- en `P_YZ`, `p_H` corresponde al corte `p_yz` con la linea de cota `0`.

Pasos:

1. En `P_YZ`, cortar `p_yz` con la charnela de `P_H` para confirmar el punto de traza horizontal.
2. Transportar ese punto a `P_H` si hace falta; en este caso coincide con `1_H` porque `1` tiene cota `0`.
3. En `P_H`, por `1_H`, usar `Parallel Line` para trazar una paralela a la linea de tierra.
4. Etiquetar esa linea como `p_H`.

Salida:

- traza horizontal `p_H`.

#### 2.3. Construir la traza vertical `p_V`

Dato usado:

- el corte de `p_yz` con la charnela de `P_V` da el punto de la traza vertical.

Pasos recomendados:

1. En `P_YZ`, cortar `p_yz` con la charnela correspondiente a `P_V`.
2. Ese corte es el punto de la traza vertical en perfil.
3. Transportar ese punto a `P_V` mediante las guias de la charnela `P_V`/`P_YZ`.
4. Por el punto obtenido en `P_V`, trazar una paralela a la linea de tierra. Esa es `p_V`.

Salida:

- traza vertical `p_V`.

#### 2.4. Crear el plano 3D `P`

1. Usar `3D Plane`.
2. Seleccionar `p_H` y `p_V`.
3. Etiquetar el plano como `P`.

Salida:

- plano 3D `P`.

### 3. Abatimiento verdadero de `P`

#### 3.1. Preparar la posicion abatida de la segunda traza

Pasos:

1. Usar como charnela de abatimiento `p_H`.
2. Usar el perfil `p_yz` en `P_YZ` como seccion verdadera perpendicular a la linea de tierra.
3. Transportar desde `P_YZ` a la charnela la distancia entre el corte de `p_yz` con `P_H` y el corte con `P_V`.
4. Con esa distancia, situar en `P_H` o en el papel la posicion abatida `p_V'` como paralela a `p_H`.
5. Mantener visible `p_H`, `p_V`, `p_yz` y `p_V'` hasta crear el plano auxiliar.

Regla importante:

- Si una distancia se transporta entre planos distintos, llevarla primero a la charnela correspondiente y desde ahi al nuevo plano.

Salida:

- traza abatida `p_V'`.

#### 3.2. Crear `P_aux`

1. Usar `Projection Plane`.
2. Seleccionar:
   - `T1 = p_H`;
   - `T2 = p_V`;
   - `T2' = p_V'`.
3. Nombrar el plano auxiliar como `P_aux`.

Salida:

- `P_aux`, representando `P` en verdadera magnitud.

Subproceso recomendado:

- Crear un subproceso `Construir y abatir P`.
- Encapsular auxiliares de perfil y transporte.
- Dejar como salidas visibles `p_H`, `p_V`, `P` y `P_aux`.

### 4. Construccion de la cara `1-2-3` en `P_aux`

#### 4.1. Transportar el vertice `1` a `P_aux`

1. Desde `1_H`, usar la charnela `p_H` y guias de abatimiento para localizar `1_aux` en `P_aux`.
2. Como `1` esta sobre `p_H`, en este caso `1_aux` cae sobre la propia charnela.
3. Etiquetar como `1`.

Salida:

- `1_aux`.

#### 4.2. Construir la recta de cota `60` en `P_aux`

Pasos:

1. En `P_YZ`, trazar la recta horizontal de cota `60`.
2. Intersectarla con `p_yz`.
3. Transportar sobre la charnela la distancia de perfil entre el punto de cota `0` y el punto de cota `60`.
4. En `P_aux`, trazar por esa posicion una paralela a `p_H`.
5. Esa paralela es la recta de cota `60` dentro del plano `P` abatido.

Salida:

- recta `z=60` en `P_aux`.

#### 4.3. Localizar el vertice `2`

1. En `P_aux`, trazar un circulo con centro `1_aux` y radio `90`.
2. Intersectar ese circulo con la recta `z=60`.
3. Elegir la interseccion que corresponda a la orientacion de solucion escogida.
4. Etiquetarla como `2_aux`.

Salida:

- `2_aux`.

#### 4.4. Localizar el vertice `3`

1. En `P_aux`, trazar un circulo con centro `1_aux` y radio `90`.
2. En `P_aux`, trazar un circulo con centro `2_aux` y radio `90`.
3. Intersectar ambos circulos.
4. Elegir la posicion simetrica que deja a `3` con cota positiva.
5. Etiquetarla como `3_aux`.

Salida:

- `3_aux`.
- triangulo equilatero `1_aux-2_aux-3_aux`.

### 5. Pies de los vertices opuestos sobre `P`

Geometria usada:

- En un octaedro regular, los vertices `4,5,6` forman una cara paralela a `1-2-3`.
- La proyeccion ortogonal de cada vertice opuesto sobre el plano de apoyo se obtiene reflejando el vertice correspondiente de la base respecto del centro de la cara `1-2-3`.
- Si `G` es el centro de la cara base, entonces:
  - `F4` esta alineado con `1` y `G`, y `G` es punto medio de `1-F4`;
  - `F5` esta alineado con `2` y `G`, y `G` es punto medio de `2-F5`;
  - `F6` esta alineado con `3` y `G`, y `G` es punto medio de `3-F6`.

Esta construccion evita la ambiguedad de elegir triangulos equilateros exteriores sobre los lados.

#### 5.1. Construir el centro de la cara base

En `P_aux`:

1. Construir dos medianas del triangulo `1_aux-2_aux-3_aux`.
2. Intersectarlas para obtener `G`.
3. Etiquetar `G` como centro de la cara base.

#### 5.2. Reflejar los vertices de la base respecto a `G`

En `P_aux`:

1. Trazar la recta `1_aux-G`.
2. Con centro `G`, trazar un circulo que pase por `1_aux`.
3. Intersectar la recta `1_aux-G` con ese circulo y escoger la interseccion distinta de `1_aux`.
4. Etiquetar esa interseccion como `F4`.
5. Repetir el mismo procedimiento con `2_aux` para obtener `F5`.
6. Repetir el mismo procedimiento con `3_aux` para obtener `F6`.

Salida:

- pies `F4`, `F5`, `F6` en `P_aux`.

Nota:

- Estos puntos no son los vertices `4,5,6`; son sus pies ortogonales sobre `P`.

### 6. Construccion geometrica de la altura normal

Objetivo:

- Obtener la distancia normal `h` desde cada pie `F4`, `F5`, `F6` hasta el vertice correspondiente, sin usar formula.

#### 6.1. Elegir un pie de referencia

1. Usar `F4` como pie de referencia.
2. Tomar la distancia `F4-2` en `P_aux`. Esa distancia es una arista proyectada desde el futuro vertice `4` hasta el vertice `2` de la cara base.

#### 6.2. Transportar `F4-2` a una zona auxiliar de `P_aux`

1. Crear un punto auxiliar `H0` en una zona libre de `P_aux`.
2. Usar paralelas entre paralelas para construir desde `H0` un segmento `H0-R` congruente con `F4-2`.
3. Verificar que `H0-R` es una distancia transportada, no una coordenada calculada.

Salida:

- segmento `H0-R = F4-2`.

#### 6.3. Construir el triangulo rectangulo de la arista

1. Por `R`, trazar una perpendicular a `H0-R`.
2. Con centro `H0`, trazar un circulo de radio `90`.
3. Intersectar el circulo con la perpendicular por `R`.
4. El segmento `R-H` es la altura normal `h`.

Salida:

- segmento `h = R-H`.

Razon:

- El triangulo rectangulo tiene hipotenusa igual a la arista del octaedro (`90`) y un cateto igual a la distancia en el plano desde el pie `F4` hasta el vertice adyacente `2`.
- El otro cateto es la distancia perpendicular al plano de apoyo.
- No se introduce ninguna formula para `h`.

Subproceso recomendado:

- Crear subproceso `Construir altura normal del octaedro`.
- Dejar visible solo el segmento `h`.
- Ocultar `H0`, `R` y las paralelas auxiliares si ensucian el dibujo.

### 7. Proyectar `1,2,3,F4,F5,F6` desde `P_aux` a `P_H` y `P_V`

Objetivo:

- Obtener proyecciones reales en `P_H` y `P_V` para poder reconstruir puntos 3D con la herramienta `3D Point`.

#### 7.1. Subprocedimiento reusable: proyectar un punto de `P` a `P_H`

Para un punto `X_aux` de `P_aux`:

1. En `P_aux`, trazar la perpendicular a `p_H` por `X_aux`.
2. Intersectarla con `p_H`; llamar al punto `K`.
3. La distancia `K-X_aux` es la distancia de perfil sobre el plano `P`.
4. Transportar esa distancia a `P_YZ` sobre la recta `p_yz`, desde el punto de cota `0`, para obtener `X_YZ`.
5. Desde `X_YZ`, leer geometricamente el alejamiento de `X` respecto de `P_V`.
6. En `P_H`, por el punto `K_H` de la charnela, trazar el proyector perpendicular a `p_H`.
7. Transportar sobre ese proyector el alejamiento obtenido en `P_YZ`.
8. Marcar `X_H`.

Salida:

- proyeccion horizontal `X_H`.

#### 7.2. Subprocedimiento reusable: proyectar un punto de `P` a `P_V`

Para el mismo punto `X_aux`:

1. Reutilizar `X_YZ` obtenido en el paso anterior.
2. Desde `X_YZ`, tomar la cota de `X`.
3. En `P_V`, transportar el mismo desplazamiento paralelo a la linea de tierra que tiene `X_aux` respecto de `K` en `P_aux`.
4. Por esa posicion, trazar el proyector de cota correspondiente.
5. Transportar la cota desde `P_YZ` o desde la linea de tierra.
6. Marcar `X_V`.

Salida:

- proyeccion vertical `X_V`.

#### 7.3. Puntos a proyectar

Aplicar los subprocedimientos a:

- `1_aux`;
- `2_aux`;
- `3_aux`;
- `F4`;
- `F5`;
- `F6`.

Subprocesos recomendados:

- `Proyectar 1,2,3 desde P_aux`.
- `Proyectar pies F4,F5,F6 desde P_aux`.

Dejar visibles como salidas:

- `1_H`, `2_H`, `3_H`, `F4_H`, `F5_H`, `F6_H`;
- `1_V`, `2_V`, `3_V`, `F4_V`, `F5_V`, `F6_V`.

### 8. Levantar los vertices `4,5,6`

Objetivo:

- Desde cada pie `Fi`, levantar la distancia normal `h` para obtener el vertice real correspondiente.

#### 8.1. Construir las direcciones de la normal a `P`

Propiedad usada:

- La proyeccion horizontal de una recta normal a `P` es perpendicular a `p_H`.
- La proyeccion vertical de una recta normal a `P` es perpendicular a `p_V`.

Pasos:

1. En `P_H`, por `F4_H`, `F5_H`, `F6_H`, trazar perpendiculares a `p_H`.
2. En `P_V`, por `F4_V`, `F5_V`, `F6_V`, trazar perpendiculares a `p_V`.

Salida:

- direcciones proyectadas de las normales por cada pie.

#### 8.2. Obtener las componentes proyectadas de la altura `h`

Usar una unica seccion normal:

1. Llevar `h` a la seccion normal elegida.
2. Obtener geometricamente su componente horizontal sobre `P_H`.
3. Obtener geometricamente su componente vertical sobre `P_V`.
4. No registrar esas componentes como numeros; dejarlas como segmentos auxiliares construidos.

Salida:

- segmento `h_H`, componente que se transporta sobre las normales de `P_H`;
- segmento `h_V`, componente que se transporta sobre las normales de `P_V`.

#### 8.3. Transportar las componentes a cada pie

Para cada `Fi`:

1. Sobre la normal proyectada en `P_H`, transportar `h_H` con compas o paralelas.
2. Marcar el punto resultante como `i_H`.
3. Sobre la normal proyectada en `P_V`, transportar `h_V`.
4. Marcar el punto resultante como `i_V`.

Aplicar:

- desde `F4` para obtener `4_H`, `4_V`;
- desde `F5` para obtener `5_H`, `5_V`;
- desde `F6` para obtener `6_H`, `6_V`.

Salida:

- proyecciones `4_H`, `5_H`, `6_H`;
- proyecciones `4_V`, `5_V`, `6_V`.

### 9. Crear los puntos 3D

Usar la herramienta `3D Point`.

#### 9.1. Vertices de la cara apoyada

Crear:

- `1` desde `1_H` y `1_V`;
- `2` desde `2_H` y `2_V`;
- `3` desde `3_H` y `3_V`.

#### 9.2. Vertices levantados

Crear:

- `4` desde `4_H` y `4_V`;
- `5` desde `5_H` y `5_V`;
- `6` desde `6_H` y `6_V`.

Comprobacion:

- `1`, `2`, `3` deben pertenecer a `P`.
- `4`, `5`, `6` no deben pertenecer a `P`.
- `4`, `5`, `6` deben estar todos en el mismo lado de `P`.

### 10. Crear las aristas 3D

Usar la herramienta `3D Segment` a partir de proyecciones 2D.

Para cada arista:

1. Crear el segmento 2D entre sus extremos en `P_H`.
2. Crear el segmento 2D entre sus extremos en `P_V`.
3. Usar `3D Segment` seleccionando ambos segmentos 2D.
4. Etiquetar el segmento 3D con el nombre de la arista.

#### 10.1. Aristas de la cara apoyada

Crear:

- `1-2`;
- `2-3`;
- `3-1`.

#### 10.2. Aristas de la cara paralela

Crear:

- `4-5`;
- `5-6`;
- `6-4`.

#### 10.3. Aristas laterales

Crear:

- `4-2`;
- `4-3`;
- `5-1`;
- `5-3`;
- `6-1`;
- `6-2`.

### 11. Verificacion final

#### 11.1. Verificacion geometrica visible

1. En `P_aux`, comprobar que `1_aux-2_aux-3_aux` es equilatero de lado `90`.
2. En las proyecciones, comprobar que los vertices `4,5,6` no caen en el plano de apoyo.
3. En la vista 3D, comprobar que el octaedro no es plano.

#### 11.2. Verificacion por medidas construidas

Comprobar, con transporte de distancias o circulos auxiliares:

- todas las aristas de la cara apoyada son `90`;
- todas las aristas laterales son `90`;
- todas las aristas de la cara paralela son `90`.

#### 11.3. Verificacion de cotas

1. `1` debe tener cota `0`.
2. `2` debe tener cota `60`.

## Organizacion recomendada del arbol de procesos

Crear los siguientes subprocesos:

1. `Preparacion`
   - `Add YZ Plane`;
   - `Crear 1=(-20,105,0)`.
2. `Construir plano P`
   - trazas `p_H`, `p_V`;
   - plano 3D `P`.
3. `Abatir P`
   - `p_V'`;
   - `P_aux`.
4. `Cara 1-2-3 en verdadera magnitud`
   - recta de cota `60`;
   - circulos de radio `90`;
   - puntos `1_aux`, `2_aux`, `3_aux`.
5. `Pies F4,F5,F6`
   - triangulos equilateros auxiliares;
   - centros o pies.
6. `Altura normal`
   - transporte `F4-2`;
   - triangulo rectangulo;
   - segmento `h`.
7. `Proyecciones de puntos de P`
   - `1,2,3,F4,F5,F6` hacia `P_H` y `P_V`.
8. `Levantar 4,5,6`
   - normales proyectadas;
   - transporte de `h_H` y `h_V`.
9. `Reconstruir octaedro`
   - puntos 3D;
   - segmentos 3D.

Encapsular:

- `Preparacion`;
- `Construir plano P`;
- `Abatir P`;
- `Altura normal`;
- los subprocesos repetitivos de proyeccion.

Mantener como salidas:

- plano `P`;
- `P_aux`;
- vertices `1..6`;
- aristas 3D del octaedro;
- opcionalmente la cara `1-2-3` en `P_aux`.

## Riesgos y controles

### Riesgo: confundir vertices con pies

Control:

- Nombrar siempre los pies como `F4`, `F5`, `F6`.
- No crear `4`, `5`, `6` hasta haber transportado la altura normal.

### Riesgo: usar una distancia proyectada como distancia verdadera

Control:

- Toda distancia verdadera de la cara se construye en `P_aux`.
- Toda distancia entre planos se lleva primero a una charnela.
- Toda componente de la normal se obtiene en una seccion normal, no en una proyeccion arbitraria.

### Riesgo: crear una solucion plana

Control:

- Antes de crear aristas, comprobar que `4_H/4_V`, `5_H/5_V`, `6_H/6_V` no reconstruyen puntos sobre `P`.
- En la vista 3D, comprobar que `4,5,6` estan fuera de `P`.

### Riesgo: dos soluciones simetricas

Control:

- Documentar las elecciones:
  - orientacion de `p_H`;
  - interseccion elegida para `2`;
  - interseccion elegida para `3`;
  - lado de `P` en el que se levantan `4,5,6`.

## Criterio de exito

La construccion se considera correcta si:

1. todos los puntos derivados se han obtenido por herramientas geometricas;
2. ninguna coordenada final de `2,3,4,5,6` se ha introducido numericamente;
3. la altura normal se ha construido mediante triangulo rectangulo;
4. las 12 aristas 3D se han creado como segmentos 3D;
5. el octaedro aparece en las proyecciones de `P_H`, `P_V` y en la vista 3D;
6. la figura 3D no es plana.
