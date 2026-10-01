-- Migration pour ajouter la colonne montant_inscription à la table inscriptions si elle n'existe pas
-- Cette migration utilise une approche conditionnelle pour éviter les erreurs

-- SQLite n'a pas de ALTER TABLE IF NOT EXISTS pour les colonnes, donc on utilise une approche basée sur les métadonnées
-- On essaie d'ajouter la colonne, et si elle existe déjà, SQLite renverra une erreur qu'on ignore

ALTER TABLE inscriptions ADD COLUMN montant_inscription DECIMAL(10,2) DEFAULT 0;
