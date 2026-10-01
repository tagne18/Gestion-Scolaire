const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');
const { genererMatricule } = require('../utils/matricule');

/**
 * Service de gestion des élèves
 */
const elevesService = {
  /**
   * Crée un nouvel élève
   */
  create(eleveData) {
    try {
      const db = getDatabase();
      
      // Validation des champs obligatoires
      if (!eleveData.nom || !eleveData.prenom) {
        return { success: false, error: 'Le nom et le prénom sont obligatoires' };
      }
      
      const result = db.prepare(`
        INSERT INTO eleves (
          matricule, nom, prenom, sexe, date_naissance, lieu_naissance,
          nom_pere, telephone_pere, nom_mere, telephone_mere,
          nom_tuteur, telephone_tuteur, lien_tuteur, adresse
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eleveData.matricule,
        eleveData.nom,
        eleveData.prenom,
        eleveData.sexe || null,
        eleveData.date_naissance || null,
        eleveData.lieu_naissance || null,
        eleveData.nom_pere || null,
        eleveData.telephone_pere || null,
        eleveData.nom_mere || null,
        eleveData.telephone_mere || null,
        eleveData.nom_tuteur || null,
        eleveData.telephone_tuteur || null,
        eleveData.lien_tuteur || null,
        eleveData.adresse || null
      );
      
      const eleveId = result.lastInsertRowid;
      
      journalService.enregistrerAction(
        null,
        'CRÉATION',
        `Nouvel élève créé: ${eleveData.nom} ${eleveData.prenom} - Matricule: ${eleveData.matricule}${eleveData.sexe ? ' - Sexe: ' + eleveData.sexe : ''}${eleveData.date_naissance ? ' - Né(e) le: ' + eleveData.date_naissance : ''}`
      );
      
      return { success: true, data: { id: eleveId, matricule: eleveData.matricule } };
    } catch (error) {
      console.error('Erreur lors de la création de l\'élève :', error);
      return { success: false, error: 'Erreur lors de la création de l\'élève' };
    }
  },
  
  /**
   * Récupère un élève par son ID
   */
  getById(eleveId) {
    try {
      const db = getDatabase();
      const eleve = db.prepare(`
        SELECT * FROM eleves WHERE id = ?
      `).get(eleveId);
      
      return { success: true, data: eleve };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'élève :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'élève' };
    }
  },
  
  /**
   * Récupère un élève par son matricule
   */
  getByMatricule(matricule) {
    try {
      const db = getDatabase();
      const eleve = db.prepare(`
        SELECT * FROM eleves WHERE matricule = ?
      `).get(matricule);
      
      return { success: true, data: eleve };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'élève :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'élève' };
    }
  },
  
  /**
   * Récupère tous les élèves avec leur classe et section actuelles
   */
  getAll() {
    try {
      const db = getDatabase();
      
      // Récupérer l'année scolaire active
      const anneeActive = db.prepare(`
        SELECT id FROM annees_scolaires WHERE active = 1
      `).get();
      
      const eleves = db.prepare(`
        SELECT 
          e.*,
          c.nom as classe_nom,
          s.nom as section_nom,
          i.statut as inscription_statut,
          i.id as inscription_id,
          COALESCE((
            SELECT SUM(p.montant)
            FROM paiements p
            JOIN inscriptions i2 ON p.inscription_id = i2.id
            WHERE i2.eleve_id = e.id AND i2.annee_scolaire_id = ? AND p.annule = 0
          ), 0) as total_paiements
        FROM eleves e
        LEFT JOIN inscriptions i ON e.id = i.eleve_id 
          AND i.annee_scolaire_id = ?
          AND i.statut IN ('active', 'à_inscrire')
        LEFT JOIN classes c ON i.classe_id = c.id
        LEFT JOIN sections s ON i.section_id = s.id
        ORDER BY e.nom, e.prenom
      `).all(anneeActive ? anneeActive.id : null, anneeActive ? anneeActive.id : null);
      
      // Calculer l'âge pour chaque élève
      const elevesAvecAge = eleves.map(eleve => {
        let age = null;
        if (eleve.date_naissance) {
          const today = new Date();
          const birthDate = new Date(eleve.date_naissance);
          
          let ageCalc = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          // Ajuster si l'anniversaire n'est pas encore passé cette année
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            ageCalc--;
          }
          
          age = ageCalc;
        }
        
        return {
          ...eleve,
          age: age
        };
      });
      
      return { success: true, data: elevesAvecAge };
    } catch (error) {
      console.error('Erreur lors de la récupération des élèves :', error);
      return { success: false, error: 'Erreur lors de la récupération des élèves' };
    }
  },

  /**
   * Recherche globale d'élèves (nom, prénom, matricule)
   */
  rechercheGlobale(terme) {
    try {
      const db = getDatabase();
      
      if (!terme || terme.trim().length < 2) {
        return { success: true, data: [] };
      }
      
      const pattern = `%${terme}%`;
      
      const result = db.prepare(`
        SELECT 
          e.id,
          e.nom,
          e.prenom,
          e.matricule,
          c.nom as classe_nom,
          s.nom as section_nom
        FROM eleves e
        LEFT JOIN inscriptions i ON e.id = i.eleve_id
        LEFT JOIN classes c ON i.classe_id = c.id
        LEFT JOIN sections s ON i.section_id = s.id
        WHERE e.nom LIKE ? 
           OR e.prenom LIKE ? 
           OR e.matricule LIKE ?
        GROUP BY e.id
        LIMIT 20
      `).all(pattern, pattern, pattern);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erreur lors de la recherche :', error);
      return { success: false, error: 'Erreur lors de la recherche' };
    }
  },

  /**
   * Récupère tous les élèves pour la réinscription
   * Inclut les élèves de l'année précédente (pour réinscription vers nouvelle année)
   * Note: Les élèves importés depuis SQL sont maintenant automatiquement inscrits dans l'année active
   */
  getElevesPourReinscription() {
    try {
      const db = getDatabase();
      
      // Récupérer l'année scolaire active
      const anneeActive = db.prepare(`
        SELECT id FROM annees_scolaires WHERE active = 1
      `).get();
      
      if (!anneeActive) {
        return { success: false, error: 'Aucune année scolaire active trouvée' };
      }
      
      // Récupérer les élèves de l'année précédente (non active)
      const anneePrecedente = db.prepare(`
        SELECT id FROM annees_scolaires WHERE active = 0 ORDER BY date_debut DESC LIMIT 1
      `).get();
      
      let elevesAnneePrecedente = [];
      
      if (anneePrecedente) {
        elevesAnneePrecedente = db.prepare(`
          SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.matricule,
            e.date_naissance,
            c.nom as classe_nom,
            c.id as classe_id,
            s.nom as section_nom,
            s.id as section_id,
            tc.montant_pension_annuel,
            'inscrit' as source
          FROM eleves e
          JOIN inscriptions i ON e.id = i.eleve_id
          JOIN classes c ON i.classe_id = c.id
          JOIN sections s ON i.section_id = s.id
          LEFT JOIN tarifs_classe tc ON c.id = tc.classe_id AND i.annee_scolaire_id = tc.annee_scolaire_id
          WHERE i.annee_scolaire_id = ? AND i.statut = 'active'
        `).all(anneePrecedente.id);
      }
      
      // Trier par nom
      elevesAnneePrecedente.sort((a, b) => a.nom.localeCompare(b.nom));
      
      return { success: true, data: elevesAnneePrecedente };
    } catch (error) {
      console.error('Erreur lors de la récupération des élèves pour réinscription :', error);
      return { success: false, error: 'Erreur lors de la récupération des élèves pour réinscription' };
    }
  },

  /**
   * Met à jour les informations d'un élève
   */
  update(eleveId, eleveData) {
    try {
      const db = getDatabase();
      
      // Vérifier que l'élève existe
      const eleveExistant = db.prepare(`
        SELECT * FROM eleves WHERE id = ?
      `).get(eleveId);
      
      if (!eleveExistant) {
        return { success: false, error: 'Élève non trouvé' };
      }
      
      // Construire la requête de mise à jour dynamique
      const champsMiseAJour = [];
      const valeurs = [];
      
      if (eleveData.nom !== undefined) {
        champsMiseAJour.push('nom = ?');
        valeurs.push(eleveData.nom);
      }
      if (eleveData.prenom !== undefined) {
        champsMiseAJour.push('prenom = ?');
        valeurs.push(eleveData.prenom);
      }
      if (eleveData.sexe !== undefined) {
        champsMiseAJour.push('sexe = ?');
        valeurs.push(eleveData.sexe);
      }
      if (eleveData.date_naissance !== undefined) {
        champsMiseAJour.push('date_naissance = ?');
        valeurs.push(eleveData.date_naissance);
      }
      if (eleveData.lieu_naissance !== undefined) {
        champsMiseAJour.push('lieu_naissance = ?');
        valeurs.push(eleveData.lieu_naissance);
      }
      if (eleveData.nom_pere !== undefined) {
        champsMiseAJour.push('nom_pere = ?');
        valeurs.push(eleveData.nom_pere);
      }
      if (eleveData.telephone_pere !== undefined) {
        champsMiseAJour.push('telephone_pere = ?');
        valeurs.push(eleveData.telephone_pere);
      }
      if (eleveData.nom_mere !== undefined) {
        champsMiseAJour.push('nom_mere = ?');
        valeurs.push(eleveData.nom_mere);
      }
      if (eleveData.telephone_mere !== undefined) {
        champsMiseAJour.push('telephone_mere = ?');
        valeurs.push(eleveData.telephone_mere);
      }
      if (eleveData.nom_tuteur !== undefined) {
        champsMiseAJour.push('nom_tuteur = ?');
        valeurs.push(eleveData.nom_tuteur);
      }
      if (eleveData.telephone_tuteur !== undefined) {
        champsMiseAJour.push('telephone_tuteur = ?');
        valeurs.push(eleveData.telephone_tuteur);
      }
      if (eleveData.lien_tuteur !== undefined) {
        champsMiseAJour.push('lien_tuteur = ?');
        valeurs.push(eleveData.lien_tuteur);
      }
      if (eleveData.adresse !== undefined) {
        champsMiseAJour.push('adresse = ?');
        valeurs.push(eleveData.adresse);
      }
      
      if (champsMiseAJour.length === 0) {
        return { success: false, error: 'Aucun champ à mettre à jour' };
      }
      
      valeurs.push(eleveId);
      
      const query = `UPDATE eleves SET ${champsMiseAJour.join(', ')} WHERE id = ?`;
      const result = db.prepare(query).run(...valeurs);
      
      if (result.changes === 0) {
        return { success: false, error: 'Échec de la mise à jour' };
      }
      
      journalService.enregistrerAction(
        null,
        'MODIFICATION',
        `Modification des informations de l'élève ${eleveExistant.nom} ${eleveExistant.prenom} (${eleveExistant.matricule})`
      );
      
      return { success: true, message: 'Élève mis à jour avec succès' };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'élève :', error);
      return { success: false, error: 'Erreur lors de la mise à jour de l\'élève' };
    }
  }
};

module.exports = elevesService;
