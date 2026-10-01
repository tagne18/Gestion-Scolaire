import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';
import SaisiePaiement from '../Paiements/SaisiePaiement';
import Recu from '../Paiements/Recu';
import { exportToExcel } from '../../utils/exportExcel';

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

function FicheEleve({ eleveId, onBack }) {
  const [eleve, setEleve] = useState(null);
  const [inscription, setInscription] = useState(null);
  const [solvabilite, setSolvabilite] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSaisiePaiement, setShowSaisiePaiement] = useState(false);
  const [showRecu, setShowRecu] = useState(false);
  const [lastPaiementId, setLastPaiementId] = useState(null);
  const [showAnnulerModal, setShowAnnulerModal] = useState(false);
  const [paiementToAnnuler, setPaiementToAnnuler] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [annulationError, setAnnulationError] = useState('');
  const [annulationLoading, setAnnulationLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (eleveId) {
      loadEleveData();
    }
    loadClassesAndSections();
  }, [eleveId]);

  const loadEleveData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Récupérer l'élève
      const eleveResult = await api.eleves.getById(eleveId);
      if (eleveResult.success) {
        setEleve(eleveResult.data);
      } else {
        setError(eleveResult.error);
        setLoading(false);
        return;
      }
      
      // Récupérer l'année active
      const anneeResult = await api.annees.getActive();
      if (!anneeResult.success || !anneeResult.data) {
        setError('Aucune année scolaire active');
        setLoading(false);
        return;
      }
      
      // Récupérer l'inscription de l'élève pour l'année active
      const inscriptionResult = await api.inscriptions.getByEleveAndAnnee(
        eleveId,
        anneeResult.data.id
      );
      
      if (inscriptionResult.success && inscriptionResult.data) {
        setInscription(inscriptionResult.data);
        
        // Récupérer la solvabilité
        const solvabiliteResult = await api.inscriptions.getSolvabilite(inscriptionResult.data.id);
        if (solvabiliteResult.success) {
          setSolvabilite(solvabiliteResult.data);
        }

        // Récupérer les paiements
        const paiementsResult = await api.paiements.getByInscription(inscriptionResult.data.id);
        if (paiementsResult.success) {
          setPaiements(paiementsResult.data);
        }
      } else {
        // L'élève n'est pas inscrit pour cette année
        setInscription(null);
        setSolvabilite(null);
        setPaiements([]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassesAndSections = async () => {
    try {
      const [classesResult, sectionsResult] = await Promise.all([
        api.classes.getAll(),
        api.classes.getSections()
      ]);
      if (classesResult.success) setClasses(classesResult.data);
      if (sectionsResult.success) setSections(sectionsResult.data);
    } catch (err) {
      console.error('Erreur lors du chargement des classes et sections:', err);
    }
  };

  const handleAnnulerPaiement = async () => {
    setAnnulationError('');
    setAnnulationLoading(true);

    try {
      const result = await api.paiements.annuler(paiementToAnnuler.id, motifAnnulation);

      if (result.success) {
        setShowAnnulerModal(false);
        setMotifAnnulation('');
        setPaiementToAnnuler(null);
        // Reload payments to show the updated status
        if (inscription) {
          const paiementsResult = await api.paiements.getByInscription(inscription.id);
          if (paiementsResult.success) {
            setPaiements(paiementsResult.data);
          }
        }
      } else {
        setAnnulationError(result.error || 'Erreur lors de l\'annulation');
      }
    } catch (err) {
      setAnnulationError('Erreur lors de l\'annulation');
      console.error(err);
    } finally {
      setAnnulationLoading(false);
    }
  };

  const openAnnulerModal = (paiement) => {
    setPaiementToAnnuler(paiement);
    setMotifAnnulation('');
    setAnnulationError('');
    setShowAnnulerModal(true);
  };

  const openEditModal = () => {
    setEditForm({
      nom: eleve.nom || '',
      prenom: eleve.prenom || '',
      sexe: eleve.sexe || '',
      date_naissance: eleve.date_naissance || '',
      lieu_naissance: eleve.lieu_naissance || '',
      nom_pere: eleve.nom_pere || '',
      telephone_pere: eleve.telephone_pere || '',
      nom_mere: eleve.nom_mere || '',
      telephone_mere: eleve.telephone_mere || '',
      nom_tuteur: eleve.nom_tuteur || '',
      telephone_tuteur: eleve.telephone_tuteur || '',
      lien_tuteur: eleve.lien_tuteur || '',
      adresse: eleve.adresse || '',
      classe_id: inscription?.classe_id || '',
      section_id: inscription?.section_id || ''
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditError('');
    setEditLoading(true);

    try {
      // Séparer les données de l'élève et les données de l'inscription
      const eleveData = {
        nom: editForm.nom,
        prenom: editForm.prenom,
        sexe: editForm.sexe,
        date_naissance: editForm.date_naissance,
        lieu_naissance: editForm.lieu_naissance,
        nom_pere: editForm.nom_pere,
        telephone_pere: editForm.telephone_pere,
        nom_mere: editForm.nom_mere,
        telephone_mere: editForm.telephone_mere,
        nom_tuteur: editForm.nom_tuteur,
        telephone_tuteur: editForm.telephone_tuteur,
        lien_tuteur: editForm.lien_tuteur,
        adresse: editForm.adresse
      };

      // Mettre à jour l'élève
      const eleveResult = await api.eleves.update(eleveId, eleveData);
      if (!eleveResult.success) {
        setEditError(eleveResult.error || 'Erreur lors de la modification de l\'élève');
        setEditLoading(false);
        return;
      }

      // Si l'élève a une inscription et que la classe a changé, mettre à jour l'inscription
      if (inscription && editForm.classe_id && editForm.classe_id !== inscription.classe_id) {
        const classe = classes.find(c => c.id === parseInt(editForm.classe_id));
        const sectionId = classe ? classe.section_id : parseInt(editForm.section_id);
        
        const inscriptionUpdateResult = await api.inscriptions.updateClasse(
          inscription.id,
          parseInt(editForm.classe_id),
          sectionId
        );
        
        if (!inscriptionUpdateResult.success) {
          setEditError(inscriptionUpdateResult.error || 'Erreur lors de la modification de la classe');
          setEditLoading(false);
          return;
        }
      }

      setShowEditModal(false);
      loadEleveData(); // Reload to show updated data
    } catch (err) {
      setEditError('Erreur lors de la modification');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleExportPaiements = async () => {
    const headers = [
      { key: 'date_paiement', label: 'Date' },
      { key: 'tranche_libelle', label: 'Tranche' },
      { key: 'montant', label: 'Montant (FCFA)' },
      { key: 'mode', label: 'Mode' },
      { key: 'numero_recu', label: 'Reçu n°' },
      { key: 'annule', label: 'Annulé' },
      { key: 'motif_annulation', label: 'Motif annulation' }
    ];

    const fileName = `paiements_${eleve.matricule}_${new Date().toISOString().split('T')[0]}.xlsx`;
    await exportToExcel(paiements, headers, fileName);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  if (showSaisiePaiement && inscription) {
    return (
      <SaisiePaiement
        inscriptionId={inscription.id}
        eleveNom={`${eleve.nom} ${eleve.prenom}`}
        onBack={() => setShowSaisiePaiement(false)}
        onPaiementSuccess={() => {
          loadEleveData();
          setShowSaisiePaiement(false);
        }}
      />
    );
  }

  if (error) {
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
          {error}
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retour
        </button>
      </div>
    );
  }

  if (!eleve) {
    return <div style={{ padding: '20px' }}>Élève non trouvé</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Fiche élève</h1>
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

      {/* Informations de l'élève */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#007bff' }}>Informations de l'élève</h2>
          <button
            onClick={openEditModal}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            ✏️ Modifier
          </button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <strong>Matricule :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.matricule}</p>
          </div>
          <div>
            <strong>Nom :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.nom}</p>
          </div>
          <div>
            <strong>Prénom :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.prenom}</p>
          </div>
          <div>
            <strong>Sexe :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.sexe || '-'}</p>
          </div>
          <div>
            <strong>Date de naissance :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.date_naissance || '-'}</p>
          </div>
          <div>
            <strong>Lieu de naissance :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.lieu_naissance || '-'}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Adresse :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.adresse || '-'}</p>
          </div>
        </div>
      </div>

      {/* Parents */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#007bff' }}>Parents</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <strong>Nom du père :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.nom_pere || '-'}</p>
          </div>
          <div>
            <strong>Téléphone du père :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.telephone_pere || '-'}</p>
          </div>
          <div>
            <strong>Nom de la mère :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.nom_mere || '-'}</p>
          </div>
          <div>
            <strong>Téléphone de la mère :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.telephone_mere || '-'}</p>
          </div>
        </div>
      </div>

      {/* Tuteur */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#007bff' }}>Tuteur</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <strong>Nom du tuteur :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.nom_tuteur || '-'}</p>
          </div>
          <div>
            <strong>Téléphone du tuteur :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.telephone_tuteur || '-'}</p>
          </div>
          <div>
            <strong>Lien avec l'élève :</strong>
            <p style={{ margin: '5px 0 0 0' }}>{eleve.lien_tuteur || '-'}</p>
          </div>
        </div>
      </div>

      {/* Inscription actuelle */}
      {inscription ? (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#007bff' }}>Inscription actuelle</h2>
            <button
              onClick={() => setShowSaisiePaiement(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Saisir un paiement
            </button>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <strong>Année scolaire :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{inscription.annee_libelle}</p>
            </div>
            <div>
              <strong>Classe :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{inscription.classe_nom}</p>
            </div>
            <div>
              <strong>Niveau :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{inscription.classe_niveau}</p>
            </div>
            <div>
              <strong>Section :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{inscription.section_nom}</p>
            </div>
            <div>
              <strong>Montant pension :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{parseFloat(inscription.montant_pension).toLocaleString()} FCFA</p>
            </div>
            {inscription.reduction > 0 && (
              <>
                <div>
                  <strong>Réduction :</strong>
                  <p style={{ margin: '5px 0 0 0' }}>{parseFloat(inscription.reduction).toLocaleString()} FCFA</p>
                </div>
                <div>
                  <strong>Motif :</strong>
                  <p style={{ margin: '5px 0 0 0' }}>{inscription.motif_reduction || '-'}</p>
                </div>
              </>
            )}
            <div>
              <strong>Date d'inscription :</strong>
              <p style={{ margin: '5px 0 0 0' }}>{inscription.date_inscription}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#856404'
        }}>
          Cet élève n'est pas inscrit pour l'année scolaire actuelle.
        </div>
      )}

      {/* Solvabilité */}
      {solvabilite && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#007bff' }}>Résumé de solvabilité</h2>
            <span style={{
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: solvabilite.statut === 'Insolvable' ? '#f8d7da' : '#d4edda',
              color: solvabilite.statut === 'Insolvable' ? '#721c24' : '#155724'
            }}>
              {solvabilite.statut}
            </span>
          </div>
          
          {solvabilite.tranche_problematique && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '20px',
              color: '#856404'
            }}>
              <strong>Attention :</strong> La {solvabilite.tranche_problematique.libelle} est en retard depuis le {solvabilite.tranche_problematique.date_limite}. 
              Reste à payer : {solvabilite.tranche_problematique.reste_a_payer.toLocaleString()} FCFA
            </div>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px'
            }}>
              <strong>Total dû :</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
                {solvabilite.total_du.toLocaleString()} FCFA
              </p>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#d4edda',
              borderRadius: '4px'
            }}>
              <strong>Total payé :</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
                {solvabilite.total_paye.toLocaleString()} FCFA
              </p>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: solvabilite.reste_a_payer > 0 ? '#fff3cd' : '#d4edda',
              borderRadius: '4px'
            }}>
              <strong>Reste à payer :</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
                {solvabilite.reste_a_payer.toLocaleString()} FCFA
              </p>
            </div>
          </div>

          <h3 style={{ marginBottom: '15px' }}>Détail des tranches</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tranche</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Montant attendu</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Date limite</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {solvabilite.tranches.map((tranche) => {
                const aujourdHui = new Date();
                const dateLimite = tranche.date_limite ? new Date(tranche.date_limite) : null;
                const estEnRetard = dateLimite && aujourdHui > dateLimite;
                
                return (
                  <tr key={tranche.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{tranche.libelle}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {tranche.montant_attendu.toLocaleString()} FCFA
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {tranche.date_limite || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {estEnRetard ? (
                        <span style={{
                          backgroundColor: '#f8d7da',
                          color: '#721c24',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          En retard
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          À jour
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
            <em>Note : Le détail des paiements par tranche sera disponible après l'implémentation de la saisie des paiements.</em>
          </p>
        </div>
      )}

      {/* Historique des paiements */}
      {paiements.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#007bff' }}>Historique des paiements</h2>
            {paiements.length > 0 && (
              <button
                onClick={handleExportPaiements}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                📊 Exporter
              </button>
            )}
          </div>
          
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
                <tr 
                  key={paiement.id} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: paiement.annule ? '#f8f9fa' : 'white',
                    textDecoration: paiement.annule ? 'line-through' : 'none',
                    opacity: paiement.annule ? 0.6 : 1
                  }}
                >
                  <td style={{ padding: '12px' }}>{paiement.date_paiement}</td>
                  <td style={{ padding: '12px' }}>
                    {paiement.tranche_libelle || 'Frais d\'inscription'}
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
                        fontSize: '12px',
                        marginRight: '5px'
                      }}
                    >
                      Reçu
                    </button>
                    {!paiement.annule && (
                      <button
                        onClick={() => openAnnulerModal(paiement)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
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

      {/* Modal d'annulation de paiement */}
      {showAnnulerModal && paiementToAnnuler && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Annuler le paiement</h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Montant :</strong> {parseFloat(paiementToAnnuler.montant).toLocaleString()} FCFA</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Date :</strong> {paiementToAnnuler.date_paiement}</p>
              <p style={{ margin: '0' }}><strong>Reçu n° :</strong> {paiementToAnnuler.numero_recu}</p>
            </div>

            {annulationError && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                {annulationError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Motif d'annulation <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                placeholder="Expliquez pourquoi ce paiement est annulé..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAnnulerModal(false)}
                disabled={annulationLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: annulationLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAnnulerPaiement}
                disabled={annulationLoading || !motifAnnulation.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (annulationLoading || !motifAnnulation.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: (!motifAnnulation.trim()) ? 0.5 : 1
                }}
              >
                {annulationLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification de l'élève */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            width: '700px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Modifier l'élève</h2>

            {editError && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                {editError}
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nom</label>
                <input
                  type="text"
                  value={editForm.nom || ''}
                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Prénom</label>
                <input
                  type="text"
                  value={editForm.prenom || ''}
                  onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Sexe</label>
                <select
                  value={editForm.sexe || ''}
                  onChange={(e) => setEditForm({ ...editForm, sexe: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">-</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Date de naissance</label>
                <input
                  type="date"
                  value={editForm.date_naissance || ''}
                  onChange={(e) => setEditForm({ ...editForm, date_naissance: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Lieu de naissance</label>
                <input
                  type="text"
                  value={editForm.lieu_naissance || ''}
                  onChange={(e) => setEditForm({ ...editForm, lieu_naissance: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Adresse</label>
                <input
                  type="text"
                  value={editForm.adresse || ''}
                  onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '5px' }}>
                <strong style={{ color: '#007bff' }}>Inscription actuelle</strong>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Classe {inscription ? '' : '(Modification non disponible - élève non inscrit)'}
                </label>
                <select
                  value={editForm.classe_id || ''}
                  onChange={(e) => {
                    const classe = classes.find(c => c.id === parseInt(e.target.value));
                    setEditForm({
                      ...editForm,
                      classe_id: e.target.value,
                      section_id: classe ? classe.section_id : editForm.section_id
                    });
                  }}
                  disabled={!inscription}
                  style={{
                    ...inputStyle,
                    backgroundColor: inscription ? 'white' : '#f5f5f5',
                    cursor: inscription ? 'pointer' : 'not-allowed'
                  }}
                >
                  <option value="">-- Sélectionner --</option>
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nom} ({classe.niveau} - {classe.section_nom})
                    </option>
                  ))}
                </select>
                {!inscription && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Cet élève n'est pas inscrit pour l'année scolaire actuelle.
                  </p>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '5px' }}>
                <strong style={{ color: '#007bff' }}>Parents</strong>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nom du père</label>
                <input
                  type="text"
                  value={editForm.nom_pere || ''}
                  onChange={(e) => setEditForm({ ...editForm, nom_pere: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Téléphone du père</label>
                <input
                  type="text"
                  value={editForm.telephone_pere || ''}
                  onChange={(e) => setEditForm({ ...editForm, telephone_pere: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nom de la mère</label>
                <input
                  type="text"
                  value={editForm.nom_mere || ''}
                  onChange={(e) => setEditForm({ ...editForm, nom_mere: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Téléphone de la mère</label>
                <input
                  type="text"
                  value={editForm.telephone_mere || ''}
                  onChange={(e) => setEditForm({ ...editForm, telephone_mere: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '5px' }}>
                <strong style={{ color: '#007bff' }}>Tuteur</strong>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nom du tuteur</label>
                <input
                  type="text"
                  value={editForm.nom_tuteur || ''}
                  onChange={(e) => setEditForm({ ...editForm, nom_tuteur: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Téléphone du tuteur</label>
                <input
                  type="text"
                  value={editForm.telephone_tuteur || ''}
                  onChange={(e) => setEditForm({ ...editForm, telephone_tuteur: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Lien avec l'élève</label>
                <input
                  type="text"
                  value={editForm.lien_tuteur || ''}
                  onChange={(e) => setEditForm({ ...editForm, lien_tuteur: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FicheEleve;