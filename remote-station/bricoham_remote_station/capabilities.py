from bricoham_remote_station.contracts import (
    API_VERSION,
    CAPABILITY_SCHEMA_VERSION,
    CapabilityRecord,
    CapabilityStatus,
)

_FTX1_LIMITATION = (
    "Estado de la aplicación; no afirma ni descarta que el hardware pueda ofrecer esta función.",
    "BricoHam no lo ha validado con una FTX-1 física ni con una versión de firmware concreta.",
)

_FTX1_CAPABILITIES = (
    (
        "cat_read",
        "Consultas experimentales FA/FB en Hz, MD0/MD1, ID, PC, AC, TX, FT, ST e IF de lectura; "
        "transporte serie opt-in, sin setters.",
        "Manual oficial CAT 2508-C cotejado; pruebas de software, no de hardware.",
        "https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/"
        "FTX-1_CAT_OM_ENG_2508-C.pdf",
    ),
    (
        "cat_write",
        "PC limitado al cabezal y FA/FB/MD0/MD1 MAIN/SUB con opt-ins separados y readback.",
        "Esta ruta no selecciona VFO activo ni emite PTT/ATU. W de consigna, no medida RF; "
        "hardware sin validar.",
        "https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/"
        "FTX-1_CAT_OM_ENG_2508-C.pdf",
    ),
    (
        "rx_audio",
        "Captura PCM host opt-in, enlace autenticado y AudioWorklet experimental.",
        "Entrada explícita; ruta USB/radio y reproducción móvil aún no validadas.",
        None,
    ),
    (
        "tx_audio",
        "Micrófono remoto PCM16LE 48 kHz por WebSocket autenticado y TLS/mTLS.",
        "Opt-in con DAC USB explícito, VOX desactivado y capacidad ligada a PTT. "
        "Silencio hasta TX confirmado; rutas USB/RF y captura móvil sin validar.",
        None,
    ),
    (
        "native_spectrum",
        "No hay lector de muestras de espectro nativo implementado.",
        "El comando SS descrito por Hamlib consulta/ajusta parámetros; "
        "no demuestra un flujo de muestras.",
        "https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1_ext.c",
    ),
    (
        "native_waterfall",
        "No hay lector de datos de waterfall nativo implementado.",
        "No se ha verificado un protocolo de exportación de datos.",
        None,
    ),
    (
        "remote_ptt",
        "PTT CAT opt-in separado, MAIN simplex SSB, sesión exclusiva y watchdog.",
        "Desactivado por defecto; límites locales de frecuencia/consigna/tiempo, "
        "audio TX PCM opcional con DAC explícito y capacidad de sesión; sin validación RF. "
        "No sustituye un interlock físico.",
        "https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/"
        "FTX-1_CAT_OM_ENG_2508-C.pdf",
    ),
    (
        "spa1_control",
        "PC de lectura y consigna de potencia limitada vía FTX-1, sin interfaz SPA-1 separada.",
        "Solo manual 2508-C y pruebas de software; no acredita firmware ni potencia RF medida.",
        "https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/"
        "FTX-1_CAT_OM_ENG_2508-C.pdf",
    ),
)


_TRUSDX_CAPABILITIES = (
    (
        "cat_read",
        "Codec (tr)uSDX y transporte serie de lectura experimental opt-in.",
        "La documentación publica FA, MD, IF e ID; BricoHam no lo ha probado en radio.",
        "https://dl2man.de/5-trusdx-details/",
    ),
    (
        "cat_write",
        "No se envían setters CAT al equipo.",
        "La documentación incluye comandos de escritura, incluidos TX/RX.",
        "https://dl2man.de/5-trusdx-details/",
    ),
    (
        "rx_audio",
        "Captura PCM de entrada host explícita y transporte RX experimental.",
        "Necesita ruta de audio externa; el stream serie nativo no está integrado ni validado.",
        "https://dl2man.de/5-trusdx-details/",
    ),
    (
        "native_spectrum",
        "No hay lector de muestras de espectro implementado.",
        "La página describe una vista local del equipo, no un stream de muestras.",
        "https://dl2man.de/4-trusdx-manual/",
    ),
    (
        "native_waterfall",
        "No hay lector de waterfall nativo implementado.",
        "No se ha verificado un protocolo de exportación de waterfall.",
        "https://dl2man.de/5-trusdx-details/",
    ),
    (
        "remote_ptt",
        "PTT/TX no están implementados en BricoHam.",
        "La documentación indica que RTS puede accionar CW/PTT; no se controla.",
        "https://dl2man.de/5-trusdx-details/",
    ),
)

_QMX_PLUS_CAPABILITIES = (
    (
        "cat_read",
        "Parser/allowlist QMX+ y transporte serie de lectura experimental opt-in.",
        "QRP Labs documenta consultas de solo lectura en el manual CAT 1.04.004+; "
        "BricoHam no lo ha probado con hardware.",
        "https://qrp-labs.com/images/qmx/manuals/cat_1_04_004.pdf",
    ),
    (
        "cat_write",
        "No se envían setters CAT al equipo.",
        "Las escrituras CAT no se han integrado ni validado con hardware.",
        "https://qrp-labs.com/images/qmx/manuals/cat_1_04_004.pdf",
    ),
    (
        "rx_audio",
        "Captura PCM de entrada host explícita y transporte RX experimental.",
        "QRP Labs documenta USB Audio; las rutas del dispositivo no se han validado.",
        "https://qrp-labs.com/qmxp.html",
    ),
    (
        "native_spectrum",
        "No hay lector de muestras de scope nativo implementado.",
        "La salida IQ documentada no demuestra exportación del scope nativo.",
        "https://qrp-labs.com/qmxp.html",
    ),
    (
        "native_waterfall",
        "No hay lector de waterfall nativo implementado.",
        "No se ha verificado un protocolo de exportación de waterfall.",
        "https://qrp-labs.com/qmxp.html",
    ),
    (
        "remote_ptt",
        "PTT/TX no están implementados en BricoHam.",
        "La documentación describe control TX por CAT; esta ruta sigue bloqueada.",
        "https://qrp-labs.com/images/qmx/manuals/cat_1_04_004.pdf",
    ),
)


def _capabilities(
    manufacturer: str,
    model: str,
    connection: str,
    entries: tuple[tuple[str, str, str, str | None], ...],
    limitations: tuple[str, ...],
    experimental_functions: tuple[str, ...] = (),
) -> tuple[CapabilityRecord, ...]:
    return tuple(
        CapabilityRecord(
            manufacturer=manufacturer,
            model=model,
            connection=connection,
            function=function,
            status=(
                CapabilityStatus.EXPERIMENTAL
                if function in experimental_functions
                else CapabilityStatus.UNSUPPORTED
            ),
            source_document=source_document,
            implementation=implementation,
            test="tests/test_capabilities.py::CapabilityRegistryTests",
            hardware_used=None,
            validated_at=None,
            limitations=(limitation, *limitations),
        )
        for function, implementation, limitation, source_document in entries
    )


def ftx1_capabilities() -> tuple[CapabilityRecord, ...]:
    return _capabilities(
        "Yaesu",
        "FTX-1",
        "USB",
        _FTX1_CAPABILITIES,
        _FTX1_LIMITATION,
        experimental_functions=(
            "cat_read",
            "cat_write",
            "rx_audio",
            "tx_audio",
            "spa1_control",
            "remote_ptt",
        ),
    )


def trusdx_capabilities() -> tuple[CapabilityRecord, ...]:
    return _capabilities(
        "DL2MAN",
        "(tr)uSDX",
        "Micro-USB",
        _TRUSDX_CAPABILITIES,
        (
            "BricoHam no lo ha probado en hardware ni con una revisión de firmware concreta.",
            "El proyecto indica CC BY-ND 4.0 para su software; no se reutiliza código.",
        ),
        experimental_functions=("cat_read", "rx_audio"),
    )


def qmx_plus_capabilities() -> tuple[CapabilityRecord, ...]:
    return _capabilities(
        "QRP Labs",
        "QMX+",
        "USB-C",
        _QMX_PLUS_CAPABILITIES,
        (
            "BricoHam no lo ha probado en hardware ni con una revisión de PCB/firmware concreta.",
            "Las funciones CAT dependen de la versión de firmware indicada por el fabricante.",
        ),
        experimental_functions=("cat_read", "rx_audio"),
    )


def _model_entry(
    manufacturer: str,
    model: str,
    connection: str,
    capabilities: tuple[CapabilityRecord, ...],
) -> dict[str, object]:
    return {
        "manufacturer": manufacturer,
        "model": model,
        "firmware": None,
        "connection": connection,
        "capabilities": [capability.to_dict() for capability in capabilities],
    }


def capability_catalog() -> dict[str, object]:
    return {
        "schema_version": CAPABILITY_SCHEMA_VERSION,
        "api_version": API_VERSION,
        "models": [
            _model_entry("Yaesu", "FTX-1", "USB", ftx1_capabilities()),
            _model_entry("DL2MAN", "(tr)uSDX", "Micro-USB", trusdx_capabilities()),
            _model_entry("QRP Labs", "QMX+", "USB-C", qmx_plus_capabilities()),
        ],
        "hardware_validation_complete": False,
    }
