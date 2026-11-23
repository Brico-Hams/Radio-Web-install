# Rotors, tuners and power

The rotctld rotor uses position, target, mechanical limits, lease and STOP. It connects through loopback and does not authenticate local processes. An unconfirmed stop blocks movement.

IC-7300 provides CAT RF PWR and ATU insert/bypass under local permissions/limits. FTX-1 PC limits field/SPA-1 setpoints. Automatic tuning and generic amplifier/tuner control are not offered. The accessories layer supervises tuner and amplifier: the amplifier starts in STANDBY and returns to STANDBY on disconnect, high SWR, fault or emergency stop; tuning starts only on explicit request at 10 W or less, and devices without a documented protocol are listed as pendiente de fuente.

1. Configure the agent rotor with physical limits and independent stop.
2. Read position before movement and keep STOP accessible.
3. Read power/tuner state before adjustment; respect model-specific units.
4. Do not confuse ATU insertion with TUNE, or power setpoint with a meter.

[Technical reference (ES)](../../control-potencia-acoplador.md)
