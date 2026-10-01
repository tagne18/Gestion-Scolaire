const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');

/**
 * Service de gestion des sections et classes
 */
const classesService = {
  /**
   * Récupère toutes les sections
   */
  getSections() {
    try {
      const db = getDatabase();
      const sections = db.prepare('SELECT * FROM sections ORDER BY nom').all();
      
      return { success: true, data: sections };
    } catch (error) {
      console.error('Erreur lors de la récupération des sections :', error);
      return { success: false, error: 'Erreur lors de la récupération des sections' };
    }
  },
  
  /**
   * Récupère toutes les classes avec leur section
   */
  getAll() {
    try {
      const db = getDatabase();
      const classes = db.prepare(`
        SELECT c.*, s.nom as section_nom
        FROM classes c
        JOIN sections s ON c.section_id = s.id
        ORDER BY
          s.nom COLLATE NOCASE,
          CASE c.niveau
            WHEN 'Maternelle' THEN 1
            WHEN 'Primaire' THEN 2
            ELSE 3
          END,
          c.nom COLLATE NOCASE
      `).all();
      
      return { success: true, data: classes };
    } catch (error) {
      console.error('Erreur lors de la récupération des classes :', error);
      return { success: false, error: 'Erreur lors de la récupération des classes' };
    }
  },
  
  /**
   * Crée une nouvelle classe
   */
  createClasse(nom, niveau, sectionId) {
    try {
      const db = getDatabase();
      const result = db.prepare(`
        INSERT INTO classes (nom, niveau, section_id)
        VALUES (?, ?, ?)
      `).run(nom, niveau, sectionId);
      
      const section = db.prepare('SELECT nom FROM sections WHERE id = ?').get(sectionId);
      journalService.enregistrerAction(
        null,
        'CRÉATION',
        `Nouvelle classe créée: ${nom} (Niveau: ${niveau}, Section: ${section?.nom || sectionId})`
      );
      
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error) {
      console.error('Erreur lors de la création de la classe :', error);
      return { success: false, error: 'Erreur lors de la création de la classe' };
    }
  },

  /**
   * Met à jour une classe (nom, niveau, section)
   */
  updateClasse(classeId, nom, niveau, sectionId) {
    try {
      const db = getDatabase();
      const existante = db.prepare('SELECT * FROM classes WHERE id = ?').get(classeId);

      if (!existante) {
        return { success: false, error: 'Classe introuvable' };
      }

      db.prepare(`
        UPDATE classes
        SET nom = ?, niveau = ?, section_id = ?
        WHERE id = ?
      `).run(nom, niveau, sectionId, classeId);

      const section = db.prepare('SELECT nom FROM sections WHERE id = ?').get(sectionId);
      journalService.enregistrerAction(
        null,
        'MODIFICATION',
        `Classe modifiée: ${existante.nom} → ${nom} (Niveau: ${niveau}, Section: ${section?.nom || sectionId})`
      );

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la modification de la classe :', error);
      return { success: false, error: 'Erreur lors de la modification de la classe' };
    }
  },
  
  /**
   * Définit les tarifs pour une classe et une année scolaire
   */
  setTarifs(classeId, anneeScolaireId, tarifs) {
    try {
      const db = getDatabase();
      
      const result = db.prepare(`
        INSERT INTO tarifs_classe 
        (classe_id, annee_scolaire_id, montant_inscription, montant_pension_annuel, tranche_1, tranche_2, tranche_3, date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(classe_id, annee_scolaire_id) 
        DO UPDATE SET
          montant_inscription = excluded.montant_inscription,
          montant_pension_annuel = excluded.montant_pension_annuel,
          tranche_1 = excluded.tranche_1,
          tranche_2 = excluded.tranche_2,
          tranche_3 = excluded.tranche_3,
          date_limite_tranche_1 = excluded.date_limite_tranche_1,
          date_limite_tranche_2 = excluded.date_limite_tranche_2,
          date_limite_tranche_3 = excluded.date_limite_tranche_3
      `).run(
        classeId,
        anneeScolaireId,
        tarifs.montant_inscription || 0,
        tarifs.montant_pension_annuel,
        tarifs.tranche_1 || 0,
        tarifs.tranche_2 || 0,
        tarifs.tranche_3 || 0,
        tarifs.date_limite_tranche_1 || null,
        tarifs.date_limite_tranche_2 || null,
        tarifs.date_limite_tranche_3 || null
      );
      
      const classe = db.prepare('SELECT nom FROM classes WHERE id = ?').get(classeId);
      const annee = db.prepare('SELECT libelle FROM annees_scolaires WHERE id = ?').get(anneeScolaireId);
      journalService.enregistrerAction(
        null,
        'MODIFICATION',
        `Tarifs définis pour la classe ${classe?.nom || classeId} (${annee?.libelle || anneeScolaireId}): Inscription=${tarifs.montant_inscription?.toLocaleString() || 0} FCFA, Pension=${tarifs.montant_pension_annuel?.toLocaleString()} FCFA, Tranches=(${tarifs.tranche_1}/${tarifs.tranche_2}/${tarifs.tranche_3})`
      );
      
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error) {
      console.error('Erreur lors de la définition des tarifs :', error);
      return { success: false, error: 'Erreur lors de la définition des tarifs' };
    }
  },
  
  /**
   * Récupère les tarifs pour une classe et une année scolaire
   */
  getTarifs(classeId, anneeScolaireId) {
    try {
      const db = getDatabase();
      const tarifs = db.prepare(`
        SELECT * FROM tarifs_classe
        WHERE classe_id = ? AND annee_scolaire_id = ?
      `).get(classeId, anneeScolaireId);
      
      return { success: true, data: tarifs };
    } catch (error) {
      console.error('Erreur lors de la récupération des tarifs :', error);
      return { success: false, error: 'Erreur lors de la récupération des tarifs' };
    }
  }
};

module.exports = classesService;
