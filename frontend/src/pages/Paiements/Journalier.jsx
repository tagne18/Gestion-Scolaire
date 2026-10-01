import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/ipcClient';
import html2pdf from 'html2pdf.js';

function Journalier() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnnulationModal, setShowAnnulationModal] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    // Initialiser avec le mois courant
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateDebut && dateFin) {
      chargerDonnees();
    }
  }, [dateDebut, dateFin]);

  const chargerDonnees = async () => {
    setLoading(true);
    setError('');

    try {
      const paiementsResult = await api.paiements.getJournaliers(dateDebut, dateFin);

      if (paiementsResult.success) {
        setPaiements(paiementsResult.data);
      } else {
        setError(paiementsResult.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exporterExcel = () => {
    const headers = ['Date', 'Élève', 'Matricule', 'Classe', 'Section', 'Montant', 'Mode', 'Reçu', 'Tranche', 'Annulé'];
    const rows = paiements.map(p => [
      p.date_paiement,
      `${p.eleve_nom} ${p.eleve_prenom}`,
      p.matricule,
      p.classe_nom,
      p.section_nom,
      p.montant,
      p.mode,
      p.numero_recu || 'N/A',
      p.tranche_libelle || 'Frais inscription',
      p.annule ? 'Oui' : 'Non'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `paiements_${dateDebut}_${dateFin}.csv`;
    link.click();
  };

  const handleAnnulerPaiement = async () => {
    if (!motifAnnulation.trim()) {
      setError('Le motif d\'annulation est obligatoire');
      return;
    }

    try {
      const result = await api.paiements.annuler(selectedPaiement.id, motifAnnulation);

      if (result.success) {
        setShowAnnulationModal(false);
        setMotifAnnulation('');
        setSelectedPaiement(null);
        chargerDonnees();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de l\'annulation du paiement');
      console.error(err);
    }
  };

  const openAnnulationModal = (paiement) => {
    setSelectedPaiement(paiement);
    setMotifAnnulation('');
    setShowAnnulationModal(true);
  };

  const handleImprimer = () => {
    window.print();
  };

  const buildApercuHtml = () => {
    const rows = paiements.map((p) => `
      <tr>
        <td>${p.date_paiement || ''}</td>
        <td>${(p.eleve_nom || '') + ' ' + (p.eleve_prenom || '')}</td>
        <td>${p.matricule || ''}</td>
        <td>${(p.classe_nom || '') + ' (' + (p.section_nom || '') + ')'}</td>
        <td>${formatMontant(p.montant)}</td>
        <td>${p.mode || ''}</td>
        <td>${p.numero_recu || 'N/A'}</td>
        <td>${p.tranche_libelle || 'Frais inscription'}</td>
        <td>${p.annule ? 'Annulé' : 'Validé'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Aperçu impression - Journal des paiements</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #111;
            }
            h1 {
              text-align: center;
              margin-bottom: 12px;
              font-size: 22px;
            }
            .meta {
              text-align: center;
              font-size: 12px;
              margin-bottom: 18px;
              color: #444;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #bbb;
              padding: 8px 6px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f3f3;
              font-weight: 700;
            }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Journal des paiements</h1>
          <div class="meta">
            Période : du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}<br>
            Date d'impression : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Élève</th>
                <th>Matricule</th>
                <th>Classe</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Reçu</th>
                <th>Tranche</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="9">Aucun paiement</td></tr>'}
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 14px; cursor: pointer;">Imprimer</button>
          </div>
        </body>
      </html>
    `;
  };

  const handleApercuImpression = () => {
    if (!paiements.length) {
      setError('Aucun paiement à prévisualiser');
      return;
    }

    const previewWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!previewWindow) {
      setError('Le bloqueur de popup a empêché l’aperçu. Autorisez les fenêtres popup.');
      return;
    }

    previewWindow.document.write(buildApercuHtml());
    previewWindow.document.close();
    previewWindow.focus();
  };

  const handleTelechargerPDF = () => {
    const rowsHtml = paiements.length
      ? paiements.map((p) => `
        <tr>
          <td>${p.date_paiement || ''}</td>
          <td>${(p.eleve_nom || '') + ' ' + (p.eleve_prenom || '')}</td>
          <td>${p.matricule || ''}</td>
          <td>${(p.classe_nom || '') + ' (' + (p.section_nom || '') + ')'}</td>
          <td>${formatMontant(p.montant)}</td>
          <td>${p.mode || ''}</td>
          <td>${p.numero_recu || 'N/A'}</td>
          <td>${p.tranche_libelle || 'Frais inscription'}</td>
          <td style="text-align:center;">${p.annule ? 'Annulé' : 'Validé'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="9" style="text-align:center; padding:12px;">Aucun paiement</td></tr>';

    const content = document.createElement('div');
    content.innerHTML = `
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; color: #111; margin: 0; }
        h1 { text-align: center; margin: 0 0 8px; font-size: 22px; }
        .meta { text-align: center; font-size: 12px; margin-bottom: 14px; color: #333; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #bdbdbd; padding: 7px 6px; text-align: left; vertical-align: top; }
        th { background: #f3f3f3; font-weight: 700; }
        tr { page-break-inside: avoid; page-break-after: auto; }
      </style>
      <h1>Journal des paiements</h1>
      <div class="meta">
        Période : du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}<br>
        Date d'impression : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Élève</th>
            <th>Matricule</th>
            <th>Classe</th>
            <th>Montant</th>
            <th>Mode</th>
            <th>Reçu</th>
            <th>Tranche</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `journal_paiements_${dateDebut}_${dateFin}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowHeight: 1000,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(content).save();
  };

  const formatMontant = (montant) => {
    return parseFloat(montant || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <div ref={printRef} style={{ padding: '20px' }}>
      <style>
        {`
          @media print {
            @page {
              size: portrait;
              margin: 1cm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            table {
              page-break-inside: auto;
              width: 100%;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            td, th {
              page-break-inside: avoid;
            }
          }
          .print-only {
            display: none;
          }
          /* Classes pour les sauts de page PDF */
          .page-break-before {
            page-break-before: always;
          }
          .page-break-after {
            page-break-after: always;
          }
          .page-break-avoid {
            page-break-inside: avoid;
          }
          @media print {
            .print-table-container {
              max-height: none !important;
              overflow: visible !important;
            }
            body, html {
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            nav, header, aside, .sidebar, [role="navigation"], .topbar, .menu,
            .toolbar, [class*="nav"], [class*="menu"], .MuiAppBar-root,
            .app-header, .app-sidebar, .window-controls {
              display: none !important;
            }
          }
        `}
      </style>

      <h1 style={{ marginBottom: '30px' }}>Journal des paiements</h1>

      {/* En-tête d'impression */}
      <div className="print-only" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Groupe Scolaire D'eloundem II</h2>
        <p style={{ margin: '0 0 10px 0' }}>Journal des paiements</p>
        <p style={{ margin: '0', fontSize: '12px' }}>
          Période : du {new Date(dateDebut).toLocaleDateString('fr-FR')} au {new Date(dateFin).toLocaleDateString('fr-FR')}
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
          Date d'impression : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Filtres de date */}
      <div className="no-print" style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '0px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Date début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Date fin
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            onClick={chargerDonnees}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Chargement...' : 'Filtrer'}
          </button>
          <button
            onClick={exporterExcel}
            disabled={paiements.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: paiements.length === 0 ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paiements.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Exporter Excel
          </button>
          <button
            onClick={handleApercuImpression}
            disabled={paiements.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: paiements.length === 0 ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paiements.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Aperçu avant impression
          </button>
          <button
            onClick={handleImprimer}
            disabled={paiements.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: paiements.length === 0 ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paiements.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Imprimer
          </button>
          <button
            onClick={handleTelechargerPDF}
            disabled={paiements.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: paiements.length === 0 ? '#6c757d' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paiements.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Télécharger PDF
          </button>
        </div>
      </div>

      {/* Liste des paiements */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '0px solid #ddd'
      }}>
        <h3 style={{ marginBottom: '15px' }}>Détail des paiements ({paiements.length})</h3>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>
        ) : paiements.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Aucun paiement pour cette période
          </div>
        ) : (
          <div className="print-table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead style={{ backgroundColor: 'white' }}>
                <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Élève</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Matricule</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Classe</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Montant</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Mode</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Reçu</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Tranche</th>
                  <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Statut</th>
                  <th className="no-print" style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: p.annule ? '#fff3cd' : 'white'
                  }}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.date_paiement}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <strong>{p.eleve_nom}</strong> {p.eleve_prenom}
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px', color: '#666', border: '1px solid #ddd' }}>{p.matricule}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.classe_nom} ({p.section_nom})</td>
                    <td style={{ padding: '10px', fontWeight: '500', border: '1px solid #ddd' }}>{formatMontant(p.montant)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.mode}</td>
                    <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #ddd' }}>{p.numero_recu || 'N/A'}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.tranche_libelle || 'Frais inscription'}</td>
                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                      {p.annule ? (
                        <span style={{ color: '#c62828', fontSize: '12px' }}>Annulé</span>
                      ) : (
                        <span style={{ color: '#2e7d32', fontSize: '12px' }}>Validé</span>
                      )}
                    </td>
                    <td className="no-print" style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                      {!p.annule && (
                        <button
                          onClick={() => openAnnulationModal(p)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal d'annulation */}
      {showAnnulationModal && selectedPaiement && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Annuler le paiement</h3>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p><strong>Élève :</strong> {selectedPaiement.eleve_nom} {selectedPaiement.eleve_prenom}</p>
              <p><strong>Montant :</strong> {formatMontant(selectedPaiement.montant)}</p>
              <p><strong>Mode :</strong> {selectedPaiement.mode}</p>
              <p><strong>Reçu n° :</strong> {selectedPaiement.numero_recu || 'N/A'}</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Motif d'annulation *
              </label>
              <textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                placeholder="Expliquez pourquoi ce paiement doit être annulé..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAnnulationModal(false);
                  setMotifAnnulation('');
                  setSelectedPaiement(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAnnulerPaiement}
                disabled={!motifAnnulation.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !motifAnnulation.trim() ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !motifAnnulation.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Journalier;
