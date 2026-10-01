import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';
import Recu from './Recu';

function SaisiePaiement({ inscriptionId, eleveNom, onBack, onPaiementSuccess }) {
  const [tranches, setTranches] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [selectedTranche, setSelectedTranche] = useState('');
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('Especes');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [montantInscription, setMontantInscription] = useState(0);
  const [paiementInscription, setPaiementInscription] = useState(0);
  const [repartitionAuto, setRepartitionAuto] = useState(true); // Activé par défaut
  const [previewRepartition, setPreviewRepartition] = useState(null);
  const [repartitionData, setRepartitionData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRecu, setShowRecu] = useState(false);
  const [lastPaiementId, setLastPaiementId] = useState(null);

  useEffect(() => {
    if (inscriptionId) {
      loadData();
    }
  }, [inscriptionId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [tranchesResult, paiementsResult, solvabiliteResult] = await Promise.all([
        api.inscriptions.getTranches(inscriptionId),
        api.paiements.getByInscription(inscriptionId),
        api.inscriptions.getSolvabilite(inscriptionId)
      ]);

      if (tranchesResult.success) {
        setTranches(tranchesResult.data);
      } else {
        setError(tranchesResult.error);
      }

      if (paiementsResult.success) {
        setPaiements(paiementsResult.data);
        // Calculer le montant déjà payé pour l'inscription (paiements sans tranche_id)
        const paiementInscriptionCalc = paiementsResult.data
          .filter(p => !p.tranche_id && !p.annule)
          .reduce((sum, p) => sum + parseInt(p.montant), 0);
        setPaiementInscription(paiementInscriptionCalc);
      }

      if (solvabiliteResult.success && solvabiliteResult.data) {
        setMontantInscription(solvabiliteResult.data.montant_inscription || 0);
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMontantPayePourTranche = (trancheId) => {
    return paiements
      .filter(p => p.tranche_id === trancheId && !p.annule)
      .reduce((sum, p) => sum + parseFloat(p.montant), 0);
  };

  const getStatutTranche = (tranche) => {
    const montantPaye = getMontantPayePourTranche(tranche.id);
    const montantAttendu = parseFloat(tranche.montant_attendu);
    const reste = montantAttendu - montantPaye;
    
    const aujourdHui = new Date();
    const dateLimite = tranche.date_limite ? new Date(tranche.date_limite) : null;
    const estEnRetard = dateLimite && aujourdHui > dateLimite;
    
    if (montantPaye >= montantAttendu) {
      return { statut: 'Payée', classe: 'payee' };
    } else if (montantPaye > 0) {
      return { statut: 'Partielle', classe: 'partielle' };
    } else if (estEnRetard) {
      return { statut: 'En retard', classe: 'retard' };
    } else {
      return { statut: 'Impayée', classe: 'impayee' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (!montant || parseInt(montant) <= 0) {
        setError('Veuillez saisir un montant positif');
        setSubmitting(false);
        return;
      }

      // Récupérer l'utilisateur connecté
      const userStr = sessionStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const paiementData = {
        inscription_id: inscriptionId,
        montant: parseInt(montant),
        mode: mode,
        date_paiement: datePaiement,
        notes: notes,
        encaisse_par: user ? user.id : null,
        repartition_auto: repartitionAuto // Activer la répartition automatique
      };

      // Si répartition automatique est désactivée, utiliser l'ancienne logique
      if (!repartitionAuto) {
        const isInscriptionPayment = selectedTranche === 'inscription';

        if (!isInscriptionPayment && !selectedTranche) {
          setError('Veuillez sélectionner une tranche');
          setSubmitting(false);
          return;
        }

        paiementData.tranche_id = isInscriptionPayment ? null : parseInt(selectedTranche);
        paiementData.notes = isInscriptionPayment ? `Frais d'inscription - ${notes}` : notes;
      }

      const result = await api.paiements.create(paiementData);

      if (result.success) {
        setSuccess(`Paiement enregistré ! Reçu n°${result.data.numero_recu}`);
        setLastPaiementId(result.data.id);
        setShowRecu(true);

        // Passer les données de répartition au composant de reçu si applicable
        if (result.data.repartition) {
          setRepartitionData(result.data.repartition);
        } else {
          setRepartitionData(null);
        }

        // Réinitialiser le formulaire
        setSelectedTranche('');
        setMontant('');
        setMode('Especes');
        setDatePaiement(new Date().toISOString().split('T')[0]);
        setNotes('');
        setPreviewRepartition(null);

        // Recharger les données
        loadData();

        // Notifier le parent
        if (onPaiementSuccess) {
          onPaiementSuccess();
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de l\'enregistrement du paiement');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrancheChange = (e) => {
    const value = e.target.value;
    setSelectedTranche(value);

    if (value === 'inscription') {
      // Paiement des frais d'inscription
      const resteInscription = montantInscription - paiementInscription;
      if (resteInscription > 0) {
        setMontant(resteInscription.toString());
      } else {
        setMontant('');
      }
    } else if (value) {
      const tranche = tranches.find(t => t.id === parseInt(value));
      if (tranche) {
        const reste = parseFloat(tranche.montant_attendu) - getMontantPayePourTranche(tranche.id);
        if (reste > 0) {
          setMontant(reste.toString());
        }
      }
    } else {
      setMontant('');
    }
  };

  const calculerRepartitionAuto = (montantTotal) => {
    if (!montantTotal || parseInt(montantTotal) <= 0) {
      setPreviewRepartition(null);
      return;
    }

    const montant = parseInt(montantTotal);
    let montantRestant = montant;
    const repartition = [];

    // Étape 1: Inscription
    const resteInscription = montantInscription - paiementInscription;
    if (resteInscription > 0 && montantRestant > 0) {
      const montantPourInscription = Math.min(montantRestant, resteInscription);
      repartition.push({
        type: 'inscription',
        libelle: 'Frais d\'inscription',
        montant: montantPourInscription,
        total: montantInscription,
        paye: paiementInscription + montantPourInscription
      });
      montantRestant -= montantPourInscription;
    }

    // Étape 2: Tranches
    if (montantRestant > 0 && tranches.length > 0) {
      for (const tranche of tranches) {
        if (montantRestant <= 0) break;

        const payeTranche = getMontantPayePourTranche(tranche.id);
        const montantAttendu = parseFloat(tranche.montant_attendu);
        const resteTranche = montantAttendu - payeTranche;

        if (resteTranche > 0) {
          const montantPourTranche = Math.min(montantRestant, resteTranche);
          repartition.push({
            type: 'tranche',
            libelle: tranche.libelle,
            montant: montantPourTranche,
            total: montantAttendu,
            paye: payeTranche + montantPourTranche
          });
          montantRestant -= montantPourTranche;
        }
      }
    }

    setPreviewRepartition(repartition);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Saisie de paiement - {eleveNom}</h1>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retour
        </button>
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

      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '4px',
          color: '#3c3',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {/* Récapitulatif des tranches */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Récapitulatif des tranches</h2>
        
        {tranches.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>⚠️ Aucune tranche configurée pour cette inscription</p>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Veuillez d'abord définir les tarifs pour la classe de l'élève dans le menu "Classes et tarifs".
              Les tranches seront automatiquement créées une fois les tarifs définis.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tranche</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Attendu</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Payé</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Reste</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Date limite</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {tranches.map((tranche) => {
                const montantPaye = getMontantPayePourTranche(tranche.id);
                const montantAttendu = parseFloat(tranche.montant_attendu);
                const reste = montantAttendu - montantPaye;
                const statut = getStatutTranche(tranche);
                
                return (
                  <tr key={tranche.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{tranche.libelle}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {montantAttendu.toLocaleString()} FCFA
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {montantPaye.toLocaleString()} FCFA
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      {reste.toLocaleString()} FCFA
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {tranche.date_limite || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: 
                          statut.classe === 'payee' ? '#d4edda' :
                          statut.classe === 'partielle' ? '#fff3cd' :
                          statut.classe === 'retard' ? '#f8d7da' : '#e2e3e5',
                        color:
                          statut.classe === 'payee' ? '#155724' :
                          statut.classe === 'partielle' ? '#856404' :
                          statut.classe === 'retard' ? '#721c24' : '#383d41'
                      }}>
                        {statut.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulaire de saisie */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Enregistrer un paiement</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={repartitionAuto}
                onChange={(e) => {
                  setRepartitionAuto(e.target.checked);
                  if (e.target.checked) {
                    calculerRepartitionAuto(montant);
                  } else {
                    setPreviewRepartition(null);
                  }
                }}
                style={{ marginRight: '8px' }}
              />
              Répartition automatique (inscription + tranches)
            </label>
            <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
              Si activé, le système répartira automatiquement le montant entre les frais d'inscription et les tranches de pension
            </p>
          </div>

          {!repartitionAuto && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Tranche concernée *
              </label>
              <select
                value={selectedTranche}
                onChange={handleTrancheChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Sélectionner un type de paiement --</option>
                {montantInscription > 0 && (
                  <option value="inscription">
                    📋 Frais d'inscription - Reste: {(montantInscription - paiementInscription).toLocaleString()} FCFA / {montantInscription.toLocaleString()} FCFA
                  </option>
                )}
                {tranches.length > 0 && <option disabled>─────────── Tranches pension ───────────</option>}
                {tranches.map((tranche) => {
                const montantPaye = getMontantPayePourTranche(tranche.id);
                const montantAttendu = parseFloat(tranche.montant_attendu);
                const reste = montantAttendu - montantPaye;
                const estPayee = reste <= 0;
                const statut = getStatutTranche(tranche);
                
                let label = `${tranche.libelle} : `;
                if (estPayee) {
                  label += `✅ Payée (${montantAttendu.toLocaleString()} FCFA)`;
                } else {
                  label += `Reste: ${reste.toLocaleString()} FCFA / Attendu: ${montantAttendu.toLocaleString()} FCFA`;
                  if (montantPaye > 0) {
                    label += ` (Payé: ${montantPaye.toLocaleString()})`;
                  }
                  if (statut.classe === 'retard') {
                    label += ` ⚠️ EN RETARD`;
                  }
                  if (tranche.date_limite) {
                    label += ` - Échéance: ${tranche.date_limite}`;
                  }
                }
                
                return (
                  <option key={tranche.id} value={tranche.id} disabled={estPayee}>
                    {label}
                  </option>
                );
              })}
            </select>
            {tranches.length === 0 && (
              <p style={{ fontSize: '12px', color: '#856404', marginTop: '5px' }}>
                ⚠️ Aucune tranche trouvée. Configurez d'abord les tarifs dans "Classes et tarifs".
              </p>
            )}
          </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Montant versé (FCFA) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={montant}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setMontant(value);
                  if (repartitionAuto) {
                    calculerRepartitionAuto(value);
                  }
                }
              }}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {repartitionAuto && previewRepartition && previewRepartition.length > 0 && (
            <div style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              border: '1px solid #b3d7ff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>Répartition automatique prévue :</h4>
              {previewRepartition.map((item, index) => (
                <div key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <strong>{item.libelle}:</strong> {item.montant.toLocaleString()} FCFA
                  <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                    (Payé: {item.paye.toLocaleString()} / {item.total.toLocaleString()} FCFA)
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Mode de paiement *
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="Especes">Espèces</option>
              <option value="Mobile">Mobile Money</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Date de paiement *
            </label>
            <input
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
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

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 24px',
              backgroundColor: submitting ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            {submitting ? 'Enregistrement en cours...' : 'Enregistrer le paiement'}
          </button>
        </form>
      </div>

      {/* Historique des paiements */}
      {paiements.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '20px' }}>Historique des paiements</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tranche</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Montant</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Mode</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reçu n°</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map((paiement) => (
                <tr key={paiement.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{paiement.date_paiement}</td>
                  <td style={{ padding: '12px' }}>
                    {paiement.tranche_libelle || 'Paiement'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {parseFloat(paiement.montant).toLocaleString()} FCFA
                  </td>
                  <td style={{ padding: '12px' }}>{paiement.mode}</td>
                  <td style={{ padding: '12px' }}>{paiement.numero_recu}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setLastPaiementId(paiement.id);
                        setShowRecu(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Reçu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de reçu */}
      {showRecu && lastPaiementId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            padding: '20px'
          }}>
            <Recu
              paiementId={lastPaiementId}
              onClose={() => setShowRecu(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SaisiePaiement;
