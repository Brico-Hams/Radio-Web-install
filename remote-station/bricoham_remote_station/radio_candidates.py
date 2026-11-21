from dataclasses import asdict, dataclass
from typing import Literal

from bricoham_remote_station.contracts import API_VERSION

RADIO_CANDIDATE_SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class RadioCandidate:
    manufacturer: str
    model: str
    connection_claim: str
    bands_claim: str
    third_party_scope_claim: Literal["yes", "no", "not_stated", "not_in_source"]
    third_party_tested: Literal["yes", "not_stated", "not_in_source"]
    third_party_support_status: Literal["beta", "not_stated", "not_in_source"]
    evidence_source: Literal["third_party_listing", "manufacturer_project_docs"]
    source_url: str
    bricoham_status: Literal["candidate"]


def _remote_my_shack_candidate(
    manufacturer: str,
    model: str,
    connection: str,
    bands: str,
    scope: Literal["yes", "no", "not_stated"],
    tested: Literal["yes", "not_stated"],
    slug: str,
) -> RadioCandidate:
    return RadioCandidate(
        manufacturer=manufacturer,
        model=model,
        connection_claim=connection,
        bands_claim=bands,
        third_party_scope_claim=scope,
        third_party_tested=tested,
        third_party_support_status=(
            "beta"
            if manufacturer in {"Kenwood", "Yaesu", "Elecraft", "Hermes Lite"}
            else "not_stated"
        ),
        evidence_source="third_party_listing",
        source_url=f"https://www.remotemyshack.com/radios/{slug}",
        bricoham_status="candidate",
    )


_CANDIDATES = (
    _remote_my_shack_candidate(
        "Icom", "IC-705", "Wi-Fi or USB", "160m-6m, 2m, 70cm", "yes", "yes", "icom-ic-705"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7100", "USB", "160m-6m, 2m, 70cm", "no", "not_stated", "icom-ic-7100"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7200", "USB", "160m-6m", "no", "not_stated", "icom-ic-7200"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7300", "USB", "160m-6m", "yes", "not_stated", "icom-ic-7300"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7300MK2", "Ethernet or USB", "160m-6m", "yes", "yes", "icom-ic-7300mk2"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7410", "USB", "160m-6m", "no", "not_stated", "icom-ic-7410"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7600", "USB", "160m-6m", "no", "not_stated", "icom-ic-7600"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7610", "Ethernet or USB", "160m-6m", "yes", "yes", "icom-ic-7610"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7700", "Ethernet", "160m-6m", "no", "not_stated", "icom-ic-7700"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7760", "Ethernet", "160m-6m", "yes", "not_stated", "icom-ic-7760"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7800", "Ethernet", "160m-6m", "no", "not_stated", "icom-ic-7800"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7850", "Ethernet or USB", "160m-6m", "yes", "not_stated", "icom-ic-7850"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-7851", "Ethernet or USB", "160m-6m", "yes", "not_stated", "icom-ic-7851"
    ),
    _remote_my_shack_candidate(
        "Icom",
        "IC-905",
        "Ethernet or USB",
        "2m, 70cm, 23cm, 13cm, 6cm, 3cm",
        "yes",
        "not_stated",
        "icom-ic-905",
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-9100", "USB", "160m-6m, 2m, 70cm", "no", "not_stated", "icom-ic-9100"
    ),
    _remote_my_shack_candidate(
        "Icom", "IC-9700", "Ethernet or USB", "2m, 70cm, 23cm", "yes", "not_stated", "icom-ic-9700"
    ),
    _remote_my_shack_candidate(
        "Icom",
        "IC-R8600 (receiver)",
        "Ethernet",
        "Receive 10kHz-3GHz",
        "yes",
        "not_stated",
        "icom-ic-r8600",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "AURORA-510",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-aurora-510",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "AURORA-510M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-aurora-510m",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "AURORA-520",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-aurora-520",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "AURORA-520M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-aurora-520m",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-6400",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-6400",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-6400M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-6400m",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-6600",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "yes",
        "flexradio-flex-6600",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-6600M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-6600m",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-6700",
        "Ethernet / SmartSDR",
        "160m-6m, 2m",
        "yes",
        "not_stated",
        "flexradio-flex-6700",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-8400",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-8400",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-8400M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-8400m",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-8600",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-8600",
    ),
    _remote_my_shack_candidate(
        "FlexRadio",
        "FLEX-8600M",
        "Ethernet / SmartSDR",
        "160m-6m",
        "yes",
        "not_stated",
        "flexradio-flex-8600m",
    ),
    _remote_my_shack_candidate(
        "Kenwood", "TS-590S", "USB", "160m-6m", "no", "not_stated", "kenwood-ts-590s"
    ),
    _remote_my_shack_candidate(
        "Kenwood", "TS-590SG", "USB", "160m-6m", "no", "not_stated", "kenwood-ts-590sg"
    ),
    _remote_my_shack_candidate(
        "Kenwood", "TS-890S", "Ethernet or USB", "160m-6m", "no", "not_stated", "kenwood-ts-890s"
    ),
    _remote_my_shack_candidate(
        "Kenwood", "TS-990S", "Ethernet or USB", "160m-6m", "no", "not_stated", "kenwood-ts-990s"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FT-710", "USB", "160m-6m", "no", "not_stated", "yaesu-ft-710"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FT-991A", "USB", "160m-6m, 2m, 70cm", "no", "not_stated", "yaesu-ft-991a"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FTDX10", "USB", "160m-6m", "no", "not_stated", "yaesu-ftdx10"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FTDX101D", "USB", "160m-6m", "no", "not_stated", "yaesu-ftdx101d"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FTDX101MP", "USB", "160m-6m", "no", "not_stated", "yaesu-ftdx101mp"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FTDX3000", "USB", "160m-6m", "no", "not_stated", "yaesu-ftdx3000"
    ),
    _remote_my_shack_candidate(
        "Yaesu", "FTX-1", "USB", "160m-6m, 2m, 70cm", "not_stated", "not_stated", "yaesu-ftx-1"
    ),
    _remote_my_shack_candidate(
        "Elecraft", "K3S", "USB", "160m-6m", "no", "not_stated", "elecraft-k3s"
    ),
    _remote_my_shack_candidate(
        "Elecraft", "K4", "Ethernet or USB", "160m-6m", "not_stated", "not_stated", "elecraft-k4"
    ),
    _remote_my_shack_candidate(
        "Hermes Lite",
        "Hermes Lite 2",
        "Ethernet / SDR",
        "160m-10m",
        "yes",
        "not_stated",
        "hermes-lite-2",
    ),
    RadioCandidate(
        manufacturer="DL2MAN",
        model="(tr)uSDX",
        connection_claim="Micro-USB serial; firmware-dependent",
        bands_claim="80m, 60m, 40m, 30m, 20m default; configuration varies",
        third_party_scope_claim="not_in_source",
        third_party_tested="not_in_source",
        third_party_support_status="not_in_source",
        evidence_source="manufacturer_project_docs",
        source_url="https://dl2man.de/5-trusdx-details/",
        bricoham_status="candidate",
    ),
    RadioCandidate(
        manufacturer="QRP Labs",
        model="QMX+",
        connection_claim="USB-C; virtual COM and USB audio documented",
        bands_claim="160m-6m",
        third_party_scope_claim="not_in_source",
        third_party_tested="not_in_source",
        third_party_support_status="not_in_source",
        evidence_source="manufacturer_project_docs",
        source_url="https://qrp-labs.com/qmxp.html",
        bricoham_status="candidate",
    ),
    *(
        RadioCandidate(
            manufacturer="Elecraft",
            model=model,
            connection_claim="Serial CAT; documented model-specific cable/interface required",
            bands_claim="RF band coverage not assessed by this CAT reference",
            third_party_scope_claim="not_in_source",
            third_party_tested="not_in_source",
            third_party_support_status="not_in_source",
            evidence_source="manufacturer_project_docs",
            source_url="https://ftp.elecraft.com/K3S/Manuals%20Downloads/K3S%26K3%26KX3%26KX2%20Pgmrs%20Ref,%20G5.pdf",
            bricoham_status="candidate",
        )
        for model in ("K3", "KX3", "KX2")
    ),
)


def radio_candidate_catalog() -> dict[str, object]:
    return {
        "api_version": API_VERSION,
        "schema_version": RADIO_CANDIDATE_SCHEMA_VERSION,
        "hardware_validation_complete": False,
        "notice": (
            "Los datos de RemoteMyShack son afirmaciones de terceros; "
            "no representan soporte ni pruebas de BricoHam."
        ),
        "candidates": [asdict(candidate) for candidate in _CANDIDATES],
    }


def radio_candidates() -> tuple[RadioCandidate, ...]:
    return _CANDIDATES
