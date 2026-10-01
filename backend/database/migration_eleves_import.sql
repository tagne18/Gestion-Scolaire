-- Migration pour stocker la classe d'origine des élèves importés depuis SQL
-- Cette table permet de conserver l'information de la classe d'origine pour la réinscription

CREATE TABLE IF NOT EXISTS eleves_import (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    classe_origine TEXT NOT NULL, -- Nom de la classe d'origine (ex: "CP", "Nursery 1")
    date_import DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(eleve_id)
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_eleves_import_eleve_id ON eleves_import(eleve_id);
