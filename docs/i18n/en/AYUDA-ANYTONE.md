# AnyTone guide and local channels

This page describes the AnyTone Beta web preparer. It does not replace the
official CPS or program the radio over USB. JSON and CSV projects are custom
exchange formats: they are not RDT files and must not be loaded directly into
the CPS as if they were native codeplugs. Make an original backup with the
manufacturer's CPS before writing anything.

## Capabilities and modes

Select a model profile and separately confirm the capabilities you have
verified in the manual for the exact variant. Family profiles do not certify
features for every revision. Airband AM and commercial FM 87.5-108 MHz are
enabled only for the "Other" profile with manual confirmation. Check that the
receiver covers the band and mode; an accepted frequency does not prove that
the hardware can receive it.

All channels are receive-only. AM requires RF frequencies in MHz, not the
8.33 kHz aeronautical channel designator; the preparer validates the
representable raster. No transmissions are created, and antenna, filter,
firmware, or CPS compatibility is not certified.

## Airports and the airband

The user supplies a local JSON file with `results` (1-4000 rows). Each record
includes `name`, `frequencyMHz`, and `source` with a current AIP reference. To
filter by proximity, it may include `latitude` and `longitude`; when a location
is selected, the browser requests permission and uses it in local memory,
without sending coordinates to a service. Records without coordinates or
outside the selected radius are omitted. Without a location, the full list is
processed.

Check RF frequencies and current services in
[AIP ENAIRE](https://aip.enaire.es/). No national frequency database is
included, data is not downloaded automatically, and 8.33 kHz designators are
not converted. The app offers 121.500 MHz as a manual option, receive-only;
verify the procedure and current status in official sources. Do not use the
guard frequency for routine communications.

## Local commercial FM stations

Before importing stations, first verify in the exact manual that the equipment
receives commercial FM 87.5-108 MHz. Prepare a local file with `results` and
the fields `name`, `frequencyMHz` (or `frequency`), `latitude`, `longitude`,
and `source`. The filter uses distance in km from the consented location and
the selected radius (1-500 km). There is no preloaded national catalog or
scraping; use an authorized, current source appropriate for your region. The
application does not certify the license or accuracy of supplied data.

The resulting channels are marked `FM_Broadcast_RX` in the exchange CSV, with
nominal RX and TX set equal and TX locked in the editor. That mark does not
enable transmission or turn the CSV into an AnyTone format. Commercial
channels require confirming capability in the JSON project and cannot be
opened under a radio profile without that confirmation.

## Repeaters and REMER

Authorized local data from RadioID, URE, and RepeaterBook repeaters can be
imported in the format expected by the editor. Analog tones are retained as a
note for review; they are not inferred or programmed from the frequency. Check
current status, offset, CC, TS, TG, contacts, receive lists, and model limits in
the CPS.

The REMER tab is available in compatible Quansheng and OpenGD77 planners. Its
VHF table is a transcription of the reference supplied by the user, with no
verifiable date; cross-check every item with REMER. CTCSS values are shown as
notes and are not imported as settings. HF/SSB frequencies are excluded from
FM memory imports. A parser reading a channel again only validates the file's
structure: it does not demonstrate current status, RF reception, or visibility
in the firmware after writing.

## Save and review

The editor lets you add, modify, and delete channels in the local project.
Export the JSON to preserve your work and the CSV only as a reference or for
manual exchange. When importing OpenGD77 or Quansheng binaries, only recognized
fields are transferred; proprietary parameters, tones, zones, and contacts may
need to be rebuilt in the destination CPS. Final review, conversion to the
native format, and writing are done with the official CPS, after reviewing the
result and saving an untouched copy.