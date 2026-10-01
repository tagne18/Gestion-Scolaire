const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');

const evenementsService = {
  /**
   * Récupère tous les événements
   */
  getAll() {
    try {
      const db = getDatabase();
      const evenements = db.prepare(`
        SELECT e.*, 
               a.libelle as annee_scolaire_libelle,
               c.nom as classe_nom,
               s.nom as section_nom
        FROM evenements e
        LEFT JOIN annees_scolaires a ON e.annee_scolaire_id = a.id
        LEFT JOIN classes c ON e.classe_id = c.id
        LEFT JOIN sections s ON c.section_id = s.id
        WHERE e.actif = 1
        ORDER BY e.date_debut DESC
      `).all();
      
      return { success: true, data: evenements };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      return { success: false, error: 'Erreur lors de la récupération des événements' };
    }
  },

  /**
   * Récupère les événements d'une année scolaire
   */
  getByAnnee(anneeScolaireId) {
    try {
      const db = getDatabase();
      const evenements = db.prepare(`
        SELECT e.*, 
               c.nom as classe_nom,
               s.nom as section_nom
        FROM evenements e
        LEFT JOIN classes c ON e.classe_id = c.id
        LEFT JOIN sections s ON c.section_id = s.id
        WHERE e.annee_scolaire_id = ? AND e.actif = 1
        ORDER BY e.date_debut ASC
      `).all(anneeScolaireId);
      
      return { success: true, data: evenements };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      return { success: false, error: 'Erreur lors de la récupération des événements' };
    }
  },

  /**
   * Récupère les événements à venir
   */
  getUpcoming(limit = 10) {
    try {
      const db = getDatabase();
      const evenements = db.prepare(`
        SELECT e.*, 
               a.libelle as annee_scolaire_libelle,
               c.nom as classe_nom
        FROM evenements e
        LEFT JOIN annees_scolaires a ON e.annee_scolaire_id = a.id
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.date_debut >= date('now') AND e.actif = 1
        ORDER BY e.date_debut ASC
        LIMIT ?
      `).all(limit);
      
      return { success: true, data: evenements };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements à venir :', error);
      return { success: false, error: 'Erreur lors de la récupération des événements à venir' };
    }
  },

  /**
   * Crée un nouvel événement
   */
  create(evenementData) {
    try {
      const db = getDatabase();
      
      const result = db.prepare(`
        INSERT INTO evenements (titre, description, type, date_debut, date_fin, annee_scolaire_id, classe_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        evenementData.titre,
        evenementData.description || null,
        evenementData.type,
        evenementData.date_debut,
        evenementData.date_fin || null,
        evenementData.annee_scolaire_id || null,
        evenementData.classe_id || null
      );
      
      journalService.enregistrerAction(
        null,
        'ÉVÉNEMENT',
        `Création de l'événement : ${evenementData.titre} (${evenementData.type}) du ${evenementData.date_debut}`
      );
      
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement :', error);
      return { success: false, error: 'Erreur lors de la création de l\'événement' };
    }
  },

  /**
   * Met à jour un événement
   */
  update(id, evenementData) {
    try {
      const db = getDatabase();
      
      db.prepare(`
        UPDATE evenements 
        SET titre = ?, description = ?, type = ?, date_debut = ?, date_fin = ?, annee_scolaire_id = ?, classe_id = ?
        WHERE id = ?
      `).run(
        evenementData.titre,
        evenementData.description || null,
        evenementData.type,
        evenementData.date_debut,
        evenementData.date_fin || null,
        evenementData.annee_scolaire_id || null,
        evenementData.classe_id || null,
        id
      );
      
      journalService.enregistrerAction(
        null,
        'ÉVÉNEMENT',
        `Modification de l'événement ID ${id} : ${evenementData.titre}`
      );
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la modification de l\'événement :', error);
      return { success: false, error: 'Erreur lors de la modification de l\'événement' };
    }
  },

  /**
   * Supprime un événement (désactivation)
   */
  delete(id) {
    try {
      const db = getDatabase();
      
      db.prepare(`
        UPDATE evenements SET actif = 0 WHERE id = ?
      `).run(id);
      
      journalService.enregistrerAction(
        null,
        'ÉVÉNEMENT',
        `Suppression de l'événement ID ${id}`
      );
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement :', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'événement' };
    }
  },

  /**
   * Récupère les événements par type
   */
  getByType(type) {
    try {
      const db = getDatabase();
      const evenements = db.prepare(`
        SELECT e.*, 
               a.libelle as annee_scolaire_libelle,
               c.nom as classe_nom
        FROM evenements e
        LEFT JOIN annees_scolaires a ON e.annee_scolaire_id = a.id
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.type = ? AND e.actif = 1
        ORDER BY e.date_debut DESC
      `).all(type);
      
      return { success: true, data: evenements };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      return { success: false, error: 'Erreur lors de la récupération des événements' };
    }
  }
};

module.exports = evenementsService;
