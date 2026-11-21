# PTT, limites et sécurité RF

Le PTT FTX-1 expérimental est désactivé par défaut et peut émettre réellement. Il exige MAIN VFO simplex LSB/USB, sans split/clarificateur TX et limites locales de fréquence, consigne PC et durée. CAT donne une consigne, pas une puissance RF mesurée.

Le bail CAT exclusif dure deux secondes, renouvelées pendant l'appui, avec plafond absolu. STOP incertain bloque START et réessaie RX. Le logiciel ne garantit pas l'arrêt après perte USB/processus, VOX/PTT local ni l'absence de toute attaque.

1. Utilisez ARRÊTER TX / confirmer RX avant le premier START.
2. Respectez autorisations, bandes et protections RF locales.
3. Gardez un arrêt physique indépendant d'USB et un opérateur de station accessible.
4. N'exposez pas CAT, rotctld ou UDP WSJT-X ; utilisez TLS, pare-feu et secrets séparés.
5. CW virtuel et TX numérique actif ne sont pas implémentés ; aucun bouton fictif ne les remplace.

[Référence technique (ES)](../../ptt-ftx1.md)
