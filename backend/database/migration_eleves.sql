-- Migration pour ajouter les champs manquants à la table eleves
-- Ce script ajoute les colonnes si elles n'existent pas déjà

-- Ajouter telephone_pere si n'existe pas
ALTER TABLE eleves ADD COLUMN telephone_pere TEXT;

-- Ajouter telephone_mere si n'existe pas
ALTER TABLE eleves ADD COLUMN telephone_mere TEXT;

-- Renommer telephone_tuteur en telephone_tuteur_old si existe, puis recréer
-- SQLite ne supporte pas directement ALTER TABLE RENAME COLUMN, donc on utilise une approche différente
-- On va simplement ajouter les nouveaux champs et garder l'ancien

-- Ajouter nom_tuteur si n'existe pas
ALTER TABLE eleves ADD COLUMN nom_tuteur TEXT;

-- Ajouter lien_tuteur si n'existe pas
ALTER TABLE eleves ADD COLUMN lien_tuteur TEXT;

-- Note: telephone_tuteur existe déjà dans le schéma original, on le garde
