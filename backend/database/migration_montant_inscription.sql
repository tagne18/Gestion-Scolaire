-- Migration pour ajouter le montant d'inscription aux tarifs
ALTER TABLE tarifs_classe ADD COLUMN montant_inscription DECIMAL(10,2) DEFAULT 0;

-- Migration pour ajouter le montant d'inscription aux inscriptions
ALTER TABLE inscriptions ADD COLUMN montant_inscription DECIMAL(10,2) DEFAULT 0;
