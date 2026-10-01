const { getDatabase } = require('../database/db');
const inscriptionsService = require('./inscriptions.service');
const journalService = require('./journal.service');

/**
 * Service de gestion des paiements
 */
const paiementsService = {
  /**
   * Crée un nouveau paiement avec répartition automatique
   */
  create(paiementData) {
    try {
      const db = getDatabase();

      // Validation des champs obligatoires
      if (!paiementData.inscription_id || !paiementData.montant || !paiementData.mode) {
        return { success: false, error: 'Champs obligatoires manquants' };
      }

      if (paiementData.montant <= 0) {
        return { success: false, error: 'Le montant doit être positif' };
      }

      // Vérifier que l'inscription est active (pas 'à_inscrire')
      const inscription = db.prepare(`
        SELECT statut, e.nom as eleve_nom, e.prenom as eleve_prenom, i.montant_inscription, i.id as inscription_id
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        WHERE i.id = ?
      `).get(paiementData.inscription_id);

      console.log('Inscription trouvée:', inscription);

      if (!inscription) {
        return { success: false, error: 'Inscription non trouvée' };
      }

      if (inscription.statut === 'à_inscrire') {
        return {
          success: false,
          error: `L'élève ${inscription.eleve_nom} ${inscription.eleve_prenom} n'est pas encore officiellement inscrit. Veuillez d'abord valider son inscription.`
        };
      }

      if (inscription.statut !== 'active') {
        return {
          success: false,
          error: `L'inscription n'est pas active (statut: ${inscription.statut}). Les paiements ne sont pas autorisés.`
        };
      }

      // Si répartition automatique est demandée
      if (paiementData.repartition_auto) {
        return this.createWithRepartitionAuto(paiementData, inscription);
      }

      // Paiement normal (sans répartition automatique)
      const numeroRecu = this.genererNumeroRecu();

      const result = db.prepare(`
        INSERT INTO paiements (
          inscription_id, tranche_id, montant, mode, date_paiement, numero_recu, encaisse_par, notes, date_heure_paiement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        paiementData.inscription_id,
        paiementData.tranche_id || null,
        paiementData.montant,
        paiementData.mode,
        paiementData.date_paiement || new Date().toISOString().split('T')[0],
        numeroRecu,
        paiementData.encaisse_par || null,
        paiementData.notes || null
      );

      const paiementId = result.lastInsertRowid;

      if (paiementData.tranche_id) {
        this.verifierEtMettreAJourTranche(paiementData.inscription_id, paiementData.tranche_id, paiementData.date_paiement);
      }

      const paiementDetail = db.prepare(`
        SELECT
          e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
          c.nom as classe_nom,
          t.libelle as tranche_libelle
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        LEFT JOIN tranches t ON p.tranche_id = t.id
        WHERE p.id = ?
      `).get(paiementId);

      const typePaiement = paiementDetail?.tranche_libelle || 'Paiement';
      journalService.enregistrerAction(
        paiementData.encaisse_par,
        'CRÉATION',
        `Paiement de ${paiementData.montant.toLocaleString()} FCFA - ${typePaiement} - Élève: ${paiementDetail?.eleve_nom} ${paiementDetail?.eleve_prenom} (${paiementDetail?.matricule}) - Classe: ${paiementDetail?.classe_nom} - Mode: ${paiementData.mode} - Reçu: ${numeroRecu}`
      );

      return { success: true, data: { id: paiementId, numero_recu: numeroRecu } };
    } catch (error) {
      console.error('Erreur lors de la création du paiement :', error);
      return { success: false, error: 'Erreur lors de la création du paiement' };
    }
  },

  /**
   * Crée un paiement avec répartition automatique (inscription + tranches)
   */
  createWithRepartitionAuto(paiementData, inscription) {
    try {
      const db = getDatabase();
      const montantInscription = parseFloat(inscription.montant_inscription) || 0;
      const montantTotal = parseFloat(paiementData.montant);
      let montantRestant = montantTotal;
      const paiementsCreés = [];
      const numeroRecuBase = this.genererNumeroRecu();

      console.log('=== DEBUG Répartition Auto ===');
      console.log('Inscription ID:', paiementData.inscription_id);
      console.log('Montant total:', montantTotal);
      console.log('Montant inscription:', montantInscription);

      // Récupérer les tranches de l'inscription
      const tranches = db.prepare(`
        SELECT * FROM tranches WHERE inscription_id = ? ORDER BY numero
      `).all(paiementData.inscription_id);

      console.log('Tranches trouvées:', tranches.length);

      // Récupérer les paiements existants pour l'inscription
      const paiementsExistants = db.prepare(`
        SELECT tranche_id, COALESCE(SUM(montant), 0) as total_paye
        FROM paiements
        WHERE inscription_id = ? AND annule = 0
        GROUP BY tranche_id
      `).all(paiementData.inscription_id);

      console.log('Paiements existants:', paiementsExistants);

      // Calculer le montant déjà payé pour l'inscription (paiements sans tranche_id)
      const paiementInscription = paiementsExistants
        .filter(p => p.tranche_id === null)
        .reduce((sum, p) => sum + parseFloat(p.total_paye), 0);

      const resteInscription = montantInscription - paiementInscription;

      console.log('Paiement inscription:', paiementInscription);
      console.log('Reste inscription:', resteInscription);

      // Étape 1: Payer l'inscription d'abord
      if (resteInscription > 0 && montantRestant > 0) {
        const montantPourInscription = Math.min(montantRestant, resteInscription);
        // Générer un numéro de reçu unique pour ce paiement spécifique
        const numeroRecu = this.genererNumeroRecu();

        console.log('Génération numéro reçu inscription:', numeroRecu);

        const result = db.prepare(`
          INSERT INTO paiements (
            inscription_id, tranche_id, montant, mode, date_paiement, numero_recu, encaisse_par, notes, date_heure_paiement
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `).run(
          paiementData.inscription_id,
          null, // Pas de tranche_id pour l'inscription
          montantPourInscription,
          paiementData.mode,
          paiementData.date_paiement || new Date().toISOString().split('T')[0],
          numeroRecu,
          paiementData.encaisse_par || null,
          `Frais d'inscription - ${paiementData.notes || ''}`
        );

        console.log('Insertion inscription réussie, ID:', result.lastInsertRowid);

        paiementsCreés.push({
          id: result.lastInsertRowid,
          type: 'inscription',
          montant: montantPourInscription,
          numero_recu: numeroRecu
        });

        montantRestant -= montantPourInscription;
      }

      // Étape 2: Payer les tranches avec le reste
      if (montantRestant > 0 && tranches.length > 0) {
        for (const tranche of tranches) {
          if (montantRestant <= 0) break;

          // Calculer le montant déjà payé pour cette tranche
          const payeTranche = paiementsExistants
            .filter(p => p.tranche_id === tranche.id)
            .reduce((sum, p) => sum + parseFloat(p.total_paye), 0);

          const montantAttendu = parseFloat(tranche.montant_attendu);
          const resteTranche = montantAttendu - payeTranche;

          if (resteTranche > 0) {
            const montantPourTranche = Math.min(montantRestant, resteTranche);
            // Générer un numéro de reçu unique pour ce paiement spécifique
            const numeroRecu = this.genererNumeroRecu();

            console.log(`Génération numéro reçu tranche ${tranche.numero}:`, numeroRecu);

            const result = db.prepare(`
              INSERT INTO paiements (
                inscription_id, tranche_id, montant, mode, date_paiement, numero_recu, encaisse_par, notes, date_heure_paiement
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
            `).run(
              paiementData.inscription_id,
              tranche.id,
              montantPourTranche,
              paiementData.mode,
              paiementData.date_paiement || new Date().toISOString().split('T')[0],
              numeroRecu,
              paiementData.encaisse_par || null,
              `${tranche.libelle} - ${paiementData.notes || ''}`
            );

            console.log(`Insertion tranche ${tranche.numero} réussie, ID:`, result.lastInsertRowid);

            paiementsCreés.push({
              id: result.lastInsertRowid,
              type: 'tranche',
              tranche_numero: tranche.numero,
              montant: montantPourTranche,
              numero_recu: numeroRecu
            });

            montantRestant -= montantPourTranche;
            this.verifierEtMettreAJourTranche(paiementData.inscription_id, tranche.id, paiementData.date_paiement);
          }
        }
      }

      // Récupérer les détails pour le journal
      const eleveDetail = db.prepare(`
        SELECT e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule, c.nom as classe_nom
        FROM inscriptions i
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        WHERE i.id = ?
      `).get(paiementData.inscription_id);

      // Journaliser la répartition
      const detailsRepartition = paiementsCreés.map(p => {
        if (p.type === 'inscription') {
          return `Inscription: ${p.montant.toLocaleString()} FCFA (Reçu: ${p.numero_recu})`;
        } else {
          return `Tranche ${p.tranche_numero}: ${p.montant.toLocaleString()} FCFA (Reçu: ${p.numero_recu})`;
        }
      }).join(', ');

      journalService.enregistrerAction(
        paiementData.encaisse_par,
        'CRÉATION',
        `Paiement réparti automatiquement de ${montantTotal.toLocaleString()} FCFA - ${detailsRepartition} - Élève: ${eleveDetail?.eleve_nom} ${eleveDetail?.eleve_prenom} (${eleveDetail?.matricule}) - Classe: ${eleveDetail?.classe_nom} - Mode: ${paiementData.mode}`
      );

      return {
        success: true,
        data: {
          id: paiementsCreés[0]?.id,
          numero_recu: paiementsCreés[0]?.numero_recu,
          repartition: paiementsCreés
        }
      };
    } catch (error) {
      console.error('Erreur lors de la création du paiement avec répartition :', error);
      return { success: false, error: `Erreur lors de la création du paiement avec répartition: ${error.message}` };
    }
  },

  /**
   * Génère un numéro de reçu unique au format REC-ANNEE-SEQUENCE
   * La séquence est remise à zéro chaque année civile
   * Ajoute un suffixe aléatoire pour éviter les conflits lors d'appels rapides
   */
  genererNumeroRecu() {
    const db = getDatabase();
    const date = new Date();
    const annee = date.getFullYear();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Récupérer le dernier numéro de reçu de l'année civile
    const dernierRecu = db.prepare(`
      SELECT numero_recu FROM paiements
      WHERE numero_recu LIKE ?
      ORDER BY numero_recu DESC
      LIMIT 1
    `).get(`REC-${annee}-%`);

    let sequence = 1;
    if (dernierRecu) {
      // Extraire la séquence du format REC-ANNEE-SEQUENCE-RANDOM
      const parts = dernierRecu.numero_recu.split('-');
      if (parts.length >= 3) {
        const derniereSequence = parseInt(parts[2]);
        sequence = derniereSequence + 1;
      }
    }

    const sequenceFormatee = sequence.toString().padStart(6, '0');
    return `REC-${annee}-${sequenceFormatee}-${randomSuffix}`;
  },

  /**
   * Vérifie si une tranche est soldée et met à jour la date limite de la suivante
   */
  verifierEtMettreAJourTranche(inscriptionId, trancheId, datePaiement) {
    try {
      const db = getDatabase();

      // Récupérer la tranche
      const tranche = db.prepare(`
        SELECT * FROM tranches WHERE id = ?
      `).get(trancheId);

      if (!tranche) return;

      // Calculer le montant payé pour cette tranche
      const payeTranche = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM paiements
        WHERE tranche_id = ? AND annule = 0
      `).get(trancheId);

      const montantPaye = parseFloat(payeTranche.total) || 0;
      const montantAttendu = parseFloat(tranche.montant_attendu);

      // Avec le nouveau système de dates fixes, plus besoin de recalculer les dates limites
      // Les dates sont définies à l'avance dans tarifs_classe
    } catch (error) {
      console.error('Erreur lors de la vérification de la tranche :', error);
    }
  },

  /**
   * Récupère les paiements d'une inscription
   */
  getByInscription(inscriptionId) {
    try {
      const db = getDatabase();
      const paiements = db.prepare(`
        SELECT p.*, t.libelle as tranche_libelle, t.numero as tranche_numero
        FROM paiements p
        LEFT JOIN tranches t ON p.tranche_id = t.id
        WHERE p.inscription_id = ?
        ORDER BY p.date_paiement DESC
      `).all(inscriptionId);

      return { success: true, data: paiements };
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements :', error);
      return { success: false, error: 'Erreur lors de la récupération des paiements' };
    }
  },

  /**
   * Récupère les paiements d'une tranche
   */
  getByTranche(trancheId) {
    try {
      const db = getDatabase();
      const paiements = db.prepare(`
        SELECT * FROM paiements
        WHERE tranche_id = ? AND annule = 0
        ORDER BY date_paiement DESC
      `).all(trancheId);

      return { success: true, data: paiements };
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements :', error);
      return { success: false, error: 'Erreur lors de la récupération des paiements' };
    }
  },

  /**
   * Récupère un paiement par son ID avec tous les détails
   */
  getById(paiementId) {
    try {
      const db = getDatabase();
      const paiement = db.prepare(`
        SELECT 
          p.*,
          t.libelle as tranche_libelle,
          t.numero as tranche_numero,
          i.eleve_id,
          i.montant_pension,
          i.reduction,
          e.nom as eleve_nom,
          e.prenom as eleve_prenom,
          e.matricule as eleve_matricule,
          c.nom as classe_nom,
          s.nom as section_nom,
          u.nom as encaisse_par_nom
        FROM paiements p
        LEFT JOIN tranches t ON p.tranche_id = t.id
        LEFT JOIN inscriptions i ON p.inscription_id = i.id
        LEFT JOIN eleves e ON i.eleve_id = e.id
        LEFT JOIN classes c ON i.classe_id = c.id
        LEFT JOIN sections s ON i.section_id = s.id
        LEFT JOIN utilisateurs u ON p.encaisse_par = u.id
        WHERE p.id = ?
      `).get(paiementId);

      if (!paiement) {
        return { success: false, error: 'Paiement non trouvé' };
      }

      // Calculer le reste à payer total pour l'inscription
      const totalDu = parseFloat(paiement.montant_pension) - parseFloat(paiement.reduction || 0);
      const totalPaye = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM paiements
        WHERE inscription_id = ? AND annule = 0
      `).get(paiement.inscription_id);

      const resteAPayer = totalDu - parseFloat(totalPaye.total);

      // Ajouter le reste à payer aux données
      paiement.reste_a_payer = Math.max(0, resteAPayer);
      paiement.total_du = totalDu;
      paiement.total_paye = parseFloat(totalPaye.total);

      return { success: true, data: paiement };
    } catch (error) {
      console.error('Erreur lors de la récupération du paiement :', error);
      return { success: false, error: 'Erreur lors de la récupération du paiement' };
    }
  },

  /**
   * Annule un paiement (marque comme annulé sans le supprimer)
   */
  annuler(paiementId, motifAnnulation) {
    try {
      const db = getDatabase();

      if (!motifAnnulation || motifAnnulation.trim() === '') {
        return { success: false, error: 'Le motif d\'annulation est obligatoire' };
      }

      const paiementAvant = db.prepare(`
        SELECT p.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        JOIN eleves e ON i.eleve_id = e.id
        WHERE p.id = ?
      `).get(paiementId);

      const result = db.prepare(`
        UPDATE paiements
        SET annule = 1, motif_annulation = ?
        WHERE id = ?
      `).run(motifAnnulation, paiementId);

      if (result.changes === 0) {
        return { success: false, error: 'Paiement non trouvé' };
      }

      journalService.enregistrerAction(
        null,
        'ANNULATION',
        `Annulation paiement n°${paiementAvant?.numero_recu} de ${parseFloat(paiementAvant?.montant || 0).toLocaleString()} FCFA - Élève: ${paiementAvant?.eleve_nom} ${paiementAvant?.eleve_prenom} (${paiementAvant?.matricule}) - Motif: ${motifAnnulation}`
      );

      return { success: true, message: 'Paiement annulé avec succès' };
    } catch (error) {
      console.error('Erreur lors de l\'annulation du paiement :', error);
      return { success: false, error: 'Erreur lors de l\'annulation du paiement' };
    }
  },

  /**
   * Récupère les paiements journaliers pour une période donnée
   */
  getPaiementsJournaliers(dateDebut, dateFin) {
    try {
      const db = getDatabase();

      const paiements = db.prepare(`
        SELECT 
          p.id,
          p.date_paiement,
          p.montant,
          p.mode,
          p.numero_recu,
          p.annule,
          p.motif_annulation,
          e.nom as eleve_nom,
          e.prenom as eleve_prenom,
          e.matricule,
          c.nom as classe_nom,
          s.nom as section_nom,
          t.libelle as tranche_libelle,
          t.numero as tranche_numero,
          a.libelle as annee_scolaire
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        JOIN eleves e ON i.eleve_id = e.id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON i.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        LEFT JOIN tranches t ON p.tranche_id = t.id
        WHERE p.date_paiement >= ? AND p.date_paiement <= ?
        ORDER BY p.date_paiement DESC, p.id DESC
      `).all(dateDebut, dateFin);

      return { success: true, data: paiements };
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements journaliers :', error);
      return { success: false, error: 'Erreur lors de la récupération des paiements journaliers' };
    }
  },

  /**
   * Récupère le résumé des paiements par jour
   */
  getResumeParJour(dateDebut, dateFin) {
    try {
      const db = getDatabase();

      const resume = db.prepare(`
        SELECT 
          p.date_paiement,
          COUNT(DISTINCT p.id) as nb_paiements,
          COUNT(DISTINCT p.inscription_id) as nb_eleves,
          COALESCE(SUM(CASE WHEN p.annule = 0 THEN p.montant ELSE 0 END), 0) as total_encaisse,
          COALESCE(SUM(CASE WHEN p.annule = 1 THEN p.montant ELSE 0 END), 0) as total_annule
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        WHERE p.date_paiement >= ? AND p.date_paiement <= ?
        GROUP BY p.date_paiement
        ORDER BY p.date_paiement DESC
      `).all(dateDebut, dateFin);

      return { success: true, data: resume };
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé par jour :', error);
      return { success: false, error: 'Erreur lors de la récupération du résumé par jour' };
    }
  }
};

module.exports = paiementsService;
