import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function GestionClasses() {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' ou 'tarifs'
  const [showClasseForm, setShowClasseForm] = useState(false);
  const [showTarifsForm, setShowTarifsForm] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [editingClasseId, setEditingClasseId] = useState(null);
  
  const [classeForm, setClasseForm] = useState({
    nom: '',
    niveau: 'Maternelle',
    section_id: ''
  });
  
  const [tarifsForm, setTarifsForm] = useState({
    montant_inscription: '',
    montant_pension_annuel: '',
    tranche_1: '',
    tranche_2: '',
    date_limite_tranche_1: '',
    date_limite_tranche_2: ''
  });
  
  const [selectedClasses, setSelectedClasses] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [sectionsResult, classesResult, anneeResult] = await Promise.all([
        api.classes.getSections(),
        api.classes.getAll(),
        api.annees.getActive()
      ]);
      
      if (sectionsResult.success) setSections(sectionsResult.data);
      if (classesResult.success) setClasses(classesResult.data);
      if (anneeResult.success) setAnneeActive(anneeResult.data);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClasseSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const result = editingClasseId
        ? await api.classes.update(
            editingClasseId,
            classeForm.nom,
            classeForm.niveau,
            parseInt(classeForm.section_id)
          )
        : await api.classes.create(
            classeForm.nom,
            classeForm.niveau,
            parseInt(classeForm.section_id)
          );

      if (result.success) {
        setSuccess(editingClasseId ? 'Classe modifiée avec succès' : 'Classe créée avec succès');
        resetClasseForm();
        loadData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(editingClasseId
        ? 'Erreur lors de la modification de la classe'
        : 'Erreur lors de la création de la classe');
      console.error(err);
    }
  };

  const resetClasseForm = () => {
    setClasseForm({ nom: '', niveau: 'Maternelle', section_id: '' });
    setShowClasseForm(false);
    setEditingClasseId(null);
  };

  const openEditClasse = (classe) => {
    setEditingClasseId(classe.id);
    setClasseForm({
      nom: classe.nom || '',
      niveau: classe.niveau || 'Maternelle',
      section_id: String(classe.section_id || '')
    });
    setShowClasseForm(true);
    setError('');
    setSuccess('');
  };

  const openNewClasseForm = () => {
    if (showClasseForm) {
      resetClasseForm();
      return;
    }
    setEditingClasseId(null);
    setClasseForm({ nom: '', niveau: 'Maternelle', section_id: '' });
    setShowClasseForm(true);
  };

  const getClassesTriees = (liste) => {
    const ordreNiveau = { Maternelle: 1, Primaire: 2 };
    return [...liste].sort((a, b) => {
      const sectionCmp = (a.section_nom || '').localeCompare(b.section_nom || '', 'fr', { sensitivity: 'base' });
      if (sectionCmp !== 0) return sectionCmp;
      const niveauCmp = (ordreNiveau[a.niveau] || 99) - (ordreNiveau[b.niveau] || 99);
      if (niveauCmp !== 0) return niveauCmp;
      return (a.nom || '').localeCompare(b.nom || '', 'fr', { numeric: true, sensitivity: 'base' });
    });
  };

  const getGroupesClasses = (liste) => {
    const groupes = [];
    getClassesTriees(liste).forEach((classe) => {
      const section = classe.section_nom || 'Sans section';
      const niveau = classe.niveau || 'Autre';
      let groupeSection = groupes.find((g) => g.section === section);
      if (!groupeSection) {
        groupeSection = { section, niveaux: [] };
        groupes.push(groupeSection);
      }
      let groupeNiveau = groupeSection.niveaux.find((n) => n.niveau === niveau);
      if (!groupeNiveau) {
        groupeNiveau = { niveau, classes: [] };
        groupeSection.niveaux.push(groupeNiveau);
      }
      groupeNiveau.classes.push(classe);
    });
    return groupes;
  };

  const handleTarifsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!anneeActive) {
      setError('Aucune année scolaire active. Veuillez d\'abord activer une année.');
      return;
    }
    
    if (selectedClasses.length === 0) {
      setError('Veuillez sélectionner au moins une classe');
      return;
    }
    
    try {
      const tarifs = {
        montant_inscription: parseInt(tarifsForm.montant_inscription) || 0,
        montant_pension_annuel: parseInt(tarifsForm.montant_pension_annuel) || 0,
        tranche_1: parseInt(tarifsForm.tranche_1) || 0,
        tranche_2: parseInt(tarifsForm.tranche_2) || 0,
        tranche_3: 0, // Toujours 0 pour 2 tranches seulement
        date_limite_tranche_1: tarifsForm.date_limite_tranche_1 || null,
        date_limite_tranche_2: tarifsForm.date_limite_tranche_2 || null,
        date_limite_tranche_3: null // Jamais utilisé
      };
      
      // Appliquer les tarifs à toutes les classes sélectionnées
      const results = await Promise.all(
        selectedClasses.map(classeId => 
          api.classes.setTarifs(classeId, anneeActive.id, tarifs)
        )
      );
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === selectedClasses.length) {
        setSuccess(`Tarifs définis avec succès pour ${successCount} classe(s)`);
        setTarifsForm({
          montant_inscription: '',
          montant_pension_annuel: '',
          tranche_1: '',
          tranche_2: '',
          date_limite_tranche_1: '',
          date_limite_tranche_2: ''
        });
        setShowTarifsForm(false);
        setSelectedClasses([]);
        loadData();
      } else {
        setError(`Tarifs définis pour ${successCount}/${selectedClasses.length} classe(s). Certains échecs.`);
      }
    } catch (err) {
      setError('Erreur lors de la définition des tarifs');
      console.error(err);
    }
  };

  const openTarifsForm = async (classe = null) => {
    if (classe) {
      setSelectedClasses([classe.id]);
    } else {
      setSelectedClasses([]);
    }
    
    if (!anneeActive) {
      setError('Aucune année scolaire active. Veuillez d\'abord activer une année.');
      return;
    }
    
    try {
      let result;
      if (classe) {
        result = await api.classes.getTarifs(classe.id, anneeActive.id);
      }
      
      if (result && result.success && result.data) {
        setTarifsForm({
          montant_inscription: result.data.montant_inscription || '',
          montant_pension_annuel: result.data.montant_pension_annuel || '',
          tranche_1: result.data.tranche_1 || '',
          tranche_2: result.data.tranche_2 || '',
          date_limite_tranche_1: result.data.date_limite_tranche_1 || '',
          date_limite_tranche_2: result.data.date_limite_tranche_2 || ''
        });
      } else {
        setTarifsForm({
          montant_inscription: '',
          montant_pension_annuel: '',
          tranche_1: '',
          tranche_2: '',
          date_limite_tranche_1: '',
          date_limite_tranche_2: ''
        });
      }
      
      setShowTarifsForm(true);
    } catch (err) {
      setError('Erreur lors du chargement des tarifs');
      console.error(err);
    }
  };
  
  const toggleClassSelection = (classeId) => {
    setSelectedClasses(prev => 
      prev.includes(classeId) 
        ? prev.filter(id => id !== classeId)
        : [...prev, classeId]
    );
  };
  
  const selectAllClasses = () => {
    setSelectedClasses(classes.map(c => c.id));
  };
  
  const deselectAllClasses = () => {
    setSelectedClasses([]);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '30px' }}>
      <h1 style={{ marginBottom: '40px' }}>Gestion des classes et tarifs</h1>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '0px solid #fcc',
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
          border: '0px solid #cfc',
          borderRadius: '4px',
          color: '#3c3',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {/* Onglets */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('classes')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'classes' ? '#007bff' : 'transparent',
            color: activeTab === 'classes' ? 'white' : '#007bff',
            border: activeTab === 'classes' ? 'none' : '0px solid #007bff',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Classes
        </button>
        <button
          onClick={() => setActiveTab('tarifs')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'tarifs' ? '#007bff' : 'transparent',
            color: activeTab === 'tarifs' ? 'white' : '#007bff',
            border: activeTab === 'tarifs' ? 'none' : '1px solid #007bff',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer'
          }}
        >
          Tarifs
        </button>
      </div>

      {/* Onglet Classes */}
      {activeTab === 'classes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Liste des classes</h2>
            <button
              onClick={openNewClasseForm}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showClasseForm ? 'Annuler' : 'Nouvelle classe'}
            </button>
          </div>

          {showClasseForm && (
            <div style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '0px solid #ddd'
            }}>
              <h3 style={{ marginBottom: '15px' }}>
                {editingClasseId ? 'Modifier la classe' : 'Créer une nouvelle classe'}
              </h3>
              <form onSubmit={handleClasseSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Nom de la classe *
                  </label>
                  <input
                    type="text"
                    value={classeForm.nom}
                    onChange={(e) => setClasseForm({ ...classeForm, nom: e.target.value })}
                    placeholder="Ex: CP, CE1, Nursery..."
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

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Niveau *
                  </label>
                  <select
                    value={classeForm.niveau}
                    onChange={(e) => setClasseForm({ ...classeForm, niveau: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Maternelle">Maternelle</option>
                    <option value="Primaire">Primaire</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Section *
                  </label>
                  <select
                    value={classeForm.section_id}
                    onChange={(e) => setClasseForm({ ...classeForm, section_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Sélectionner une section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {editingClasseId ? 'Enregistrer les modifications' : 'Créer la classe'}
                  </button>
                  <button
                    type="button"
                    onClick={resetClasseForm}
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
                </div>
              </form>
            </div>
          )}

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            {classes.length === 0 ? (
              <p style={{ color: '#666' }}>Aucune classe créée.</p>
            ) : (
              getGroupesClasses(classes).map((groupeSection) => (
                <div key={groupeSection.section} style={{ marginBottom: '28px' }}>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    padding: '8px 12px',
                    backgroundColor: '#e9f2ff',
                    borderRadius: '4px',
                    color: '#0d47a1'
                  }}>
                    Section {groupeSection.section}
                  </h3>
                  {groupeSection.niveaux.map((groupeNiveau) => (
                    <div key={`${groupeSection.section}-${groupeNiveau.niveau}`} style={{ marginBottom: '16px' }}>
                      <h4 style={{
                        margin: '0 0 8px 12px',
                        color: '#495057',
                        fontWeight: '600'
                      }}>
                        {groupeNiveau.niveau}
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Nom</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Niveau</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Section</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupeNiveau.classes.map((classe) => (
                            <tr key={classe.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>{classe.nom}</td>
                              <td style={{ padding: '12px' }}>{classe.niveau}</td>
                              <td style={{ padding: '12px' }}>{classe.section_nom}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => openEditClasse(classe)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#ffc107',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  Modifier
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Onglet Tarifs */}
      {activeTab === 'tarifs' && (
        <div>
          {!anneeActive && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '20px',
              color: '#856404'
            }}>
              <strong>Attention :</strong> Aucune année scolaire n'est active. 
              Veuillez d'abord activer une année scolaire dans la gestion des années.
            </div>
          )}

          <h2 style={{ marginBottom: '20px' }}>Définir les tarifs par classe (2 tranches)</h2>

          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={selectAllClasses}
              disabled={!anneeActive}
              style={{
                padding: '8px 16px',
                backgroundColor: anneeActive ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: anneeActive ? 'pointer' : 'not-allowed',
                fontSize: '13px'
              }}
            >
              Tout sélectionner
            </button>
            <button
              onClick={deselectAllClasses}
              disabled={!anneeActive}
              style={{
                padding: '8px 16px',
                backgroundColor: anneeActive ? '#6c757d' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: anneeActive ? 'pointer' : 'not-allowed',
                fontSize: '13px'
              }}
            >
              Tout désélectionner
            </button>
            {selectedClasses.length > 0 && (
              <button
                onClick={() => openTarifsForm()}
                disabled={!anneeActive}
                style={{
                  padding: '8px 16px',
                  backgroundColor: anneeActive ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: anneeActive ? 'pointer' : 'not-allowed',
                  fontSize: '13px'
                }}
              >
                Définir tarifs pour {selectedClasses.length} classe(s)
              </button>
            )}
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            {classes.length === 0 ? (
              <p style={{ color: '#666' }}>Aucune classe disponible. Créez d'abord des classes.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedClasses.length === classes.length && classes.length > 0}
                        onChange={selectedClasses.length === classes.length ? deselectAllClasses : selectAllClasses}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Classe</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Niveau</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Section</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getClassesTriees(classes).map((classe) => (
                    <tr key={classe.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(classe.id)}
                          onChange={() => toggleClassSelection(classe.id)}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{classe.nom}</td>
                      <td style={{ padding: '12px' }}>{classe.niveau}</td>
                      <td style={{ padding: '12px' }}>{classe.section_nom}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => openTarifsForm(classe)}
                          disabled={!anneeActive}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: anneeActive ? '#007bff' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: anneeActive ? 'pointer' : 'not-allowed',
                            fontSize: '12px'
                          }}
                        >
                          Définir tarifs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showTarifsForm && (
            <div style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginTop: '20px',
              border: '0px solid #ddd'
            }}>
              <h3 style={{ marginBottom: '15px' }}>
                {selectedClasses.length === 1 
                  ? `Tarifs pour ${classes.find(c => c.id === selectedClasses[0])?.nom} (${classes.find(c => c.id === selectedClasses[0])?.niveau} - ${classes.find(c => c.id === selectedClasses[0])?.section_nom})`
                  : `Tarifs pour ${selectedClasses.length} classe(s)`
                }
              </h3>
              <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                Année scolaire : {anneeActive?.libelle} • 2 tranches uniquement
              </p>
              <form onSubmit={handleTarifsSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Montant de l'inscription (FCFA)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tarifsForm.montant_inscription}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setTarifsForm({ ...tarifsForm, montant_inscription: value });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Pension annuelle (FCFA) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tarifsForm.montant_pension_annuel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setTarifsForm({ ...tarifsForm, montant_pension_annuel: value });
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

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Tranche 1 (FCFA)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tarifsForm.tranche_1}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setTarifsForm({ ...tarifsForm, tranche_1: value });
                      }
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Tranche 2 (FCFA)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tarifsForm.tranche_2}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setTarifsForm({ ...tarifsForm, tranche_2: value });
                      }
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Date limite Tranche 1
                  </label>
                  <input
                    type="date"
                    value={tarifsForm.date_limite_tranche_1}
                    onChange={(e) => setTarifsForm({ ...tarifsForm, date_limite_tranche_1: e.target.value })}
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
                    Date limite Tranche 2
                  </label>
                  <input
                    type="date"
                    value={tarifsForm.date_limite_tranche_2}
                    onChange={(e) => setTarifsForm({ ...tarifsForm, date_limite_tranche_2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Enregistrer les tarifs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTarifsForm(false);
                      setSelectedClasse(null);
                      setTarifsForm({
                        montant_inscription: '',
                        montant_pension_annuel: '',
                        tranche_1: '',
                        tranche_2: '',
                        date_limite_tranche_1: '',
                        date_limite_tranche_2: ''
                      });
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
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GestionClasses;
