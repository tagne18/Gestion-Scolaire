-- Migration pour ajouter les dates limites de tranches à tarifs_classe
-- Exécuter ce script sur une base de données existante

ALTER TABLE tarifs_classe ADD COLUMN date_limite_tranche_1 DATE;
ALTER TABLE tarifs_classe ADD COLUMN date_limite_tranche_2 DATE;
ALTER TABLE tarifs_classe ADD COLUMN date_limite_tranche_3 DATE;
