-- Migration pour ajouter le statut 'à_inscrire' aux inscriptions
-- Ce statut permet de distinguer les élèves importés qui doivent être validés avant d'être actifs

-- Aucune modification de schéma nécessaire car le champ statut est déjà TEXT
-- Cette migration sert de documentation et pourrait inclure des nettoyages de données si nécessaire

-- Mettre à jour les commentaires dans le schéma pour documenter le nouveau statut
-- Les valeurs possibles sont maintenant: 'active', 'à_inscrire', 'abandon', 'exclu'
