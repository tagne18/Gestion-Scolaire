import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function GestionAnnees() {
  const [annees, setAnnees] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAnnee, setEditingAnnee] = useState(null);
  const [formData, setFormData] = useState({
    libelle: '',
    date_debut: '',
    date_fin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAnnee, setDeletingAnnee] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [hasInscriptions, setHasInscriptions] = useState(false);
  const [inscriptionCount, setInscriptionCount] = useState(0);

  // Charger les années au montage
  useEffect(() => {
    loadAnnees();
  }, []);

  const loadAnnees = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [allResult, activeResult] = await Promise.all([
        api.annees.getAll(),
        api.annees.getActive()
      ]);
      
      if (allResult.success) {
        setAnnees(allResult.data);
      } else {
        setError(allResult.error);
      }
      
      if (activeResult.success) {
        setAnneeActive(activeResult.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des années scolaires');
      console.error(err);
    } finally {
      setLoading(false);
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
      const result = await api.annees.create(
        formData.libelle,
        formData.date_debut,
        formData.date_fin
      );
      
      if (result.success) {
        setSuccess('Année scolaire créée avec succès');
        setFormData({ libelle: '', date_debut: '', date_fin: '' });
        setShowForm(false);
        loadAnnees();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la création de l\'année scolaire');
      console.error(err);
    }
  };

  const handleSetActive = async (anneeId) => {
    setError('');
    setSuccess('');
    
    try {
      const result = await api.annees.setActive(anneeId);
      
      if (result.success) {
        setSuccess('Année scolaire activée');
        loadAnnees();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de l\'activation de l\'année scolaire');
      console.error(err);
    }
  };

  const handleEdit = (annee) => {
    setEditingAnnee(annee);
    setFormData({
      libelle: annee.libelle,
      date_debut: annee.date_debut || '',
      date_fin: annee.date_fin || ''
    });
    setShowEditForm(true);
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const result = await api.annees.update(
        editingAnnee.id,
        formData.libelle,
        formData.date_debut,
        formData.date_fin
      );
      
      if (result.success) {
        setSuccess('Année scolaire modifiée avec succès');
        setShowEditForm(false);
        setEditingAnnee(null);
        setFormData({ libelle: '', date_debut: '', date_fin: '' });
        loadAnnees();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la modification de l\'année scolaire');
      console.error(err);
    }
  };

  const handleDeleteClick = async (annee) => {
    setError('');
    setSuccess('');
    
    try {
      const result = await api.annees.countInscriptions(annee.id);
      
      if (result.success) {
        const count = result.data;
        if (count > 0) {
          setError(`Impossible de supprimer cette année : ${count} élève(s) y sont inscrits. Seule une année scolaire sans aucune inscription peut être supprimée.`);
        } else {
          setDeletingAnnee(annee);
          setDeletePassword('');
          setDeleteError('');
          setShowDeleteModal(true);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la vérification des inscriptions');
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    setError('');
    setDeleteError('');
    
    // Récupérer l'utilisateur connecté depuis le localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setDeleteError('Utilisateur non connecté');
      return;
    }
    
    const user = JSON.parse(userStr);
    
    try {
      // Vérifier le mot de passe
      const verifyResult = await api.auth.verifyPassword(user.id, deletePassword);
      
      if (!verifyResult.success) {
        setDeleteError('Mot de passe incorrect');
        return;
      }
      
      // Supprimer l'année
      const deleteResult = await api.annees.delete(deletingAnnee.id);
      
      if (deleteResult.success) {
        setSuccess('Année scolaire supprimée avec succès');
        setShowDeleteModal(false);
        setDeletingAnnee(null);
        setDeletePassword('');
        loadAnnees();
      } else {
        setDeleteError(deleteResult.error);
      }
    } catch (err) {
      setDeleteError('Erreur lors de la suppression de l\'année scolaire');
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingAnnee(null);
    setFormData({ libelle: '', date_debut: '', date_fin: '' });
    setError('');
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingAnnee(null);
    setDeletePassword('');
    setDeleteError('');
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Gestion des années scolaires</h1>
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
          {showForm ? 'Annuler' : 'Nouvelle année scolaire'}
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
          <h2 style={{ marginBottom: '20px' }}>Créer une nouvelle année scolaire</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Libellé *
              </label>
              <input
                type="text"
                name="libelle"
                value={formData.libelle}
                onChange={handleInputChange}
                placeholder="Ex: 2025/2026"
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Date de fin *
              </label>
              <input
                type="date"
                name="date_fin"
                value={formData.date_fin}
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
              Créer l'année scolaire
            </button>
          </form>
        </div>
      )}

      {showEditForm && editingAnnee && (
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #ffc107'
        }}>
          <h2 style={{ marginBottom: '20px' }}>Modifier l'année scolaire : {editingAnnee.libelle}</h2>
          <form onSubmit={handleUpdate}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Libellé *
              </label>
              <input
                type="text"
                name="libelle"
                value={formData.libelle}
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

            <div style={{ marginBottom: '15px' }}>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Date de fin *
              </label>
              <input
                type="date"
                name="date_fin"
                value={formData.date_fin}
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Enregistrer les modifications
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
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

      {showDeleteModal && deletingAnnee && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            border: '2px solid #dc3545'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#dc3545' }}>Confirmation de suppression</h2>
            <p style={{ marginBottom: '20px' }}>
              Vous êtes sur le point de supprimer définitivement l'année scolaire <strong>{deletingAnnee.libelle}</strong>.
            </p>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Cette action est irréversible. Veuillez saisir votre mot de passe Admin pour confirmer.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                Mot de passe *
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Saisir votre mot de passe"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {deleteError && (
              <div style={{
                padding: '10px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
                color: '#c33',
                marginBottom: '20px'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelDelete}
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
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Liste des années scolaires</h2>
        
        {annees.length === 0 ? (
          <p style={{ color: '#666' }}>Aucune année scolaire créée.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Libellé</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date de début</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date de fin</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Statut</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {annees.map((annee) => (
                <tr key={annee.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{annee.libelle}</td>
                  <td style={{ padding: '12px' }}>{annee.date_debut || '-'}</td>
                  <td style={{ padding: '12px' }}>{annee.date_fin || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {annee.active ? (
                      <span style={{
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Active
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(annee)}
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
                      {!annee.active && (
                        <button
                          onClick={() => handleSetActive(annee.id)}
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
                          Activer
                        </button>
                      )}
                      {!annee.active && (
                        <button
                          onClick={() => handleDeleteClick(annee)}
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default GestionAnnees;
