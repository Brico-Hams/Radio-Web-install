# Connexion et authentification

La console web utilise son propre hôte. Android/iOS demandent l'URL HTTPS de l'hôte, sans identifiants, chemin ou paramètres. Le jeton reste seulement en mémoire : aucun fichier, cookie ou stockage local.

Admin et opérateur accèdent aux commandes autorisées ; l'auditeur reçoit RX et les données permises, pas le PTT. L'invité est restreint. Une session connectée ne prouve pas qu'une radio physique est connectée.

1. Saisissez l'hôte HTTPS si demandé et le jeton de votre rôle.
2. Cliquez sur Connecter et vérifiez les avis d'autorisation et de disponibilité de l'agent.
3. Configurez CA/nom d'hôte fiables et origines autorisées ; n'ignorez jamais un certificat.
4. Déconnectez avant de changer d'hôte ou d'identifiants.

[Référence technique (ES)](../../despliegue-seguro.md)
