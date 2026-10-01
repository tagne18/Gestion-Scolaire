const { getDatabase } = require('../database/db');
const anneesScolairesService = require('./anneesScolaires.service');

/**
 * Service de gestion des insolvables
 */
const insolvablesService = {
  /**
   * Liste tous les élèves insolvables pour l'année scolaire active
   */
  getList(filters = {}) {
    try {
      const db = getDatabase();
      
      // Récupérer l'année active
      const anneeActive = anneesScolairesService.getActive();
      if (!anneeActive.success || !anneeActive.data) {
        return { success: false, error: 'Aucune année scolaire active' };
      }
      
      const anneeId = anneeActive.data.id;
      const aujourdHui = new Date();
      
      let query = `
        SELECT 
          e.id,
          e.nom,
          e.prenom,
          e.matricule,
          c.nom as classe_nom,
          s.nom as section_nom,
          i.id as inscription_id,
          t.numero as tranche_numero,
          t.libelle as tranche_libelle,
          t.montant_attendu,
          t.date_limite,
          COALESCE(payee.total, 0) as montant_paye,
          julianday('now') - julianday(t.date_limite) as jours_retard
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        JOIN tranches t ON t.inscription_id = i.id
        LEFT JOIN (
          SELECT tranche_id, SUM(montant) as total
          FROM paiements
          WHERE annule = 0
          GROUP BY tranche_id
        ) payee ON payee.tranche_id = t.id
        WHERE i.annee_scolaire_id = ?
          AND t.date_limite IS NOT NULL
          AND julianday('now') > julianday(t.date_limite)
          AND (t.montant_attendu - COALESCE(payee.total, 0)) > 0
      `;
      
      const params = [anneeId];
      
      // Filtres
      if (filters.classeId) {
        query += ` AND i.classe_id = ?`;
        params.push(filters.classeId);
      }
      
      if (filters.sectionId) {
        query += ` AND i.section_id = ?`;
        params.push(filters.sectionId);
      }
      
      query += ` ORDER BY jours_retard DESC`;
      
      const insolvables = db.prepare(query).all(...params);
      
      // Calculer le montant dû pour chaque tranche
      const result = insolvables.map(item => ({
        ...item,
        montant_du: parseFloat(item.montant_attendu) - parseFloat(item.montant_paye),
        jours_retard: Math.floor(item.jours_retard)
      }));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération des insolvables :', error);
      return { success: false, error: 'Erreur lors de la récupération des insolvables' };
    }
  }
};

module.exports = insolvablesService;
