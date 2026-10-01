import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function GestionCalendrier() {
  const [evenements, setEvenements] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvenement, setEditingEvenement] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type: 'autre',
    date_debut: '',
    date_fin: '',
    annee_scolaire_id: '',
    classe_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadEvenements();
    loadAnnees();
    loadClasses();
  }, []);

  const loadEvenements = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await api.evenements.getAll();
      if (result.success) {
        setEvenements(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des événements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      let result;
      if (editingEvenement) {
        result = await api.evenements.update(editingEvenement.id, formData);
      } else {
        result = await api.evenements.create(formData);
      }
      
      if (result.success) {
        setSuccess(editingEvenement ? 'Événement modifié avec succès' : 'Événement créé avec succès');
        setFormData({
          titre: '',
          description: '',
          type: 'autre',
          date_debut: '',
          date_fin: '',
          annee_scolaire_id: '',
          classe_id: ''
        });
        setShowForm(false);
        setEditingEvenement(null);
        loadEvenements();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de l\'enregistrement de l\'événement');
      console.error(err);
    }
  };

  const handleEdit = (evenement) => {
    setEditingEvenement(evenement);
    setFormData({
      titre: evenement.titre,
      description: evenement.description || '',
      type: evenement.type,
      date_debut: evenement.date_debut,
      date_fin: evenement.date_fin || '',
      annee_scolaire_id: evenement.annee_scolaire_id || '',
      classe_id: evenement.classe_id || ''
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }

    setError('');
    setSuccess('');
    
    try {
      const result = await api.evenements.delete(id);
      
      if (result.success) {
        setSuccess('Événement supprimé avec succès');
        loadEvenements();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la suppression de l\'événement');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEvenement(null);
    setFormData({
      titre: '',
      description: '',
      type: 'autre',
      date_debut: '',
      date_fin: '',
      annee_scolaire_id: '',
      classe_id: ''
    });
    setError('');
    setSuccess('');
  };

  const getTypeLabel = (type) => {
    const labels = {
      vacances: 'Vacances',
      fete: 'Fête',
      examen: 'Examen',
      reunion: 'Réunion',
      autre: 'Autre'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      vacances: '#28a745',
      fete: '#dc3545',
      examen: '#ffc107',
      reunion: '#17a2b8',
      autre: '#6c757d'
    };
    return colors[type] || '#6c757d';
  };

  const filteredEvenements = filterType 
    ? evenements.filter(e => e.type === filterType)
    : evenements;

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Calendrier scolaire</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {showForm ? 'Annuler' : 'Nouvel événement'}
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

      {showForm && (
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '20px' }}>
            {editingEvenement ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Titre *
              </label>
              <input
                type="text"
                name="titre"
                value={formData.titre}
                onChange={handleInputChange}
                placeholder="Ex: Vacances de Noël"
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
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="vacances">Vacances</option>
                <option value="fete">Fête</option>
                <option value="examen">Examen</option>
                <option value="reunion">Réunion</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500'
                }}>
                  Date de début *
                </label>
                <input
                  type="date"
                  name="date_debut"
                  value={formData.date_debut}
                  onChange={handleInputChange}
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500'
                }}>
                  Date de fin
                </label>
                <input
                  type="date"
                  name="date_fin"
                  value={formData.date_fin}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Détails de l'événement..."
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500'
                }}>
                  Année scolaire
                </label>
                <select
                  name="annee_scolaire_id"
                  value={formData.annee_scolaire_id}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Toutes les années</option>
                  {annees.map(annee => (
                    <option key={annee.id} value={annee.id}>{annee.libelle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500'
                }}>
                  Classe (optionnel)
                </label>
                <select
                  name="classe_id"
                  value={formData.classe_id}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Toutes les classes</option>
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>{classe.nom}</option>
                  ))}
                </select>
              </div>
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
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {editingEvenement ? 'Modifier' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtre par type */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ fontWeight: '500' }}>Filtrer par type :</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="">Tous les types</option>
          <option value="vacances">Vacances</option>
          <option value="fete">Fêtes</option>
          <option value="examen">Examens</option>
          <option value="reunion">Réunions</option>
          <option value="autre">Autres</option>
        </select>
      </div>

      {/* Liste des événements */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Événements ({filteredEvenements.length})</h2>
        
        {filteredEvenements.length === 0 ? (
          <p style={{ color: '#666' }}>Aucun événement enregistré.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredEvenements.map((evenement) => (
              <div
                key={evenement.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  borderLeft: `4px solid ${getTypeColor(evenement.type)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>{evenement.titre}</h3>
                      <span style={{
                        backgroundColor: getTypeColor(evenement.type),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {getTypeLabel(evenement.type)}
                      </span>
                    </div>
                    
                    {evenement.description && (
                      <p style={{ color: '#666', marginBottom: '8px', margin: '0 0 8px 0' }}>
                        {evenement.description}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      <div>
                        <strong>Dates :</strong> {evenement.date_debut}
                        {evenement.date_fin && ` au ${evenement.date_fin}`}
                      </div>
                      {evenement.annee_scolaire_libelle && (
                        <div><strong>Année :</strong> {evenement.annee_scolaire_libelle}</div>
                      )}
                      {evenement.classe_nom && (
                        <div><strong>Classe :</strong> {evenement.classe_nom}</div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(evenement)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(evenement.id)}
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
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GestionCalendrier;
