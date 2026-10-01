const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');

const documentsService = {
  /**
   * Génère un certificat de scolarité pour un élève
   */
  genererCertificatScolarite(eleveId, anneeScolaireId) {
    try {
      const db = getDatabase();
      
      const eleve = db.prepare(`
        SELECT e.*, 
               i.classe_id, i.annee_scolaire_id, i.date_inscription,
               c.nom as classe_nom,
               s.nom as section_nom,
               a.libelle as annee_scolaire_libelle
        FROM eleves e
        JOIN inscriptions i ON e.id = i.eleve_id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON c.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE e.id = ? AND i.annee_scolaire_id = ? AND i.statut = 'active'
      `).get(eleveId, anneeScolaireId);
      
      if (!eleve) {
        return { success: false, error: 'Élève non trouvé ou non inscrit pour cette année scolaire' };
      }
      
      const dateActuelle = new Date().toLocaleDateString('fr-FR');
      
      const certificat = {
        type: 'certificat_scolarite',
        titre: 'CERTIFICAT DE SCOLARITÉ',
        eleve: {
          nom: eleve.nom,
          prenom: eleve.prenom,
          date_naissance: eleve.date_naissance,
          matricule: eleve.matricule
        },
        inscription: {
          classe: eleve.classe_nom,
          section: eleve.section_nom,
          annee_scolaire: eleve.annee_scolaire_libelle,
          date_inscription: eleve.date_inscription
        },
        date_generation: dateActuelle,
        contenu: `
          <html>
            <head>
              <title>Certificat de Scolarité</title>
              <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 40px; }
                .header h1 { color: #1a1a1a; margin-bottom: 10px; }
                .content { margin: 40px 0; text-align: justify; }
                .content p { margin-bottom: 15px; font-size: 16px; }
                .footer { margin-top: 60px; text-align: right; }
                .signature { margin-top: 80px; }
                .stamp { position: absolute; top: 100px; right: 100px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>ÉTABLISSEMENT SCOLAIRE GSB MCD</h1>
                <p>Certificat de Scolarité</p>
              </div>
              
              <div class="content">
                <p>Je soussigné, Directeur de l'établissement, certifie que l'élève :</p>
                
                <p><strong>Nom :</strong> ${eleve.nom.toUpperCase()}</p>
                <p><strong>Prénom :</strong> ${eleve.prenom}</p>
                <p><strong>Né(e) le :</strong> ${eleve.date_naissance}</p>
                <p><strong>Matricule :</strong> ${eleve.matricule}</p>
                
                <p>Est régulièrement inscrit(e) dans notre établissement pour l'année scolaire <strong>${eleve.annee_scolaire_libelle}</strong> dans la classe de <strong>${eleve.classe_nom}</strong> (${eleve.section_nom}).</p>
                
                <p>Ce certificat est délivré pour servir et valoir ce que de droit.</p>
              </div>
              
              <div class="footer">
                <p>Fait à ${eleve.adresse || 'l\'établissement'}, le ${dateActuelle}</p>
                <div class="signature">
                  <p>Le Directeur</p>
                  <p style="margin-top: 40px;">Signature</p>
                </div>
              </div>
            </body>
          </html>
        `
      };
      
      journalService.enregistrerAction(
        null,
        'DOCUMENT',
        `Génération certificat de scolarité pour ${eleve.nom} ${eleve.prenom} (${eleve.matricule})`
      );
      
      return { success: true, data: certificat };
    } catch (error) {
      console.error('Erreur lors de la génération du certificat :', error);
      return { success: false, error: 'Erreur lors de la génération du certificat' };
    }
  },

  /**
   * Génère une attestation de paiement pour un élève
   */
  genererAttestationPaiement(eleveId, anneeScolaireId) {
    try {
      const db = getDatabase();
      
      const eleve = db.prepare(`
        SELECT e.*, 
               i.classe_id, i.annee_scolaire_id, i.montant_pension, i.reduction,
               c.nom as classe_nom,
               s.nom as section_nom,
               a.libelle as annee_scolaire_libelle
        FROM eleves e
        JOIN inscriptions i ON e.id = i.eleve_id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON c.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE e.id = ? AND i.annee_scolaire_id = ? AND i.statut = 'active'
      `).get(eleveId, anneeScolaireId);
      
      if (!eleve) {
        return { success: false, error: 'Élève non trouvé ou non inscrit pour cette année scolaire' };
      }
      
      // Récupérer les paiements
      const paiements = db.prepare(`
        SELECT p.*, t.libelle as tranche_libelle
        FROM paiements p
        JOIN inscriptions i ON p.inscription_id = i.id
        LEFT JOIN tranches t ON p.tranche_id = t.id
        WHERE i.eleve_id = ? AND i.annee_scolaire_id = ? AND p.annule = 0
        ORDER BY p.date_paiement DESC
      `).all(eleveId, anneeScolaireId);
      
      const totalPaye = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);
      const totalDu = parseFloat(eleve.montant_pension) - parseFloat(eleve.reduction || 0);
      const resteAPayer = totalDu - totalPaye;
      
      const dateActuelle = new Date().toLocaleDateString('fr-FR');
      
      const attestation = {
        type: 'attestation_paiement',
        titre: 'ATTESTATION DE PAIEMENT',
        eleve: {
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule: eleve.matricule
        },
        inscription: {
          classe: eleve.classe_nom,
          section: eleve.section_nom,
          annee_scolaire: eleve.annee_scolaire_libelle,
          montant_pension: parseFloat(eleve.montant_pension),
          reduction: parseFloat(eleve.reduction || 0)
        },
        paiements: {
          total_paye: totalPaye,
          total_du: totalDu,
          reste_a_payer: resteAPayer,
          details: paiements.map(p => ({
            date: p.date_paiement,
            montant: parseFloat(p.montant),
            tranche: p.tranche_libelle || 'Frais d\'inscription',
            numero_recu: p.numero_recu
          }))
        },
        date_generation: dateActuelle,
        contenu: `
          <html>
            <head>
              <title>Attestation de Paiement</title>
              <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 40px; }
                .header h1 { color: #1a1a1a; margin-bottom: 10px; }
                .content { margin: 40px 0; }
                .content p { margin-bottom: 10px; font-size: 16px; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .table th, .table td { border: 1px solid #333; padding: 10px; text-align: left; }
                .table th { background-color: #f0f0f0; }
                .total { font-weight: bold; margin-top: 20px; }
                .footer { margin-top: 60px; text-align: right; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>ÉTABLISSEMENT SCOLAIRE GSB MCD</h1>
                <p>Attestation de Paiement</p>
              </div>
              
              <div class="content">
                <p>Je soussigné, Directeur de l'établissement, atteste que l'élève :</p>
                
                <p><strong>Nom :</strong> ${eleve.nom.toUpperCase()}</p>
                <p><strong>Prénom :</strong> ${eleve.prenom}</p>
                <p><strong>Matricule :</strong> ${eleve.matricule}</p>
                <p><strong>Classe :</strong> ${eleve.classe_nom} (${eleve.section_nom})</p>
                <p><strong>Année scolaire :</strong> ${eleve.annee_scolaire_libelle}</p>
                
                <p><strong>Montant de la pension :</strong> ${new Intl.NumberFormat('fr-FR').format(eleve.montant_pension)} FCFA</p>
                ${eleve.reduction > 0 ? `<p><strong>Réduction :</strong> ${new Intl.NumberFormat('fr-FR').format(eleve.reduction)} FCFA</p>` : ''}
                <p><strong>Montant à payer :</strong> ${new Intl.NumberFormat('fr-FR').format(totalDu)} FCFA</p>
                
                <p><strong>Montant payé à ce jour :</strong> ${new Intl.NumberFormat('fr-FR').format(totalPaye)} FCFA</p>
                <p class="total"><strong>Reste à payer :</strong> ${new Intl.NumberFormat('fr-FR').format(resteAPayer)} FCFA</p>
                
                ${paiements.length > 0 ? `
                <h3>Détails des paiements :</h3>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Libellé</th>
                      <th>Montant</th>
                      <th>N° Reçu</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${paiements.map(p => `
                      <tr>
                        <td>${p.date_paiement}</td>
                        <td>${p.tranche_libelle || 'Frais d\'inscription'}</td>
                        <td>${new Intl.NumberFormat('fr-FR').format(p.montant)} FCFA</td>
                        <td>${p.numero_recu}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ` : '<p>Aucun paiement effectué à ce jour.</p>'}
                
                <p>Cette attestation est délivrée pour servir et valoir ce que de droit.</p>
              </div>
              
              <div class="footer">
                <p>Fait à l'établissement, le ${dateActuelle}</p>
                <p>Le Directeur</p>
                <p style="margin-top: 40px;">Signature</p>
              </div>
            </body>
          </html>
        `
      };
      
      journalService.enregistrerAction(
        null,
        'DOCUMENT',
        `Génération attestation de paiement pour ${eleve.nom} ${eleve.prenom} (${eleve.matricule})`
      );
      
      return { success: true, data: attestation };
    } catch (error) {
      console.error('Erreur lors de la génération de l\'attestation :', error);
      return { success: false, error: 'Erreur lors de la génération de l\'attestation' };
    }
  },

  /**
   * Génère un relevé de notes pour un élève
   */
  genererReleveNotes(eleveId, anneeScolaireId) {
    try {
      const db = getDatabase();
      
      const eleve = db.prepare(`
        SELECT e.*, 
               i.classe_id, i.annee_scolaire_id,
               c.nom as classe_nom,
               s.nom as section_nom,
               a.libelle as annee_scolaire_libelle
        FROM eleves e
        JOIN inscriptions i ON e.id = i.eleve_id
        JOIN classes c ON i.classe_id = c.id
        JOIN sections s ON c.section_id = s.id
        JOIN annees_scolaires a ON i.annee_scolaire_id = a.id
        WHERE e.id = ? AND i.annee_scolaire_id = ? AND i.statut = 'active'
      `).get(eleveId, anneeScolaireId);
      
      if (!eleve) {
        return { success: false, error: 'Élève non trouvé ou non inscrit pour cette année scolaire' };
      }
      
      const dateActuelle = new Date().toLocaleDateString('fr-FR');
      
      const releve = {
        type: 'releve_notes',
        titre: 'RELEVÉ DE NOTES',
        eleve: {
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule: eleve.matricule,
          date_naissance: eleve.date_naissance
        },
        inscription: {
          classe: eleve.classe_nom,
          section: eleve.section_nom,
          annee_scolaire: eleve.annee_scolaire_libelle
        },
        notes: [], // À implémenter avec un système de notes
        date_generation: dateActuelle,
        contenu: `
          <html>
            <head>
              <title>Relevé de Notes</title>
              <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 40px; }
                .header h1 { color: #1a1a1a; margin-bottom: 10px; }
                .content { margin: 40px 0; }
                .content p { margin-bottom: 10px; font-size: 16px; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .table th, .table td { border: 1px solid #333; padding: 10px; text-align: center; }
                .table th { background-color: #f0f0f0; }
                .footer { margin-top: 60px; text-align: right; }
                .note { font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>ÉTABLISSEMENT SCOLAIRE GSB MCD</h1>
                <p>Relevé de Notes</p>
              </div>
              
              <div class="content">
                <p><strong>Nom :</strong> ${eleve.nom.toUpperCase()}</p>
                <p><strong>Prénom :</strong> ${eleve.prenom}</p>
                <p><strong>Matricule :</strong> ${eleve.matricule}</p>
                <p><strong>Classe :</strong> ${eleve.classe_nom} (${eleve.section_nom})</p>
                <p><strong>Année scolaire :</strong> ${eleve.annee_scolaire_libelle}</p>
                
                <p style="margin-top: 30px; font-style: italic;">Le système de notes n'est pas encore implémenté. Veuillez contacter l'administration pour plus d'informations.</p>
                
                <p>Ce relevé est délivré pour servir et valoir ce que de droit.</p>
              </div>
              
              <div class="footer">
                <p>Fait à l'établissement, le ${dateActuelle}</p>
                <p>Le Directeur</p>
                <p style="margin-top: 40px;">Signature</p>
              </div>
            </body>
          </html>
        `
      };
      
      journalService.enregistrerAction(
        null,
        'DOCUMENT',
        `Génération relevé de notes pour ${eleve.nom} ${eleve.prenom} (${eleve.matricule})`
      );
      
      return { success: true, data: releve };
    } catch (error) {
      console.error('Erreur lors de la génération du relevé :', error);
      return { success: false, error: 'Erreur lors de la génération du relevé' };
    }
  }
};

module.exports = documentsService;
