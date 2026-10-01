-- Migration pour supprimer le champ montant_inscription de la table tarifs_classe
-- Cette migration supprime la logique des frais d'inscription séparés
-- Les frais d'inscription sont maintenant intégrés directement dans le montant de la pension

-- Supprimer le champ montant_inscription de la table tarifs_classe
ALTER TABLE tarifs_classe DROP COLUMN montant_inscription;
