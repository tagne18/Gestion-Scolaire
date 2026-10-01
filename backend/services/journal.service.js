const { getDatabase } = require('../database/db');

/**
 * Service de gestion du journal des actions
 */
const journalService = {
  /**
   * Enregistre une action dans le journal
   */
  enregistrerAction(utilisateurId, action, details = null) {
    try {
      const db = getDatabase();
      
      db.prepare(`
        INSERT INTO journal_actions (utilisateur_id, action, details)
        VALUES (?, ?, ?)
      `).run(utilisateurId, action, details);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'action :', error);
      return { success: false, error: 'Erreur lors de l\'enregistrement de l\'action' };
    }
  },

  /**
   * Récupère le journal des actions avec filtres
   */
  getList(filters = {}) {
    try {
      const db = getDatabase();
      
      let query = `
        SELECT 
          ja.*,
          u.nom as utilisateur_nom,
          u.username as utilisateur_username
        FROM journal_actions ja
        LEFT JOIN utilisateurs u ON ja.utilisateur_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filtre par utilisateur
      if (filters.utilisateurId) {
        query += ` AND ja.utilisateur_id = ?`;
        params.push(filters.utilisateurId);
      }
      
      // Filtre par date (à partir de)
      if (filters.dateDebut) {
        query += ` AND date(ja.date_action) >= ?`;
        params.push(filters.dateDebut);
      }
      
      // Filtre par date (jusqu'à)
      if (filters.dateFin) {
        query += ` AND date(ja.date_action) <= ?`;
        params.push(filters.dateFin);
      }
      
      query += ` ORDER BY ja.date_action DESC`;
      
      // Limite
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      const actions = db.prepare(query).all(...params);
      
      return { success: true, data: actions };
    } catch (error) {
      console.error('Erreur lors de la récupération du journal :', error);
      return { success: false, error: 'Erreur lors de la récupération du journal' };
    }
  },

  /**
   * Récupère la liste des utilisateurs pour le filtre
   */
  getUtilisateurs() {
    try {
      const db = getDatabase();
      const utilisateurs = db.prepare(`
        SELECT id, nom, username, role
        FROM utilisateurs
        WHERE actif = 1
        ORDER BY nom
      `).all();
      
      return { success: true, data: utilisateurs };
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs :', error);
      return { success: false, error: 'Erreur lors de la récupération des utilisateurs' };
    }
  }
};

module.exports = journalService;
