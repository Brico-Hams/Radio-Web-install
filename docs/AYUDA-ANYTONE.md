# Guia AnyTone y canales locales

Esta pagina describe el preparador web AnyTone Beta. No sustituye al CPS
oficial ni programa la radio por USB. Los proyectos JSON y CSV son formatos de
intercambio propios: no son archivos RDT ni se deben cargar directamente en
el CPS suponiendo que sean codeplugs nativos. Haz una copia original con el
CPS del fabricante antes de cualquier escritura.

## Capacidades y modos

Selecciona un perfil de modelo y confirma por separado las capacidades que
hayas verificado en el manual de la variante exacta. Los perfiles de familia
no certifican caracteristicas de todas las revisiones. AM aeronautica y FM
comercial 87.5-108 MHz solo se habilitan para el perfil "Otro" con confirmacion
manual. Comprueba que el receptor cubra la banda y el modo; una frecuencia
aceptada no acredita que el hardware pueda recibirla.

Todos los canales son solo recepcion. AM requiere frecuencias RF en MHz, no el
designador de canal aeronautico 8.33 kHz; el preparador valida la rejilla
representable. No se crean transmisiones ni se certifica compatibilidad de
antena, filtro, firmware o CPS.

## Aeropuertos y banda aeronautica

El usuario aporta un JSON local con `results` (1-4000 filas). Cada registro
incluye `name`, `frequencyMHz` y `source` con referencia AIP vigente. Para
filtrar por proximidad puede incluir `latitude` y `longitude`; al seleccionar
una ubicacion, el navegador solicita permiso y la usa en memoria local, sin
enviar coordenadas a un servicio. Los registros sin coordenadas o fuera del
radio elegido se omiten. Sin ubicacion se procesa la lista completa.

Consulta las frecuencias RF y los servicios vigentes en
[AIP ENAIRE](https://aip.enaire.es/). No se incluye una base nacional de
frecuencias, no se descargan datos automaticamente y no se convierten
designadores 8.33 kHz. La app ofrece el canal 121.500 MHz como opcion manual,
solo RX; verifica el procedimiento y vigencia en las fuentes oficiales. No
utilices la frecuencia de guardia para comunicaciones rutinarias.

## Emisoras FM comerciales locales

Para importar emisoras, verifica primero en el manual exacto que el equipo
reciba FM comercial 87.5-108 MHz. Prepara un archivo local con `results` y los
campos `name`, `frequencyMHz` (o `frequency`), `latitude`, `longitude` y
`source`. El filtro usa distancia en km respecto a la ubicacion consentida y
al radio seleccionado (1-500 km). No hay un catalogo nacional precargado ni
scraping; usa una fuente autorizada, actual y adecuada a tu region. La
aplicacion no certifica la licencia ni la exactitud de los datos aportados.

Los canales resultantes quedan marcados `FM_Broadcast_RX` en el CSV de
intercambio, con RX y TX nominal iguales y TX bloqueada en el editor. Esa marca
no habilita transmision, ni transforma el CSV en formato AnyTone. Los canales
comerciales requieren confirmar capacidad en el proyecto JSON y no se pueden
abrir bajo un perfil de radio que no tenga esa confirmacion.

## Repetidores y REMER

Se pueden importar datos locales autorizados de repetidores RadioID, URE y
RepeaterBook segun el formato esperado por el editor. Los tonos analogicos se
conservan como nota para revision; no se infieren ni se programan a partir de
la frecuencia. Comprueba vigencia, desplazamiento, CC, TS, TG, contactos,
listas de recepcion y limites del modelo en el CPS.

La pestaña REMER esta disponible en los planificadores compatibles de Quansheng
y OpenGD77. Su tabla VHF es una transcripcion de la referencia aportada por el
usuario, sin fecha verificable; contrasta cada dato con REMER. Los CTCSS se
muestran como nota y no se importan como ajustes. Las frecuencias HF/SSB se
excluyen de la importacion de memorias FM. Que un parser vuelva a leer un canal
solo valida la estructura del archivo: no demuestra vigencia, recepcion RF ni
visibilidad en el firmware tras una escritura.

## Guardar y revisar

El editor permite anadir, modificar y borrar canales del proyecto local.
Exporta el JSON para preservar el trabajo y el CSV solo como referencia o
intercambio manual. Al importar binarios OpenGD77 o Quansheng se trasladan
unicamente campos reconocidos; parametros propietarios, tonos, zonas y
contactos pueden requerir reconstruccion en el CPS de destino. La revision
final, conversion al formato nativo y escritura se hacen con el CPS oficial,
despues de revisar el resultado y guardar una copia intacta.
