-- Table des élèves (identité permanente)
CREATE TABLE IF NOT EXISTS eleves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    sexe TEXT,
    date_naissance DATE,
    lieu_naissance TEXT,
    nom_pere TEXT,
    telephone_pere TEXT,
    nom_mere TEXT,
    telephone_mere TEXT,
    nom_tuteur TEXT,
    telephone_tuteur TEXT,
    lien_tuteur TEXT,
    adresse TEXT,
    photo_path TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des années scolaires
CREATE TABLE IF NOT EXISTS annees_scolaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle TEXT UNIQUE NOT NULL, -- ex: "2025/2026"
    date_debut DATE,
    date_fin DATE,
    active INTEGER DEFAULT 0 -- une seule année active à la fois
);

-- Table des sections
CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL -- Francophone / Anglophone
);

-- Table des classes
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL, -- SIL, CP, CE1... / Nursery, Class 1...
    niveau TEXT NOT NULL, -- Maternelle / Primaire
    section_id INTEGER NOT NULL REFERENCES sections(id)
);

-- Tarifs par classe et par année scolaire
CREATE TABLE IF NOT EXISTS tarifs_classe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classe_id INTEGER NOT NULL REFERENCES classes(id),
    annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
    montant_inscription DECIMAL(10,2) DEFAULT 0,
    montant_pension_annuel DECIMAL(10,2) NOT NULL,
    tranche_1 DECIMAL(10,2) DEFAULT 0,
    tranche_2 DECIMAL(10,2) DEFAULT 0,
    tranche_3 DECIMAL(10,2) DEFAULT 0,
    date_limite_tranche_1 DATE,
    date_limite_tranche_2 DATE,
    date_limite_tranche_3 DATE,
    UNIQUE(classe_id, annee_scolaire_id)
);

-- Table des inscriptions (inscription annuelle d'un élève)
CREATE TABLE IF NOT EXISTS inscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES eleves(id),
    annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
    classe_id INTEGER NOT NULL REFERENCES classes(id),
    section_id INTEGER NOT NULL REFERENCES sections(id),
    montant_inscription DECIMAL(10,2) DEFAULT 0,
    montant_pension DECIMAL(10,2) NOT NULL,
    reduction DECIMAL(10,2) DEFAULT 0,
    motif_reduction TEXT,
    statut TEXT DEFAULT 'active', -- active / à_inscrire / abandon / exclu
    date_inscription DATE DEFAULT CURRENT_DATE,
    UNIQUE(eleve_id, annee_scolaire_id)
);

-- Table des tranches (générées automatiquement à l'inscription)
CREATE TABLE IF NOT EXISTS tranches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inscription_id INTEGER NOT NULL REFERENCES inscriptions(id),
    numero INTEGER NOT NULL,
    libelle TEXT,
    montant_attendu DECIMAL(10,2) NOT NULL,
    date_limite DATE
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS paiements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inscription_id INTEGER NOT NULL REFERENCES inscriptions(id),
    tranche_id INTEGER REFERENCES tranches(id),
    montant DECIMAL(10,2) NOT NULL,
    mode TEXT NOT NULL, -- Especes / Mobile
    date_paiement DATE DEFAULT CURRENT_DATE,
    date_heure_paiement DATETIME,
    numero_recu TEXT UNIQUE,
    encaisse_par INTEGER REFERENCES utilisateurs(id),
    annule INTEGER DEFAULT 0,
    motif_annulation TEXT,
    notes TEXT
);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- Admin / Caissier
    actif INTEGER DEFAULT 1
);

-- Table du journal des actions
CREATE TABLE IF NOT EXISTS journal_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    action TEXT NOT NULL,
    details TEXT,
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des paramètres système (clé/valeur)
CREATE TABLE IF NOT EXISTS parametres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements du calendrier scolaire
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
