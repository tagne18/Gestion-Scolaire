-- Migration pour ajouter la table evenements
-- Exécuter ce script sur la base de données existante

CREATE TABLE IF NOT EXISTS evenements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- vacances, fete, examen, reunion, autre
    date_debut DATE NOT NULL,
    date_fin DATE,
    annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
    classe_id INTEGER REFERENCES classes(id), -- NULL = tous les élèves
    actif INTEGER DEFAULT 1,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);
