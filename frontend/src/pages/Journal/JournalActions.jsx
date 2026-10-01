import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function JournalActions({ user }) {
  const [actions, setActions] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    utilisateurId: '',
    dateDebut: '',
    dateFin: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadActions();
    }
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Seuls les admins peuvent voir le journal
      if (user.role !== 'Admin') {
        setError('Accès non autorisé');
        setLoading(false);
        return;
      }

      const utilisateursResult = await api.journal.getUtilisateurs();
      
      if (utilisateursResult.success) {
        setUtilisateurs(utilisateursResult.data);
      }
      
      await loadActions();
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActions = async () => {
    try {
      const filtersToSend = {};
      if (filters.utilisateurId) filtersToSend.utilisateurId = parseInt(filters.utilisateurId);
      if (filters.dateDebut) filtersToSend.dateDebut = filters.dateDebut;
      if (filters.dateFin) filtersToSend.dateFin = filters.dateFin;
      
      const result = await api.journal.getList(filtersToSend);
      
      if (result.success) {
        setActions(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement du journal');
      }
    } catch (err) {
      setError('Erreur lors du chargement du journal');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  if (user.role !== 'Admin') {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Accès non autorisé</h2>
          <p style={{ margin: 0 }}>Seuls les administrateurs peuvent accéder au journal des actions.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>Journal des Actions</h1>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Filtres */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd',
        display: 'flex',
        gap: '15px',
        alignItems: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Utilisateur
          </label>
          <select
            value={filters.utilisateurId}
            onChange={(e) => setFilters({ ...filters, utilisateurId: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Tous les utilisateurs</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom} ({u.username})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Date début
          </label>
          <input
            type="date"
            value={filters.dateDebut}
            onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Date fin
          </label>
          <input
            type="date"
            value={filters.dateFin}
            onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <button
          onClick={() => setFilters({ utilisateurId: '', dateDebut: '', dateFin: '' })}
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
          Réinitialiser
        </button>
      </div>

      {/* Tableau des actions */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        {actions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Aucune action enregistrée
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Utilisateur</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    {formatDate(action.date_action)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {action.utilisateur_nom || 'Système'}
                    {action.utilisateur_username && (
                      <span style={{ color: '#666', fontSize: '12px', marginLeft: '5px' }}>
                        ({action.utilisateur_username})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      backgroundColor: getActionColor(action.action),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {action.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                    {action.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Résumé */}
      {actions.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <strong>Total : </strong> {actions.length} action(s) enregistrée(s)
        </div>
      )}
    </div>
  );
}

function getActionColor(action) {
  const actionColors = {
    'CRÉATION': '#28a745',
    'MODIFICATION': '#ffc107',
    'SUPPRESSION': '#dc3545',
    'ANNULATION': '#dc3545',
    'CONNEXION': '#17a2b8',
    'DÉCONNEXION': '#6c757d',
    'CHANGEMENT ANNÉE': '#fd7e14'
  };
  
  return actionColors[action] || '#6c757d';
}

export default JournalActions;
