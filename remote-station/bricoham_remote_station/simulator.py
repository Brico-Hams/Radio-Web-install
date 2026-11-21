from bricoham_remote_station.contracts import (
    API_VERSION,
    STATUS_SCHEMA_VERSION,
    RadioProfile,
    SpectrumStatus,
    StationSnapshot,
    TransmissionStatus,
    WaterfallStatus,
)

_SPECTRUM_UNAVAILABLE = "Espectro nativo no disponible: pendiente de validación del protocolo."
_WATERFALL_UNAVAILABLE = "Waterfall nativo no disponible: pendiente de validación del protocolo."


class DeterministicSimulator:
    """Fixed demo data; never opens a radio or emits CAT/PTT operations."""

    def snapshot(self) -> dict[str, object]:
        return StationSnapshot(
            api_version=API_VERSION,
            schema_version=STATUS_SCHEMA_VERSION,
            station_id="demo-station",
            name="Estación de demostración",
            callsign="EA5KAO",
            source="deterministic_simulator",
            data_is_simulated=True,
            hardware_connected=False,
            radio_profile=RadioProfile(
                manufacturer="Yaesu",
                model="FTX-1",
                profile_only=True,
                accessory_profile="SPA-1",
            ),
            frequency_hz=14_074_000,
            vfo="A",
            mode="USB",
            band="20m",
            tx=TransmissionStatus(
                enabled=False,
                ptt_available=False,
                state="blocked",
                reason="TX remoto no está implementado en esta versión.",
            ),
            spectrum=SpectrumStatus(
                status="unsupported",
                samples=None,
                message=_SPECTRUM_UNAVAILABLE,
            ),
            waterfall=WaterfallStatus(
                status="unsupported",
                data=None,
                message=_WATERFALL_UNAVAILABLE,
            ),
        ).to_dict()
