import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function Reinscription() {
  const [annees, setAnnees] = useState([]);
  const [anneeSource, setAnneeSource] = useState('');
  const [anneeDestination, setAnneeDestination] = useState('');
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedEleves, setSelectedEleves] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultats, setResultats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAnnees();
    loadClasses();
    loadSections();
  }, []);

  const loadAnnees = async () => {
    try {
      const result = await api.annees.getAll();
      if (result.success) {
        setAnnees(result.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des années:', err);
    }
  };

  const loadClasses = async () => {
    try {
      const result = await api.classes.getAll();
      if (result.success) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des classes:', err);
    }
  };

  const loadSections = async () => {
    try {
      const result = await api.classes.getSections();
      if (result.success) {
        setSections(result.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des sections:', err);
    }
  };

  const loadEleves = async () => {
    if (!anneeSource) {
      setEleves([]);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Utiliser l'API qui récupère les élèves de l'année précédente pour réinscription
      const result = await api.eleves.getPourReinscription();
      
      if (result.success) {
        setEleves(result.data);
        
        // Initialiser la sélection avec la classe précédente par défaut
        const initialSelection = {};
        for (const eleve of result.data) {
          let montantPension = eleve.montant_pension_annuel || 0;
          
          // Si l'année de destination est sélectionnée, récupérer les tarifs
          if (anneeDestination && eleve.classe_id) {
            try {
              const tarifsResult = await api.classes.getTarifs(eleve.classe_id, parseInt(anneeDestination));
              if (tarifsResult.success && tarifsResult.data) {
                montantPension = tarifsResult.data.montant_pension_annuel || 0;
              }
            } catch (err) {
              console.error('Erreur lors de la récupération des tarifs:', err);
            }
          }
          
          initialSelection[eleve.id] = {
            selected: false,
            classe_id: eleve.classe_id || null,
            section_id: eleve.section_id || null,
            montant_pension: montantPension,
            reduction: 0,
            motif_reduction: '',
            redoublement: 'premiere_inscription',
            source: eleve.source // 'inscrit' uniquement (les élèves importés sont déjà inscrits)
          };
        }
        setSelectedEleves(initialSelection);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des élèves');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEleves();
  }, [anneeSource, anneeDestination]);

  const handleSelectAll = () => {
    const newSelection = { ...selectedEleves };
    Object.keys(newSelection).forEach(eleveId => {
      newSelection[eleveId].selected = true;
    });
    setSelectedEleves(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = { ...selectedEleves };
    Object.keys(newSelection).forEach(eleveId => {
      newSelection[eleveId].selected = false;
    });
    setSelectedEleves(newSelection);
  };

  const handleToggleEleve = (eleveId) => {
    setSelectedEleves({
      ...selectedEleves,
      [eleveId]: {
        ...selectedEleves[eleveId],
        selected: !selectedEleves[eleveId].selected
      }
    });
  };

  const handleChangeClasse = async (eleveId, classeId) => {
    const classe = classes.find(c => c.id === parseInt(classeId));
    const sectionId = classe ? classe.section_id : selectedEleves[eleveId].section_id;
    
    // Récupérer les tarifs pour cette classe et l'année de destination
    let montantPension = selectedEleves[eleveId].montant_pension;
    if (anneeDestination && classeId) {
      try {
        const tarifsResult = await api.classes.getTarifs(parseInt(classeId), parseInt(anneeDestination));
        if (tarifsResult.success && tarifsResult.data) {
          montantPension = tarifsResult.data.montant_pension_annuel || 0;
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des tarifs:', err);
      }
    }
    
    setSelectedEleves({
      ...selectedEleves,
      [eleveId]: {
        ...selectedEleves[eleveId],
        classe_id: parseInt(classeId),
        section_id: sectionId,
        montant_pension: montantPension
      }
    });
  };

  const handleChangeMontant = (eleveId, montant) => {
    // N'accepter que des entiers
    if (montant === '' || /^\d+$/.test(montant)) {
      setSelectedEleves({
        ...selectedEleves,
        [eleveId]: {
          ...selectedEleves[eleveId],
          montant_pension: parseInt(montant) || 0,
          montant_inscription: 0 // L'inscription est payée une seule fois lors de la première inscription
        }
      });
    }
  };

  const handleChangeRedoublement = (eleveId, redoublement) => {
    setSelectedEleves({
      ...selectedEleves,
      [eleveId]: {
        ...selectedEleves[eleveId],
        redoublement: redoublement
      }
    });
  };

  const handleChangeReduction = (eleveId, reduction) => {
    // N'accepter que des entiers
    if (reduction === '' || /^\d+$/.test(reduction)) {
      setSelectedEleves({
        ...selectedEleves,
        [eleveId]: {
          ...selectedEleves[eleveId],
          reduction: parseInt(reduction) || 0
        }
      });
    }
  };

  const handleChangeMotifReduction = (eleveId, motif) => {
    setSelectedEleves({
      ...selectedEleves,
      [eleveId]: {
        ...selectedEleves[eleveId],
        motif_reduction: motif
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    setShowResults(false);

    if (!anneeDestination) {
      setError('Veuillez sélectionner l\'année scolaire de destination');
      setSubmitting(false);
      return;
    }

    // Préparer les données de réinscription
    const reinscriptions = [];
    Object.keys(selectedEleves).forEach(eleveId => {
      if (selectedEleves[eleveId].selected) {
        reinscriptions.push({
          eleve_id: parseInt(eleveId),
          classe_id: selectedEleves[eleveId].classe_id,
          section_id: selectedEleves[eleveId].section_id,
          montant_pension: selectedEleves[eleveId].montant_pension,
          reduction: selectedEleves[eleveId].reduction || 0,
          motif_reduction: selectedEleves[eleveId].motif_reduction || null,
          redoublement: selectedEleves[eleveId].redoublement
        });
      }
    });

    if (reinscriptions.length === 0) {
      setError('Veuillez sélectionner au moins un élève à réinscrire');
      setSubmitting(false);
      return;
    }

    try {
      const result = await api.inscriptions.reinscrireEleves(reinscriptions, parseInt(anneeDestination));
      
      if (result.success) {
        setResultats(result.data);
        setShowResults(true);
        setSuccess(`${result.data.reussis_count} élève(s) réinscrit(s) avec succès`);
        
        // Ne pas réinitialiser la sélection pour permettre de continuer
        // Les élèves déjà réinscrits seront filtrés par le backend
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la réinscription');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getClasseNom = (classeId) => {
    const classe = classes.find(c => c.id === classeId);
    return classe ? classe.nom : '-';
  };

  const getSectionNom = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.nom : '-';
  };

  const selectedCount = Object.values(selectedEleves).filter(e => e.selected).length;

  const filteredEleves = eleves.filter(eleve => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      eleve.nom.toLowerCase().includes(term) ||
      eleve.prenom.toLowerCase().includes(term) ||
      eleve.matricule.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Réinscription des élèves</h1>
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

      {/* Sélection des années */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Sélection des années scolaires</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Année source (élèves à réinscrire) *
            </label>
            <select
              value={anneeSource}
              onChange={(e) => setAnneeSource(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Sélectionner --</option>
              {annees.filter(a => !a.active).map(annee => (
                <option key={annee.id} value={annee.id}>{annee.libelle}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Année destination (nouvelle année) *
            </label>
            <select
              value={anneeDestination}
              onChange={(e) => setAnneeDestination(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Sélectionner --</option>
              {annees.map(annee => (
                <option key={annee.id} value={annee.id}>{annee.libelle} {annee.active ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des élèves */}
      {anneeSource && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Élèves à réinscrire ({eleves.length})</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  width: '250px'
                }}
              />
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Tout sélectionner
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>
          ) : eleves.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Aucun élève trouvé pour cette année scolaire
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCount > 0 && selectedCount === filteredEleves.length}
                        onChange={selectedCount === filteredEleves.length ? handleDeselectAll : handleSelectAll}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Élève</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Classe actuelle</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nouvelle classe</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Statut</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Pension (FCFA)</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Réduction (FCFA)</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEleves.map((eleve) => (
                    <tr key={eleve.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedEleves[eleve.id]?.selected || false}
                          onChange={() => handleToggleEleve(eleve.id)}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <strong>{eleve.nom} {eleve.prenom}</strong>
                          <div style={{ fontSize: '12px', color: '#666' }}>{eleve.matricule}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {eleve.classe_nom ? `${eleve.classe_nom} (${eleve.section_nom})` : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={selectedEleves[eleve.id]?.classe_id || ''}
                          onChange={(e) => handleChangeClasse(eleve.id, e.target.value)}
                          disabled={!selectedEleves[eleve.id]?.selected}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            backgroundColor: selectedEleves[eleve.id]?.selected ? 'white' : '#f5f5f5'
                          }}
                        >
                          {classes.map(classe => (
                            <option key={classe.id} value={classe.id}>
                              {classe.nom} ({getSectionNom(classe.section_id)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={selectedEleves[eleve.id]?.redoublement || 'premiere_inscription'}
                          onChange={(e) => handleChangeRedoublement(eleve.id, e.target.value)}
                          disabled={!selectedEleves[eleve.id]?.selected}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            backgroundColor: selectedEleves[eleve.id]?.selected ? 'white' : '#f5f5f5'
                          }}
                        >
                          <option value="premiere_inscription">Première inscription</option>
                          <option value="redouble">Redouble</option>
                          <option value="classe_superieure">Classe supérieure</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={selectedEleves[eleve.id]?.montant_pension || ''}
                          onChange={(e) => handleChangeMontant(eleve.id, e.target.value)}
                          disabled={!selectedEleves[eleve.id]?.selected}
                          step="1"
                          min="0"
                          style={{
                            width: '120px',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            backgroundColor: selectedEleves[eleve.id]?.selected ? 'white' : '#f5f5f5'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={selectedEleves[eleve.id]?.reduction || ''}
                          onChange={(e) => handleChangeReduction(eleve.id, e.target.value)}
                          disabled={!selectedEleves[eleve.id]?.selected}
                          step="1"
                          min="0"
                          style={{
                            width: '100px',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            backgroundColor: selectedEleves[eleve.id]?.selected ? 'white' : '#f5f5f5'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={selectedEleves[eleve.id]?.motif_reduction || ''}
                          onChange={(e) => handleChangeMotifReduction(eleve.id, e.target.value)}
                          disabled={!selectedEleves[eleve.id]?.selected}
                          placeholder="Motif..."
                          style={{
                            width: '120px',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            backgroundColor: selectedEleves[eleve.id]?.selected ? 'white' : '#f5f5f5'
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bouton de validation */}
      {anneeSource && selectedCount > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{selectedCount}</strong> élève(s) sélectionné(s) pour la réinscription
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !anneeDestination}
              style={{
                padding: '12px 24px',
                backgroundColor: submitting || !anneeDestination ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting || !anneeDestination ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {submitting ? 'Réinscription en cours...' : 'Réinscrire les élèves sélectionnés'}
            </button>
          </div>
        </div>
      )}

      {/* Résultats */}
      {showResults && resultats && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '20px' }}>Résultats de la réinscription</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Total :</strong> {resultats.total} élève(s)</p>
            <p style={{ color: '#28a745' }}><strong>Réussis :</strong> {resultats.reussis_count}</p>
            {resultats.erreurs_count > 0 && (
              <p style={{ color: '#dc3545' }}><strong>Erreurs :</strong> {resultats.erreurs_count}</p>
            )}
          </div>

          {resultats.erreurs.length > 0 && (
            <div style={{
              backgroundColor: '#fee',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #fcc',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>Erreurs :</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {resultats.erreurs.map((erreur, index) => (
                  <li key={index}>
                    {erreur.eleve_nom || `Élève ID: ${erreur.eleve_id}`} : {erreur.erreur}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultats.reussis.length > 0 && (
            <div style={{
              backgroundColor: '#efe',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #cfc'
            }}>
              <h3 style={{ color: '#28a745', marginBottom: '10px' }}>Réussites :</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {resultats.reussis.map((reussi, index) => (
                  <li key={index}>
                    {reussi.eleve_nom} - Inscription ID: {reussi.inscription_id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reinscription;
