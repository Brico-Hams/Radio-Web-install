# Android, tablette, iPhone et iPad

Les clients partagent la console responsive et les commandes disponibles. Android demande le microphone lors de la préparation audio, pas à l'entrée. iOS possède sa description d'usage.

L'APK debug est compilé, sans signature de production ni essai tablette. Projets iPhone/iPad préparés, sans IPA validée. L'agent Android USB OTG indépendant n'est pas encore implémenté.

1. Utilisez un certificat reconnu par l'appareil et autorisez l'origine native sur l'hôte.
2. Gardez l'app au premier plan pendant PTT ; masquer/fermer demande RX et libère le microphone.
3. Si un dialogue annule la préparation, répétez le geste après autorisation ; TX n'est pas répété.
4. Validez cycle de vie, audio et export ADIF avant réception finale.

[Référence technique (ES)](../../clientes-moviles.md)
