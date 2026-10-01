import React, { useRef, useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import api from '../../api/ipcClient';
import html2pdf from 'html2pdf.js';

function Recu({ paiementId, repartitionData, onClose }) {
  const [paiement, setPaiement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printOrientation, setPrintOrientation] = useState('landscape');
  const printContainerRef = useRef(null);

  useEffect(() => {
    if (paiementId) {
      loadPaiement(Array.isArray(repartitionData) ? repartitionData : null);
    } else if (repartitionData) {
      setPaiement(repartitionData);
      setLoading(false);
    }
  }, [paiementId, repartitionData]);

  const loadPaiement = async (repartition = null) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.paiements.getById(paiementId);
      if (result.success) {
        setPaiement({
          ...result.data,
          ...(repartition ? { repartition } : {})
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement du reçu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildApercuHtml = (orientation = printOrientation) => {
    const parentHtml = renderToStaticMarkup(renderRecuContent('parent'));
    const ecoleHtml = renderToStaticMarkup(renderRecuContent('ecole'));

    return `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Aperçu du reçu</title>
          <style>
            * { box-sizing: border-box; }
            @page {
              size: ${orientation};
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #111;
            }
            .wrap {
              display: flex;
              gap: 18px;
              width: 100%;
              min-height: 100vh;
              align-items: flex-start;
            }
            .copy {
              flex: 1;
            }
            .separator {
              width: 2px;
              border-left: 2px dashed #999;
              align-self: stretch;
              min-height: 100%;
            }
            .recu {
              background: white;
              padding: 15px;
              border: 1px solid #333;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 1px solid #333;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 16px;
            }
            .header p {
              margin: 0;
              font-size: 10px;
              color: #666;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 11px;
            }
            .info-block {
              background: #f8f9fa;
              padding: 10px;
              border-radius: 3px;
              margin-bottom: 15px;
            }
            .info-block h2, .paiement h2 {
              margin: 0 0 8px 0;
              font-size: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              font-size: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 6px 0;
              font-size: 10px;
            }
            .amount {
              text-align: right;
              font-size: 14px;
              font-weight: bold;
            }
            .total {
              text-align: right;
              padding: 10px;
              background: #e9ecef;
              border-radius: 3px;
              margin-bottom: 15px;
            }
            .total .label {
              font-size: 10px;
              color: #666;
              margin-bottom: 3px;
            }
            .total .value {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            .total .rest {
              font-size: 16px;
              font-weight: bold;
            }
            .footer {
              margin-top: auto;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 9px;
              color: #999;
            }
            button { display: none; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="copy">${parentHtml}</div>
            <div class="separator"></div>
            <div class="copy">${ecoleHtml}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const previewWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!previewWindow) {
      setError('Le bloqueur de popup a empêché l’aperçu. Autorisez les fenêtres popup.');
      return;
    }

    previewWindow.document.write(buildApercuHtml(printOrientation));
    previewWindow.document.close();
    previewWindow.focus();
    setTimeout(() => previewWindow.print(), 400);
  };

  const handleApercuAvantImpression = () => {
    const previewWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!previewWindow) {
      setError('Le bloqueur de popup a empêché l’aperçu. Autorisez les fenêtres popup.');
      return;
    }

    previewWindow.document.write(buildApercuHtml(printOrientation));
    previewWindow.document.close();
    previewWindow.focus();
  };

  const handleTelechargerPDF = async () => {
    if (!printContainerRef.current) return;

    setError('');
    try {
      await html2pdf().set({
        margin: 10,
        filename: `recu-${paiement.numero_recu || paiement.id || 'paiement'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          ignoreElements: (element) => element.classList?.contains('no-print')
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: printOrientation
        }
      }).from(printContainerRef.current).save();
    } catch (err) {
      console.error('Erreur lors de la création du reçu PDF', err);
      setError('Erreur lors de la création du reçu PDF');
    }
  };

  const formatMontant = (montant) => {
    return parseFloat(montant).toLocaleString('fr-FR') + ' FCFA';
  };

  const renderRecuContent = (exemplaire) => {
    const montantDuRecu = Array.isArray(paiement.repartition) && paiement.repartition.length
      ? paiement.repartition.reduce((total, item) => total + Number(item.montant || 0), 0)
      : Number(paiement.montant || 0);
    const datePaiement = paiement.date_paiement
      ? new Date(`${paiement.date_paiement}T00:00:00`).toLocaleDateString('fr-FR')
      : 'N/D';
    const heurePaiement = paiement.date_heure_paiement
      ? new Date(paiement.date_heure_paiement.replace(' ', 'T')).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
      : 'Non enregistrée';

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        border: '1px solid #333',
        borderRadius: '4px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* En-tête exemplaire */}


        {/* En-tête école */}
        <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333' }}>
            Groupe Scolaire D'eloundem ll
          </h1>
          <p style={{ margin: '0', fontSize: '10px', color: '#666' }}>
            Reçu de paiement
          </p>
        </div>

        {/* Informations du reçu */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
            <div>
              <strong>N° :</strong>
              <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>
                {paiement.numero_recu}
              </span>
            </div>
            <div>
              <strong>Date :</strong>
              <span style={{ marginLeft: '4px' }}>
                {datePaiement}
              </span>
            </div>
            <div>
              <strong>Heure :</strong>
              <span style={{ marginLeft: '4px' }}>
                {heurePaiement}
              </span>
            </div>
          </div>
        </div>

        {/* Informations de l'élève */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '3px',
          marginBottom: '15px'
        }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#333' }}>
            Élève
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '10px' }}>
            <div>
              <strong>Nom :</strong> {paiement.eleve_nom}
            </div>
            <div>
              <strong>Prénom :</strong> {paiement.eleve_prenom}
            </div>
            <div>
              <strong>Matricule :</strong> {paiement.eleve_matricule}
            </div>
            <div>
              <strong>Classe :</strong> {paiement.classe_nom}
            </div>
            <div>
              <strong>Section :</strong> {paiement.section_nom}
            </div>
          </div>
        </div>

        {/* Détails du paiement */}
        <div style={{ marginBottom: '15px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#333' }}>
            Paiement
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {paiement.repartition && paiement.repartition.length > 0 ? (
                // Affichage de la répartition automatique
                paiement.repartition.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 0', fontWeight: '500', fontSize: '10px' }}>
                        {item.type === 'inscription'
                          ? 'Frais d\'inscription'
                          : item.libelle || `Tranche ${item.tranche_numero || ''}`}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatMontant(item.montant)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                // Affichage normal (paiement unique)
                <>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px 0', fontWeight: '500', fontSize: '10px' }}>
                      {paiement.tranche_libelle || 'Frais d\'inscription'}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                      {formatMontant(paiement.montant)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td style={{ padding: '6px 0', color: '#666', fontSize: '10px' }}>
                  Mode
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '10px' }}>
                  {paiement.mode}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total et reste à payer */}
        <div style={{
          textAlign: 'right',
          padding: '10px',
          backgroundColor: '#e9ecef',
          borderRadius: '3px',
          marginBottom: '15px'
        }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>
            Payé (ce reçu)
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            {formatMontant(montantDuRecu)}
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>
            Total payé à ce jour
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            {formatMontant(paiement.total_paye ?? montantDuRecu)}
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>
            Reste (total)
          </div>
          {paiement.reste_a_payer === 0 ? (
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
              ✅ Soldé
            </div>
          ) : (
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: paiement.reste_a_payer > 0 ? '#dc3545' : '#28a745' }}>
              {formatMontant(paiement.reste_a_payer)}
            </div>
          )}
        </div>

        {/* Informations complémentaires */}
        <div style={{ marginBottom: '15px', fontSize: '10px', color: '#666' }}>
          <div style={{ marginBottom: '3px' }}>
            <strong>Encaissé par :</strong> {paiement.encaisse_par_nom || 'N/D'}
          </div>
          {paiement.notes && (
            <div>
              <strong>Notes :</strong> {paiement.notes}
            </div>
          )}
        </div>

        {/* Signature */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ height: '35px', marginBottom: '5px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '9px', color: '#666' }}>Caissier</div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ height: '35px', marginBottom: '5px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '9px', color: '#666' }}>Parent</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '15px',
          paddingTop: '10px',
          borderTop: '1px solid #ddd',
          textAlign: 'center',
          fontSize: '9px',
          color: '#999'
        }}>
          <p style={{ margin: '3px 0 0 0' }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Chargement du reçu...
      </div>
    );
  }

  if (error || !paiement) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          marginBottom: '20px'
        }}>
          {error || 'Paiement non trouvé'}
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .recu-container, .recu-container * {
            visibility: visible;
          }
          .recu-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${printOrientation};
            margin: 10mm;
          }
        }
      `}</style>

      <div className="recu-container" ref={printContainerRef} style={{ padding: '20px' }}>
        {/* Boutons non imprimables */}
        <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '500' }}>Format :</label>
            <select
              value={printOrientation}
              onChange={(e) => setPrintOrientation(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Paysage</option>
            </select>
          </div>
          <button
            onClick={handleApercuAvantImpression}
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Aperçu avant impression
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={handleTelechargerPDF}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Télécharger PDF
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Fermer
          </button>
        </div>

        {/* Reçu - 2 exemplaires côte à côte sur A4 */}
        <div style={{
          display: 'flex',
          gap: '20px',
          width: '100%'
        }}>
          {/* Exemplaire Parent - moitié gauche */}
          <div style={{ flex: 1 }}>
            {renderRecuContent('parent')}
          </div>

          {/* Ligne de séparation verticale centrale */}
          <div style={{
            width: '2px',
            borderLeft: '2px dashed #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              fontSize: '20px',
              color: '#666',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: '5px'
            }}>
              ✂ COUPER ICI ✂
            </span>
          </div>

          {/* Exemplaire École - moitié droite */}
          <div style={{ flex: 1 }}>
            {renderRecuContent('ecole')}
          </div>
        </div>
      </div>
    </>
  );
}

export default Recu;
