const { getDatabase } = require('../database/db');

/**
 * Service de gestion du tableau de bord
 */
const dashboardService = {
  /**
   * Récupère l'année scolaire active
   */
  getAnneeActive() {
    try {
      const db = getDatabase();
      const annee = db.prepare(`
        SELECT * FROM annees_scolaires
        WHERE active = 1
      `).get();
      
      return annee;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'année active :', error);
      return null;
    }
  },
  
  /**
   * Récupère les indicateurs clés du tableau de bord
   */
  getIndicateurs() {
    try {
      const db = getDatabase();
      const anneeActive = this.getAnneeActive();
      
      if (!anneeActive) {
        return {
          success: true,
          data: {
            total_aujourdhui: 0,
            total_mois: 0,
            total_encaisse: 0,
            total_attendu: 0,
            total_inscription_attendu: 0,
            total_pension_attendu: 0,
            total_inscription_encaisse: 0,
            total_pension_encaisse: 0,
            total_eleves: 0,
            eleves_insolvables: 0
          }
        };
      }
      
      const aujourdHui = new Date().toISOString().split('T')[0];
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      // Total encaissé aujourd'hui
      const totalAujourdhui = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.date_paiement = ? AND p.annule = 0 AND i.annee_scolaire_id = ?
      `).get(aujourdHui, anneeActive.id);
      
      // Total encaissé ce mois-ci
      const totalMois = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.date_paiement >= ? AND p.annule = 0 AND i.annee_scolaire_id = ?
      `).get(debutMois, anneeActive.id);
      
      // Total encaissé pour l'année scolaire active
      const totalEncaisse = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.annule = 0 AND i.annee_scolaire_id = ?
      `).get(anneeActive.id);
      
      // Total attendu pour les pensions (somme des pensions des inscriptions pour l'année active)
      const totalPensionAttendu = db.prepare(`
        SELECT COALESCE(SUM(tc.montant_pension_annuel - COALESCE(i.reduction, 0)), 0) as total
        FROM inscriptions i
        LEFT JOIN tarifs_classe tc ON i.classe_id = tc.classe_id AND i.annee_scolaire_id = tc.annee_scolaire_id
        WHERE i.annee_scolaire_id = ? AND i.statut = 'active'
      `).get(anneeActive.id);
      
      // Total encaissé pour les pensions
      const totalPensionEncaisse = db.prepare(`
        SELECT COALESCE(SUM(p.montant), 0) as total
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.annule = 0 AND i.annee_scolaire_id = ?
      `).get(anneeActive.id);
      
      // Nombre total d'élèves inscrits pour l'année active
      const totalEleves = db.prepare(`
        SELECT COUNT(DISTINCT eleve_id) as total
        FROM inscriptions
        WHERE annee_scolaire_id = ?
      `).get(anneeActive.id);
      
      // Nombre d'élèves insolvables (tranches impayées avec date limite dépassée)
      const elevesInsolvables = db.prepare(`
        SELECT COUNT(DISTINCT i.eleve_id) as total
        FROM inscriptions i
        JOIN tranches t ON i.id = t.inscription_id
        LEFT JOIN paiements p ON t.id = p.tranche_id AND p.annule = 0
        WHERE i.annee_scolaire_id = ?
        AND t.date_limite IS NOT NULL
        AND t.date_limite < ?
        GROUP BY i.eleve_id, t.id
        HAVING COALESCE(SUM(p.montant), 0) < t.montant_attendu
      `).all(anneeActive.id, aujourdHui);
      
      // Compter le nombre d'élèves uniques insolubles
      const elevesInsolvablesCount = elevesInsolvables.length > 0 
        ? new Set(elevesInsolvables.map(e => e.eleve_id)).size 
        : 0;
      
      return {
        success: true,
        data: {
          total_aujourdhui: totalAujourdhui?.total ? parseFloat(totalAujourdhui.total) : 0,
          total_mois: totalMois?.total ? parseFloat(totalMois.total) : 0,
          total_encaisse: totalEncaisse?.total ? parseFloat(totalEncaisse.total) : 0,
          total_attendu: totalPensionAttendu?.total ? parseFloat(totalPensionAttendu.total) : 0,
          total_pension_attendu: totalPensionAttendu?.total ? parseFloat(totalPensionAttendu.total) : 0,
          total_pension_encaisse: totalPensionEncaisse?.total ? parseFloat(totalPensionEncaisse.total) : 0,
          total_eleves: totalEleves?.total ? totalEleves.total : 0,
          eleves_insolvables: elevesInsolvablesCount
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des indicateurs :', error);
      return { success: false, error: 'Erreur lors de la récupération des indicateurs' };
    }
  },
  
  /**
   * Récupère le recouvrement par classe pour l'année active
   */
  getRecouvrementParClasse() {
    try {
      const db = getDatabase();
      const anneeActive = this.getAnneeActive();
      
      if (!anneeActive) {
        return { success: true, data: [] };
      }
      
      const classes = db.prepare(`
        SELECT 
          c.id,
          c.nom as classe_nom,
          c.niveau,
          s.nom as section_nom,
          COUNT(DISTINCT i.eleve_id) as nb_eleves,
          COALESCE(SUM(tc.montant_pension_annuel - COALESCE(i.reduction, 0)), 0) as total_attendu,
          COALESCE((
            SELECT SUM(p2.montant)
            FROM paiements p2
            JOIN inscriptions i2 ON p2.inscription_id = i2.id
            WHERE i2.classe_id = c.id AND i2.annee_scolaire_id = ? AND p2.annule = 0
          ), 0) as total_encaisse
        FROM classes c
        LEFT JOIN inscriptions i ON c.id = i.classe_id AND i.annee_scolaire_id = ?
        LEFT JOIN tarifs_classe tc ON c.id = tc.classe_id AND tc.annee_scolaire_id = ?
        LEFT JOIN sections s ON c.section_id = s.id
        GROUP BY c.id
        HAVING nb_eleves > 0
        ORDER BY 
          CASE 
            WHEN total_attendu > 0 THEN (total_encaisse * 100.0 / total_attendu)
            ELSE 0
          END ASC
      `).all(anneeActive.id, anneeActive.id, anneeActive.id);
      
      const result = classes.map(classe => {
        const pourcentage = classe.total_attendu > 0 
          ? (classe.total_encaisse * 100.0 / classe.total_attendu) 
          : 0;
        
        return {
          ...classe,
          total_attendu: parseFloat(classe.total_attendu) || 0,
          total_encaisse: parseFloat(classe.total_encaisse) || 0,
          pourcentage_recouvrement: Math.round(pourcentage * 100) / 100
        };
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération du recouvrement :', error);
      return { success: false, error: 'Erreur lors de la récupération du recouvrement' };
    }
  },
  
  /**
   * Récupère les alertes d'échéances proches (7 prochains jours)
   */
  getAlertesEcheancesProches() {
    try {
      const db = getDatabase();
      const anneeActive = this.getAnneeActive();
      
      if (!anneeActive) {
        return { success: true, data: [] };
      }
      
      const aujourdHui = new Date();
      const dans7Jours = new Date();
      dans7Jours.setDate(aujourdHui.getDate() + 7);
      
      const dateAujourdhui = aujourdHui.toISOString().split('T')[0];
      const dateDans7Jours = dans7Jours.toISOString().split('T')[0];
      
      const alertes = db.prepare(`
        SELECT 
          e.id as eleve_id,
          e.nom as eleve_nom,
          e.prenom as eleve_prenom,
          e.matricule,
          c.nom as classe_nom,
          t.id as tranche_id,
          t.numero as tranche_numero,
          t.libelle as tranche_libelle,
          t.montant_attendu,
          t.date_limite,
          COALESCE(SUM(p.montant), 0) as montant_paye
        FROM tranches t
        JOIN inscriptions i ON t.inscription_id = i.id
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        LEFT JOIN paiements p ON t.id = p.tranche_id AND p.annule = 0
        WHERE i.annee_scolaire_id = ?
        AND t.date_limite IS NOT NULL
        AND t.date_limite >= ?
        AND t.date_limite <= ?
        GROUP BY t.id
        HAVING montant_paye < t.montant_attendu
        ORDER BY t.date_limite ASC
      `).all(anneeActive.id, dateAujourdhui, dateDans7Jours);
      
      const result = alertes.map(alerte => {
        const dateLimite = new Date(alerte.date_limite);
        const joursRestants = Math.ceil((dateLimite - aujourdHui) / (1000 * 60 * 60 * 24));
        
        return {
          ...alerte,
          montant_attendu: parseFloat(alerte.montant_attendu) || 0,
          montant_paye: parseFloat(alerte.montant_paye) || 0,
          reste_a_payer: parseFloat(alerte.montant_attendu) - parseFloat(alerte.montant_paye),
          jours_restants: joursRestants
        };
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération des alertes :', error);
      return { success: false, error: 'Erreur lors de la récupération des alertes' };
    }
  },

  /**
   * Récupère l'évolution des inscriptions par année scolaire
   */
  getEvolutionInscriptions() {
    try {
      const db = getDatabase();
      
      const evolution = db.prepare(`
        SELECT 
          a.libelle as annee_scolaire,
          COUNT(DISTINCT i.eleve_id) as nb_inscriptions,
          COALESCE(SUM(i.montant_pension), 0) as total_pensions,
          COALESCE(SUM(p.montant), 0) as total_encaisse
        FROM annees_scolaires a
        LEFT JOIN inscriptions i ON a.id = i.annee_scolaire_id AND i.statut = 'active'
        LEFT JOIN paiements p ON i.id = p.inscription_id AND p.annule = 0
        GROUP BY a.id
        ORDER BY a.libelle
      `).all();
      
      const result = evolution.map(evo => ({
        ...evo,
        nb_inscriptions: evo.nb_inscriptions || 0,
        total_pensions: parseFloat(evo.total_pensions) || 0,
        total_encaisse: parseFloat(evo.total_encaisse) || 0,
        taux_recouvrement: evo.total_pensions > 0 
          ? Math.round((evo.total_encaisse / evo.total_pensions) * 10000) / 100 
          : 0
      }));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'évolution :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'évolution' };
    }
  },

  /**
   * Récupère les statistiques de paiement mensuelles pour l'année active
   */
  getStatistiquesPaiementsMensuels() {
    try {
      const db = getDatabase();
      const anneeActive = this.getAnneeActive();
      
      if (!anneeActive) {
        return { success: true, data: [] };
      }
      
      const stats = db.prepare(`
        SELECT 
          strftime('%Y-%m', p.date_paiement) as mois,
          COUNT(DISTINCT p.id) as nb_paiements,
          COUNT(DISTINCT p.inscription_id) as nb_eleves_payeurs,
          COALESCE(SUM(p.montant), 0) as total_montant
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.annule = 0 AND i.annee_scolaire_id = ?
        GROUP BY strftime('%Y-%m', p.date_paiement)
        ORDER BY mois
      `).all(anneeActive.id);
      
      const result = stats.map(stat => ({
        ...stat,
        total_montant: parseFloat(stat.total_montant) || 0,
        mois_label: new Date(stat.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques mensuelles :', error);
      return { success: false, error: 'Erreur lors de la récupération des statistiques mensuelles' };
    }
  },

  /**
   * Récupère les statistiques par section
   */
  getStatistiquesParSection() {
    try {
      const db = getDatabase();
      const anneeActive = this.getAnneeActive();
      
      if (!anneeActive) {
        return { success: true, data: [] };
      }
      
      const stats = db.prepare(`
        SELECT 
          s.id as section_id,
          s.nom as section_nom,
          COUNT(DISTINCT i.eleve_id) as nb_eleves,
          COUNT(DISTINCT CASE WHEN i.eleve_id IS NOT NULL THEN c.id END) as nb_classes,
          COALESCE(SUM(i.montant_pension), 0) as total_pensions,
          COALESCE(SUM(p.montant), 0) as total_encaisse
        FROM sections s
        LEFT JOIN classes c ON s.id = c.section_id
        LEFT JOIN inscriptions i ON c.id = i.classe_id AND i.annee_scolaire_id = ? AND i.statut = 'active'
        LEFT JOIN paiements p ON i.id = p.inscription_id AND p.annule = 0
        GROUP BY s.id
        HAVING nb_eleves > 0
        ORDER BY nb_eleves DESC
      `).all(anneeActive.id);
      
      const result = stats.map(stat => ({
        ...stat,
        total_pensions: parseFloat(stat.total_pensions) || 0,
        total_encaisse: parseFloat(stat.total_encaisse) || 0,
        taux_recouvrement: stat.total_pensions > 0 
          ? Math.round((stat.total_encaisse / stat.total_pensions) * 10000) / 100 
          : 0
      }));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques par section :', error);
      return { success: false, error: 'Erreur lors de la récupération des statistiques par section' };
    }
  },

  /**
   * Récupère les statistiques globales pour le tableau de bord avancé
   */
  getStatistiquesGlobales() {
    try {
      const db = getDatabase();
      
      const totalEleves = db.prepare(`SELECT COUNT(*) as total FROM eleves`).get();
      const totalClasses = db.prepare(`SELECT COUNT(*) as total FROM classes`).get();
      const totalAnnees = db.prepare(`SELECT COUNT(*) as total FROM annees_scolaires`).get();
      const totalPaiements = db.prepare(`SELECT COUNT(*) as total FROM paiements WHERE annule = 0`).get();
      
      const evolution = this.getEvolutionInscriptions();
      const sections = this.getStatistiquesParSection();
      
      return {
        success: true,
        data: {
          total_eleves: totalEleves.total || 0,
          total_classes: totalClasses.total || 0,
          total_annees: totalAnnees.total || 0,
          total_paiements: totalPaiements.total || 0,
          evolution: evolution.success ? evolution.data : [],
          sections: sections.success ? sections.data : []
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques globales :', error);
      return { success: false, error: 'Erreur lors de la récupération des statistiques globales' };
    }
  },

  /**
   * Récupère les détails des inscriptions pour vérification
   */
  getDetailsInscriptions(anneeLibelle) {
    try {
      const db = getDatabase();
      
      const details = db.prepare(`
        SELECT 
          e.nom as eleve_nom,
          e.prenom as eleve_prenom,
          e.matricule,
          c.nom as classe_nom,
          s.nom as section_nom,
          i.montant_pension,
          tc.montant_pension_annuel as tarif_pension,
          i.reduction
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        LEFT JOIN tarifs_classe tc ON i.classe_id = tc.classe_id AND i.annee_scolaire_id = tc.annee_scolaire_id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE a.libelle = ? AND i.statut = 'active'
        ORDER BY e.nom, e.prenom
      `).all(anneeLibelle);
      
      return { success: true, data: details };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails :', error);
      return { success: false, error: 'Erreur lors de la récupération des détails' };
    }
  }
};

module.exports = dashboardService;
