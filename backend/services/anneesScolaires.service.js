const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');

/**
 * Service de gestion des années scolaires
 */
const anneesScolairesService = {
  /**
   * Récupère toutes les années scolaires
   */
  getAll() {
    try {
      const db = getDatabase();
      const annees = db.prepare(`
        SELECT * FROM annees_scolaires
        ORDER BY date_debut DESC
      `).all();
      
      return { success: true, data: annees };
    } catch (error) {
      console.error('Erreur lors de la récupération des années scolaires :', error);
      return { success: false, error: 'Erreur lors de la récupération des années scolaires' };
    }
  },
  
  /**
   * Récupère l'année scolaire active
   */
  getActive() {
    try {
      const db = getDatabase();
      const annee = db.prepare(`
        SELECT * FROM annees_scolaires
        WHERE active = 1
      `).get();
      
      return { success: true, data: annee };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'année active :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'année active' };
    }
  },
  
  /**
   * Crée une nouvelle année scolaire
   */
  create(libelle, dateDebut, dateFin) {
    try {
      const db = getDatabase();
      
      // Désactiver toutes les autres années
      db.prepare('UPDATE annees_scolaires SET active = 0').run();
      
      // Créer la nouvelle année et l'activer
      const result = db.prepare(`
        INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active)
        VALUES (?, ?, ?, 1)
      `).run(libelle, dateDebut, dateFin);
      
      journalService.enregistrerAction(
        null,
        'CRÉATION',
        `Nouvelle année scolaire créée: ${libelle} (${dateDebut} au ${dateFin}) - Activée automatiquement`
      );
      
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error) {
      console.error('Erreur lors de la création de l\'année scolaire :', error);
      return { success: false, error: 'Erreur lors de la création de l\'année scolaire' };
    }
  },
  
  /**
   * Définit une année scolaire comme active
   */
  setActive(anneeId) {
    try {
      const db = getDatabase();
      
      const annee = db.prepare('SELECT libelle FROM annees_scolaires WHERE id = ?').get(anneeId);
      
      // Désactiver toutes les années
      db.prepare('UPDATE annees_scolaires SET active = 0').run();
      
      // Activer l'année demandée
      db.prepare('UPDATE annees_scolaires SET active = 1 WHERE id = ?').run(anneeId);
      
      journalService.enregistrerAction(
        null,
        'CHANGEMENT ANNÉE',
        `Année scolaire active changée vers: ${annee?.libelle || anneeId}`
      );
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'activation de l\'année scolaire :', error);
      return { success: false, error: 'Erreur lors de l\'activation de l\'année scolaire' };
    }
  },
  
  /**
   * Met à jour une année scolaire
   */
  update(anneeId, libelle, dateDebut, dateFin) {
    try {
      const db = getDatabase();
      
      // Valider que date_fin est postérieure à date_debut
      if (dateDebut && dateFin && new Date(dateFin) <= new Date(dateDebut)) {
        return { success: false, error: 'La date de fin doit être postérieure à la date de début' };
      }
      
      // Vérifier si le libellé est déjà utilisé par une autre année
      const existing = db.prepare(`
        SELECT id FROM annees_scolaires
        WHERE libelle = ? AND id != ?
      `).get(libelle, anneeId);
      
      if (existing) {
        return { success: false, error: 'Ce libellé est déjà utilisé par une autre année scolaire' };
      }
      
      // Mettre à jour l'année
      db.prepare(`
        UPDATE annees_scolaires
        SET libelle = ?, date_debut = ?, date_fin = ?
        WHERE id = ?
      `).run(libelle, dateDebut, dateFin, anneeId);
      
      journalService.enregistrerAction(
        null,
        'MODIFICATION',
        `Année scolaire modifiée: ${libelle} (${dateDebut} au ${dateFin})`
      );
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'année scolaire :', error);
      return { success: false, error: 'Erreur lors de la mise à jour de l\'année scolaire' };
    }
  },
  
  /**
   * Compte le nombre d'inscriptions pour une année scolaire
   */
  countInscriptions(anneeId) {
    try {
      const db = getDatabase();
      console.log('[DEBUG countInscriptions] anneeId reçu:', anneeId, 'type:', typeof anneeId);
      
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM inscriptions
        WHERE annee_scolaire_id = ?
      `).get(anneeId);
      
      console.log('[DEBUG countInscriptions] résultat COUNT:', result);
      
      return { success: true, data: result.count };
    } catch (error) {
      console.error('Erreur lors du comptage des inscriptions :', error);
      return { success: false, error: 'Erreur lors du comptage des inscriptions' };
    }
  },
  
  /**
   * Supprime une année scolaire
   */
  delete(anneeId) {
    try {
      const db = getDatabase();
      
      // Vérifier que l'année n'est pas active
      const annee = db.prepare(`
        SELECT active FROM annees_scolaires WHERE id = ?
      `).get(anneeId);
      
      if (!annee) {
        return { success: false, error: 'Année scolaire non trouvée' };
      }
      
      if (annee.active) {
        return { success: false, error: 'Impossible de supprimer l\'année scolaire active' };
      }
      
      // Supprimer l'année
      db.prepare('DELETE FROM annees_scolaires WHERE id = ?').run(anneeId);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'année scolaire :', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'année scolaire' };
    }
  }
};

module.exports = anneesScolairesService;
