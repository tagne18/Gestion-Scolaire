-- Migration pour ajouter le champ redoublement à la table inscriptions
-- Valeurs possibles: 'premiere_inscription', 'redouble', 'classe_superieure'

ALTER TABLE inscriptions ADD COLUMN redoublement TEXT DEFAULT 'premiere_inscription';
