import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function Settings() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const result = await api.database.listBackups();
      if (result.success) {
        setBackups(result.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des sauvegardes:', err);
    }
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');
    setShowConfirmImport(false);
    setLoading(true);

    try {
      const result = await api.database.import();
      
      if (result.success) {
        setSuccess('Base de données importée avec succès. Une sauvegarde a été créée avant l\'import.');
        loadBackups();
      } else if (result.canceled) {
        // L'utilisateur a annulé la sélection de fichier
        setLoading(false);
        return;
      } else {
        setError(result.error || 'Erreur lors de l\'import');
      }
    } catch (err) {
      setError('Erreur lors de l\'import');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await api.database.export();
      
      if (result.success) {
        setSuccess('Base de données exportée avec succès');
      } else if (result.canceled) {
        setLoading(false);
        return;
      } else {
        setError(result.error || 'Erreur lors de l\'export');
      }
    } catch (err) {
      setError('Erreur lors de l\'export');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSqlImport = async () => {
    setError('');
    setSuccess('');
    setImportErrors([]);
    setLoading(true);

    try {
      const result = await api.sqlImport.importStudents();
      
      if (result.success) {
        setSuccess(`${result.imported} élève(s) créé(s), ${result.inscrits || result.reinscrits || 0} inscription(s) en ${result.annee || '2025/2026'}. ${result.skipped} déjà existant(s).`);
        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
          setError(`${result.errors.length} erreur(s) lors de l'import. Voir les détails ci-dessous.`);
        }
      } else if (result.canceled) {
        setLoading(false);
        return;
      } else {
        setError(result.error || 'Erreur lors de l\'import SQL');
      }
    } catch (err) {
      setError('Erreur lors de l\'import SQL');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupPath) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) {
      return;
    }

    try {
      const result = await api.database.deleteBackup(backupPath);
      
      if (result.success) {
        setSuccess('Sauvegarde supprimée avec succès');
        loadBackups();
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Paramètres</h1>

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

      {importErrors.length > 0 && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#856404', marginBottom: '10px', marginTop: 0 }}>Détails des erreurs d'import ({importErrors.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff3cd' }}>
                <tr style={{ borderBottom: '1px solid #ffc107' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Élève</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Classe</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Erreur</th>
                </tr>
              </thead>
              <tbody>
                {importErrors.map((err, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ffeeba' }}>
                    <td style={{ padding: '8px' }}>{err.student}</td>
                    <td style={{ padding: '8px' }}>{err.classe || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{err.section || 'N/A'}</td>
                    <td style={{ padding: '8px', color: '#dc3545' }}>{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import/Export de la base de données */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Import/Export de la base de données</h2>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          <strong>⚠️ Attention :</strong> L'import d'une base de données écrasera toutes les données actuelles. Une sauvegarde automatique sera créée avant l'import.
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowConfirmImport(true)}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Import en cours...' : '📥 Importer une base de données'}
          </button>

          <button
            onClick={handleExport}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Export en cours...' : '📤 Exporter la base de données'}
          </button>

          <button
            onClick={handleSqlImport}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Import en cours...' : '📄 Importer élèves (Excel / SQL)'}
          </button>
        </div>

        {showConfirmImport && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>Confirmation de l'import</h3>
            <p style={{ marginBottom: '15px' }}>
              Cette action va remplacer toutes les données actuelles par celles du fichier importé. 
              Une sauvegarde automatique sera créée avant l'import.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleImport}
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
                Confirmer l'import
              </button>
              <button
                onClick={() => setShowConfirmImport(false)}
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
          </div>
        )}
      </div>

      {/* Liste des sauvegardes automatiques */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Sauvegardes automatiques</h2>
        
        {backups.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
            Aucune sauvegarde disponible
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Nom du fichier</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Taille</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{backup.name}</td>
                    <td style={{ padding: '12px' }}>{formatDate(backup.date)}</td>
                    <td style={{ padding: '12px' }}>{formatFileSize(backup.size)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteBackup(backup.path)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
