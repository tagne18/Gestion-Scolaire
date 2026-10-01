const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');
const paiementsService = require('./paiements.service');

/**
 * Service de gestion des inscriptions
 */
const inscriptionsService = {
  /**
   * Crée une nouvelle inscription avec génération automatique des tranches
   */
  create(inscriptionData) {
    try {
      const db = getDatabase();
      
      // Validation des champs obligatoires
      if (!inscriptionData.eleve_id || !inscriptionData.annee_scolaire_id || 
          !inscriptionData.classe_id || !inscriptionData.section_id) {
        return { success: false, error: 'Champs obligatoires manquants' };
      }
      
      if (inscriptionData.montant_pension < 0) {
        return { success: false, error: 'Le montant de la pension doit être positif' };
      }
      
      // Vérifier que l'élève n'est pas déjà inscrit pour cette année
      const existing = db.prepare(`
        SELECT id FROM inscriptions
        WHERE eleve_id = ? AND annee_scolaire_id = ?
      `).get(inscriptionData.eleve_id, inscriptionData.annee_scolaire_id);
      
      if (existing) {
        return { success: false, error: 'Cet élève est déjà inscrit pour cette année scolaire' };
      }
      
      // Récupérer les tarifs pour cette classe et cette année
      const tarifs = db.prepare(`
        SELECT montant_inscription, montant_pension_annuel, tranche_1, tranche_2, tranche_3, date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3 
        FROM tarifs_classe
        WHERE classe_id = ? AND annee_scolaire_id = ?
      `).get(inscriptionData.classe_id, inscriptionData.annee_scolaire_id);
      
      // Utiliser le montant_pension des tarifs si non fourni
      const montantPension = inscriptionData.montant_pension && inscriptionData.montant_pension > 0
        ? inscriptionData.montant_pension
        : (tarifs?.montant_pension_annuel || 0);
      
      // Utiliser le montant_inscription des tarifs si non fourni
      const montantInscription = inscriptionData.montant_inscription && inscriptionData.montant_inscription > 0
        ? inscriptionData.montant_inscription
        : (tarifs?.montant_inscription || 0);
      
      // Créer l'inscription
      const result = db.prepare(`
        INSERT INTO inscriptions (
          eleve_id, annee_scolaire_id, classe_id, section_id,
          montant_inscription, montant_pension, reduction, motif_reduction, statut, date_inscription, redoublement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        inscriptionData.eleve_id,
        inscriptionData.annee_scolaire_id,
        inscriptionData.classe_id,
        inscriptionData.section_id,
        montantInscription,
        montantPension,
        inscriptionData.reduction || 0,
        inscriptionData.motif_reduction || null,
        'active',
        inscriptionData.date_inscription || new Date().toISOString().split('T')[0],
        inscriptionData.redoublement || 'premiere_inscription'
      );
      
      const inscriptionId = result.lastInsertRowid;
      
      // Générer les 2 tranches automatiquement avec dates d'échéance fixes
      if (tarifs) {
        // Calculer le total des 2 tranches avant réduction
        const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0);
        
        // Calculer le ratio de réduction à appliquer à chaque tranche
        const ratioReduction = totalTranches > 0 ? (inscriptionData.reduction || 0) / totalTranches : 0;
        
        const tranches = [
          { 
            numero: 1, 
            libelle: 'Tranche 1', 
            montant: tarifs.tranche_1 || 0,
            date_limite: tarifs.date_limite_tranche_1 || null
          },
          { 
            numero: 2, 
            libelle: 'Tranche 2', 
            montant: tarifs.tranche_2 || 0,
            date_limite: tarifs.date_limite_tranche_2 || null
          }
        ];
        
        tranches.forEach(tranche => {
          // Appliquer la réduction proportionnellement à chaque tranche
          const montantReduit = tranche.montant - (tranche.montant * ratioReduction);
          db.prepare(`
            INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
            VALUES (?, ?, ?, ?, ?)
          `).run(inscriptionId, tranche.numero, tranche.libelle, montantReduit, tranche.date_limite);
        });
      }
      
      const inscriptionDetail = db.prepare(`
        SELECT 
          e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
          c.nom as classe_nom, a.libelle as annee_libelle
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE i.id = ?
      `).get(inscriptionId);
      
      journalService.enregistrerAction(
        null,
        'CRÉATION',
        `Inscription de ${inscriptionDetail?.eleve_nom} ${inscriptionDetail?.eleve_prenom} (${inscriptionDetail?.matricule}) en ${inscriptionDetail?.classe_nom} pour l'année ${inscriptionDetail?.annee_libelle} - Inscription: ${montantInscription.toLocaleString()} FCFA - Pension: ${montantPension.toLocaleString()} FCFA${inscriptionData.reduction > 0 ? ' - Réduction: ' + inscriptionData.reduction.toLocaleString() + ' FCFA' : ''}`
      );
      
      return { success: true, data: { id: inscriptionId } };
    } catch (error) {
      console.error('Erreur lors de la création de l\'inscription :', error);
      return { success: false, error: 'Erreur lors de la création de l\'inscription' };
    }
  },
  
  /**
   * Récupère l'inscription active d'un élève pour une année scolaire
   */
  getByEleveAndAnnee(eleveId, anneeScolaireId) {
    try {
      const db = getDatabase();
      const inscription = db.prepare(`
        SELECT i.*, c.nom as classe_nom, c.niveau as classe_niveau,
               s.nom as section_nom, a.libelle as annee_libelle
        FROM inscriptions i
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE i.eleve_id = ? AND i.annee_scolaire_id = ?
      `).get(eleveId, anneeScolaireId);
      
      return { success: true, data: inscription };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inscription :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'inscription' };
    }
  },
  
  /**
   * Récupère les tranches d'une inscription
   */
  getTranches(inscriptionId) {
    try {
      const db = getDatabase();
      
      let tranches = db.prepare(`
        SELECT * FROM tranches
        WHERE inscription_id = ?
        ORDER BY numero
      `).all(inscriptionId);
      
      if (tranches.length === 0) {
        const inscription = db.prepare(`
          SELECT classe_id, annee_scolaire_id, reduction FROM inscriptions WHERE id = ?
        `).get(inscriptionId);
        
        if (inscription) {
          const tarifs = db.prepare(`
            SELECT tranche_1, tranche_2, tranche_3, date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3 
            FROM tarifs_classe
            WHERE classe_id = ? AND annee_scolaire_id = ?
          `).get(inscription.classe_id, inscription.annee_scolaire_id);
          
          if (tarifs) {
            // Calculer le total des 2 tranches avant réduction
            const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0);
            
            // Calculer le ratio de réduction à appliquer à chaque tranche
            const ratioReduction = totalTranches > 0 ? (inscription.reduction || 0) / totalTranches : 0;
            
            const tranchesData = [
              { numero: 1, libelle: 'Tranche 1', montant: tarifs.tranche_1 || 0, date_limite: tarifs.date_limite_tranche_1 || null },
              { numero: 2, libelle: 'Tranche 2', montant: tarifs.tranche_2 || 0, date_limite: tarifs.date_limite_tranche_2 || null }
            ];
            
            tranchesData.forEach(tranche => {
              // Appliquer la réduction proportionnellement à chaque tranche
              const montantReduit = tranche.montant - (tranche.montant * ratioReduction);
              db.prepare(`
                INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
                VALUES (?, ?, ?, ?, ?)
              `).run(inscriptionId, tranche.numero, tranche.libelle, montantReduit, tranche.date_limite);
            });
            
            tranches = db.prepare(`
              SELECT * FROM tranches
              WHERE inscription_id = ?
              ORDER BY numero
            `).all(inscriptionId);
          }
        }
      }
      
      return { success: true, data: tranches };
    } catch (error) {
      console.error('Erreur lors de la récupération des tranches :', error);
      return { success: false, error: 'Erreur lors de la récupération des tranches' };
    }
  },
  
  /**
   * Récupère les élèves inscrits dans une année scolaire
   * @param {Number} anneeScolaireId - ID de l'année scolaire
   */
  getElevesByAnnee(anneeScolaireId) {
    try {
      const db = getDatabase();
      
      const eleves = db.prepare(`
        SELECT 
          e.id,
          e.nom,
          e.prenom,
          e.matricule,
          i.classe_id as ancienne_classe_id,
          i.section_id as ancienne_section_id,
          c.nom as ancienne_classe_nom,
          s.nom as ancienne_section_nom,
          i.montant_pension as ancien_montant
        FROM eleves e
        JOIN inscriptions i ON e.id = i.eleve_id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        WHERE i.annee_scolaire_id = ? AND i.statut = 'active'
        ORDER BY e.nom, e.prenom
      `).all(anneeScolaireId);
      
      return { success: true, data: eleves };
    } catch (error) {
      console.error('Erreur lors de la récupération des élèves :', error);
      return { success: false, error: 'Erreur lors de la récupération des élèves' };
    }
  },

  /**
   * Réinscrit des élèves vers une nouvelle année scolaire
   * @param {Array} reinscriptions - Tableau d'objets { eleve_id, classe_id, section_id, montant_pension, reduction, motif_reduction }
   * @param {Number} nouvelleAnneeId - ID de la nouvelle année scolaire
   */
  reinscrireEleves(reinscriptions, nouvelleAnneeId) {
    try {
      const db = getDatabase();
      
      const resultats = [];
      const erreurs = [];
      
      for (const reinscription of reinscriptions) {
        try {
          // Vérifier que l'élève existe
          const eleve = db.prepare(`
            SELECT id, nom, prenom, matricule FROM eleves WHERE id = ?
          `).get(reinscription.eleve_id);
          
          if (!eleve) {
            erreurs.push({
              eleve_id: reinscription.eleve_id,
              erreur: 'Élève non trouvé'
            });
            continue;
          }
          
          // Vérifier que l'élève n'est pas déjà inscrit dans cette année
          const existing = db.prepare(`
            SELECT id FROM inscriptions
            WHERE eleve_id = ? AND annee_scolaire_id = ?
          `).get(reinscription.eleve_id, nouvelleAnneeId);
          
          if (existing) {
            erreurs.push({
              eleve_id: reinscription.eleve_id,
              eleve_nom: `${eleve.nom} ${eleve.prenom}`,
              erreur: 'Déjà inscrit dans cette année scolaire'
            });
            continue;
          }
          
          // Récupérer les tarifs pour cette classe et cette année
          const tarifs = db.prepare(`
            SELECT montant_inscription, montant_pension_annuel, tranche_1, tranche_2, tranche_3, date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3
            FROM tarifs_classe
            WHERE classe_id = ? AND annee_scolaire_id = ?
          `).get(reinscription.classe_id, nouvelleAnneeId);

          // Utiliser le montant_pension des tarifs si non fourni
          const montantPension = reinscription.montant_pension && reinscription.montant_pension > 0
            ? reinscription.montant_pension
            : (tarifs?.montant_pension_annuel || 0);

          // Utiliser le montant_inscription des tarifs
          const montantInscription = tarifs?.montant_inscription || 0;

          // Utiliser la réduction fournie ou 0 par défaut
          const reduction = reinscription.reduction || 0;
          const motifReduction = reinscription.motif_reduction || null;

          // Créer l'inscription avec réduction
          const inscriptionResult = db.prepare(`
            INSERT INTO inscriptions (
              eleve_id, annee_scolaire_id, classe_id, section_id,
              montant_inscription, montant_pension, reduction, motif_reduction, statut, date_inscription, redoublement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            reinscription.eleve_id,
            nouvelleAnneeId,
            reinscription.classe_id,
            reinscription.section_id,
            montantInscription,
            montantPension,
            reduction,
            motifReduction,
            'active',
            new Date().toISOString().split('T')[0],
            reinscription.redoublement || 'premiere_inscription'
          );
          
          const inscriptionId = inscriptionResult.lastInsertRowid;
          
          // Générer les 2 tranches automatiquement avec application de la réduction
          if (tarifs) {
            // Calculer le total des 2 tranches avant réduction
            const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0);
            
            // Calculer le ratio de réduction à appliquer à chaque tranche
            const ratioReduction = totalTranches > 0 ? reduction / totalTranches : 0;
            
            const tranches = [
              { 
                numero: 1, 
                libelle: 'Tranche 1', 
                montant: tarifs.tranche_1 || 0,
                date_limite: tarifs.date_limite_tranche_1 || null
              },
              { 
                numero: 2, 
                libelle: 'Tranche 2', 
                montant: tarifs.tranche_2 || 0,
                date_limite: tarifs.date_limite_tranche_2 || null
              }
            ];
            
            tranches.forEach(tranche => {
              // Appliquer la réduction proportionnellement à chaque tranche
              const montantReduit = tranche.montant - (tranche.montant * ratioReduction);
              db.prepare(`
                INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
                VALUES (?, ?, ?, ?, ?)
              `).run(inscriptionId, tranche.numero, tranche.libelle, montantReduit, tranche.date_limite);
            });
          }
          
          // Récupérer les détails pour le journal
          const classe = db.prepare(`
            SELECT nom FROM classes WHERE id = ?
          `).get(reinscription.classe_id);
          
          const annee = db.prepare(`
            SELECT libelle FROM annees_scolaires WHERE id = ?
          `).get(nouvelleAnneeId);
          
          const reductionText = reduction > 0 
            ? ` - Réduction: ${reduction.toLocaleString()} FCFA${motifReduction ? ' (' + motifReduction + ')' : ''}` 
            : '';
          
          journalService.enregistrerAction(
            null,
            'RÉINSCRIPTION',
            `Réinscription de ${eleve.nom} ${eleve.prenom} (${eleve.matricule}) en ${classe?.nom} pour l'année ${annee?.libelle} - Inscription: ${montantInscription.toLocaleString()} FCFA - Pension: ${montantPension.toLocaleString()} FCFA${reductionText}`
          );
          
          resultats.push({
            eleve_id: reinscription.eleve_id,
            eleve_nom: `${eleve.nom} ${eleve.prenom}`,
            inscription_id: inscriptionId,
            succes: true
          });
          
        } catch (error) {
          erreurs.push({
            eleve_id: reinscription.eleve_id,
            erreur: error.message
          });
        }
      }
      
      return {
        success: true,
        data: {
          reussis: resultats,
          erreurs: erreurs,
          total: reinscriptions.length,
          reussis_count: resultats.length,
          erreurs_count: erreurs.length
        }
      };
    } catch (error) {
      console.error('Erreur lors de la réinscription des élèves :', error);
      return { success: false, error: 'Erreur lors de la réinscription des élèves' };
    }
  },

  /**
   * Valide une inscription importée (change le statut de 'à_inscrire' à 'active')
   * @param {Number} inscriptionId - ID de l'inscription à valider
   */
  validerInscription(inscriptionId) {
    try {
      const db = getDatabase();
      
      // Récupérer l'inscription actuelle
      const inscription = db.prepare(`
        SELECT i.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
               c.nom as classe_nom, a.libelle as annee_libelle
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE i.id = ?
      `).get(inscriptionId);
      
      if (!inscription) {
        return { success: false, error: 'Inscription non trouvée' };
      }
      
      if (inscription.statut !== 'à_inscrire') {
        return { success: false, error: 'Cette inscription ne peut pas être validée (statut actuel: ' + inscription.statut + ')' };
      }
      
      // Mettre à jour le statut
      const result = db.prepare(`
        UPDATE inscriptions 
        SET statut = 'active' 
        WHERE id = ?
      `).run(inscriptionId);
      
      if (result.changes === 0) {
        return { success: false, error: 'Échec de la mise à jour du statut' };
      }
      
      journalService.enregistrerAction(
        null,
        'VALIDATION',
        `Validation de l'inscription de ${inscription.eleve_nom} ${inscription.eleve_prenom} (${inscription.matricule}) en ${inscription.classe_nom} pour l'année ${inscription.annee_libelle}`
      );
      
      return { success: true, message: 'Inscription validée avec succès' };
    } catch (error) {
      console.error('Erreur lors de la validation de l\'inscription :', error);
      return { success: false, error: 'Erreur lors de la validation de l\'inscription' };
    }
  },

  /**
   * Récupère les inscriptions avec le statut 'à_inscrire' pour l'année active
   */
  getInscriptionsAInscrire() {
    try {
      const db = getDatabase();
      
      // Récupérer l'année scolaire active
      const anneeActive = db.prepare(`
        SELECT id FROM annees_scolaires WHERE active = 1
      `).get();
      
      if (!anneeActive) {
        return { success: false, error: 'Aucune année scolaire active trouvée' };
      }
      
      const inscriptions = db.prepare(`
        SELECT 
          i.id,
          i.eleve_id,
          i.annee_scolaire_id,
          i.classe_id,
          i.section_id,
          i.montant_pension,
          i.date_inscription,
          e.nom as eleve_nom,
          e.prenom as eleve_prenom,
          e.matricule,
          c.nom as classe_nom,
          s.nom as section_nom,
          a.libelle as annee_libelle,
          ei.classe_origine
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        LEFT JOIN eleves_import ei ON e.id = ei.eleve_id
        WHERE i.statut = 'à_inscrire' AND i.annee_scolaire_id = ?
        ORDER BY e.nom, e.prenom
      `).all(anneeActive.id);
      
      return { success: true, data: inscriptions };
    } catch (error) {
      console.error('Erreur lors de la récupération des inscriptions à valider :', error);
      return { success: false, error: 'Erreur lors de la récupération des inscriptions à valider' };
    }
  },

  /**
   * Met à jour la classe et la section d'une inscription
   * @param {Number} inscriptionId - ID de l'inscription
   * @param {Number} classeId - Nouvelle classe ID
   * @param {Number} sectionId - Nouvelle section ID
   */
  updateClasse(inscriptionId, classeId, sectionId) {
    try {
      const db = getDatabase();
      
      // Récupérer l'inscription actuelle
      const inscription = db.prepare(`
        SELECT i.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
               c.nom as ancienne_classe_nom, cn.nom as nouvelle_classe_nom,
               a.libelle as annee_libelle
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN classes cn ON cn.id = ?
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE i.id = ?
      `).get(classeId, inscriptionId);
      
      if (!inscription) {
        return { success: false, error: 'Inscription non trouvée' };
      }
      
      // Récupérer les tarifs pour la nouvelle classe
      const tarifs = db.prepare(`
        SELECT montant_inscription, montant_pension_annuel, tranche_1, tranche_2, tranche_3, 
               date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3
        FROM tarifs_classe
        WHERE classe_id = ? AND annee_scolaire_id = ?
      `).get(classeId, inscription.annee_scolaire_id);
      
      // Mettre à jour l'inscription
      const montantPension = tarifs?.montant_pension_annuel || inscription.montant_pension;
      const montantInscription = tarifs?.montant_inscription || inscription.montant_inscription;
      
      const result = db.prepare(`
        UPDATE inscriptions 
        SET classe_id = ?, section_id = ?, montant_pension = ?, montant_inscription = ?
        WHERE id = ?
      `).run(classeId, sectionId, montantPension, montantInscription, inscriptionId);
      
      if (result.changes === 0) {
        return { success: false, error: 'Échec de la mise à jour de la classe' };
      }
      
      // Supprimer les anciennes tranches
      db.prepare(`DELETE FROM tranches WHERE inscription_id = ?`).run(inscriptionId);
      
      // Générer les nouvelles tranches avec les tarifs de la nouvelle classe
      if (tarifs) {
        const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0);
        const ratioReduction = totalTranches > 0 ? (inscription.reduction || 0) / totalTranches : 0;
        
        const tranches = [
          { 
            numero: 1, 
            libelle: 'Tranche 1', 
            montant: tarifs.tranche_1 || 0,
            date_limite: tarifs.date_limite_tranche_1 || null
          },
          { 
            numero: 2, 
            libelle: 'Tranche 2', 
            montant: tarifs.tranche_2 || 0,
            date_limite: tarifs.date_limite_tranche_2 || null
          }
        ];
        
        tranches.forEach(tranche => {
          const montantReduit = tranche.montant - (tranche.montant * ratioReduction);
          db.prepare(`
            INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
            VALUES (?, ?, ?, ?, ?)
          `).run(inscriptionId, tranche.numero, tranche.libelle, montantReduit, tranche.date_limite);
        });
      }
      
      journalService.enregistrerAction(
        null,
        'MODIFICATION',
        `Changement de classe de ${inscription.eleve_nom} ${inscription.eleve_prenom} (${inscription.matricule}) : ${inscription.ancienne_classe_nom} → ${inscription.nouvelle_classe_nom} pour l'année ${inscription.annee_libelle}`
      );
      
      return { success: true, message: 'Classe mise à jour avec succès' };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la classe :', error);
      return { success: false, error: 'Erreur lors de la mise à jour de la classe' };
    }
  },

  /**
   * Met à jour les tranches d'une inscription pour appliquer la réduction
   * Utile pour corriger les inscriptions existantes dont les tranches n'ont pas la réduction appliquée
   */
  appliquerReductionTranches(inscriptionId) {
    try {
      const db = getDatabase();
      
      // Récupérer l'inscription avec sa réduction
      const inscription = db.prepare(`
        SELECT classe_id, annee_scolaire_id, reduction FROM inscriptions WHERE id = ?
      `).get(inscriptionId);
      
      if (!inscription) {
        return { success: false, error: 'Inscription non trouvée' };
      }
      
      if (!inscription.reduction || inscription.reduction <= 0) {
        return { success: true, message: 'Aucune réduction à appliquer' };
      }
      
      // Récupérer les tarifs de base
      const tarifs = db.prepare(`
        SELECT tranche_1, tranche_2, tranche_3 
        FROM tarifs_classe
        WHERE classe_id = ? AND annee_scolaire_id = ?
      `).get(inscription.classe_id, inscription.annee_scolaire_id);
      
      if (!tarifs) {
        return { success: false, error: 'Tarifs non trouvés pour cette classe' };
      }
      
      // Calculer le total des tranches avant réduction
      const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0) + (tarifs.tranche_3 || 0);
      
      // Calculer le ratio de réduction à appliquer à chaque tranche
      const ratioReduction = totalTranches > 0 ? inscription.reduction / totalTranches : 0;
      
      // Récupérer les tranches actuelles
      const tranches = db.prepare(`
        SELECT * FROM tranches WHERE inscription_id = ? ORDER BY numero
      `).all(inscriptionId);
      
      // Mettre à jour chaque tranche avec le montant réduit
      tranches.forEach(tranche => {
        const montantBase = tranche.numero === 1 ? (tarifs.tranche_1 || 0) :
                           tranche.numero === 2 ? (tarifs.tranche_2 || 0) :
                           tranche.numero === 3 ? (tarifs.tranche_3 || 0) : 0;
        
        const montantReduit = montantBase - (montantBase * ratioReduction);
        
        db.prepare(`
          UPDATE tranches SET montant_attendu = ? WHERE id = ?
        `).run(montantReduit, tranche.id);
      });
      
      return { success: true, message: 'Tranches mises à jour avec la réduction' };
    } catch (error) {
      console.error('Erreur lors de l\'application de la réduction aux tranches :', error);
      return { success: false, error: 'Erreur lors de la mise à jour des tranches' };
    }
  },

  /**
   * Récupère le résumé de solvabilité d'une inscription
   */
  getSolvabilite(inscriptionId) {
    try {
      const db = getDatabase();
      
      let tranches = db.prepare(`
        SELECT * FROM tranches
        WHERE inscription_id = ?
        ORDER BY numero
      `).all(inscriptionId);
      
      if (tranches.length === 0) {
        const inscription = db.prepare(`
          SELECT classe_id, annee_scolaire_id, reduction FROM inscriptions WHERE id = ?
        `).get(inscriptionId);
        
        if (inscription) {
          const tarifs = db.prepare(`
            SELECT tranche_1, tranche_2, tranche_3, date_limite_tranche_1, date_limite_tranche_2, date_limite_tranche_3 
            FROM tarifs_classe
            WHERE classe_id = ? AND annee_scolaire_id = ?
          `).get(inscription.classe_id, inscription.annee_scolaire_id);
          
          if (tarifs) {
            // Calculer le total des 2 tranches avant réduction
            const totalTranches = (tarifs.tranche_1 || 0) + (tarifs.tranche_2 || 0);
            
            // Calculer le ratio de réduction à appliquer à chaque tranche
            const ratioReduction = totalTranches > 0 ? (inscription.reduction || 0) / totalTranches : 0;
            
            const tranchesData = [
              { numero: 1, libelle: 'Tranche 1', montant: tarifs.tranche_1 || 0, date_limite: tarifs.date_limite_tranche_1 || null },
              { numero: 2, libelle: 'Tranche 2', montant: tarifs.tranche_2 || 0, date_limite: tarifs.date_limite_tranche_2 || null }
            ];
            
            tranchesData.forEach(tranche => {
              // Appliquer la réduction proportionnellement à chaque tranche
              const montantReduit = tranche.montant - (tranche.montant * ratioReduction);
              db.prepare(`
                INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
                VALUES (?, ?, ?, ?, ?)
              `).run(inscriptionId, tranche.numero, tranche.libelle, montantReduit, tranche.date_limite);
            });
            
            tranches = db.prepare(`
              SELECT * FROM tranches
              WHERE inscription_id = ?
              ORDER BY numero
            `).all(inscriptionId);
          }
        }
      }
      
      // Calculer le total dû (somme des tranches + montant d'inscription)
      const totalDuTranches = tranches.reduce((sum, t) => sum + parseFloat(t.montant_attendu), 0);

      // Récupérer le montant d'inscription de l'inscription
      const inscriptionDetail = db.prepare(`
        SELECT montant_inscription FROM inscriptions WHERE id = ?
      `).get(inscriptionId);
      const montantInscription = parseFloat(inscriptionDetail?.montant_inscription) || 0;

      const totalDu = totalDuTranches + montantInscription;

      // Récupérer les paiements (tous les paiements pour cette inscription)
      const paiements = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total_paye
        FROM paiements
        WHERE inscription_id = ? AND annule = 0
      `).get(inscriptionId);

      const totalPaye = parseFloat(paiements.total_paye) || 0;
      const resteAPayer = totalDu - totalPaye;
      
      // Calculer le statut de solvabilité
      const aujourdHui = new Date();
      let estInsolvable = false;
      let trancheProblematique = null;
      
      for (const tranche of tranches) {
        if (tranche.date_limite) {
          const dateLimite = new Date(tranche.date_limite);
          
          // Récupérer le montant payé pour cette tranche
          const payeTranche = db.prepare(`
            SELECT COALESCE(SUM(p.montant), 0) as total
            FROM paiements p
            WHERE p.tranche_id = ? AND p.annule = 0
          `).get(tranche.id);
          
          const montantPaye = parseFloat(payeTranche.total) || 0;
          const resteTranche = parseFloat(tranche.montant_attendu) - montantPaye;
          
          // Si reste à payer > 0 et date limite dépassée
          if (resteTranche > 0 && aujourdHui > dateLimite) {
            estInsolvable = true;
            trancheProblematique = {
              numero: tranche.numero,
              libelle: tranche.libelle,
              date_limite: tranche.date_limite,
              reste_a_payer: resteTranche
            };
            break; // Une tranche en retard suffit pour être insolvable
          }
        }
      }
      
      return {
        success: true,
        data: {
          total_du: totalDu,
          total_du_tranches: totalDuTranches,
          montant_inscription: montantInscription,
          total_paye: totalPaye,
          reste_a_payer: resteAPayer,
          statut: estInsolvable ? 'Insolvable' : 'À jour',
          tranche_problematique: trancheProblematique,
          tranches: tranches.map(t => ({
            ...t,
            montant_attendu: parseFloat(t.montant_attendu)
          }))
        }
      };
    } catch (error) {
      console.error('Erreur lors du calcul de la solvabilité :', error);
      return { success: false, error: 'Erreur lors du calcul de la solvabilité' };
    }
  }
};

module.exports = inscriptionsService;
