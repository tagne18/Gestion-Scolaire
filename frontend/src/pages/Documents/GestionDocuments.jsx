import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function GestionDocuments() {
  const [eleves, setEleves] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [selectedEleve, setSelectedEleve] = useState('');
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [searchEleve, setSearchEleve] = useState('');
  const [showEleveResults, setShowEleveResults] = useState(false);

  useEffect(() => {
    loadEleves();
    loadAnnees();
  }, []);

  const loadEleves = async () => {
    try {
      const result = await api.eleves.getAll();
      if (result.success) {
        setEleves(result.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des élèves:', err);
    }
  };

  const loadAnnees = async () => {
    try {
      const result = await api.annees.getAll();
      if (result.success) {
        setAnnees(result.data);
        // Sélectionner l'année active par défaut
        const activeAnnee = result.data.find(a => a.active);
        if (activeAnnee) {
          setSelectedAnnee(activeAnnee.id);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des années:', err);
    }
  };

  const handleGenererCertificatScolarite = async () => {
    if (!selectedEleve || !selectedAnnee) {
      setError('Veuillez sélectionner un élève et une année scolaire');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedDocument(null);

    try {
      const result = await api.documents.genererCertificatScolarite(parseInt(selectedEleve), parseInt(selectedAnnee));
      
      if (result.success) {
        setGeneratedDocument(result.data);
        setSuccess('Certificat de scolarité généré avec succès');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la génération du certificat');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenererAttestationPaiement = async () => {
    if (!selectedEleve || !selectedAnnee) {
      setError('Veuillez sélectionner un élève et une année scolaire');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedDocument(null);

    try {
      const result = await api.documents.genererAttestationPaiement(parseInt(selectedEleve), parseInt(selectedAnnee));
      
      if (result.success) {
        setGeneratedDocument(result.data);
        setSuccess('Attestation de paiement générée avec succès');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la génération de l\'attestation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenererReleveNotes = async () => {
    if (!selectedEleve || !selectedAnnee) {
      setError('Veuillez sélectionner un élève et une année scolaire');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedDocument(null);

    try {
      const result = await api.documents.genererReleveNotes(parseInt(selectedEleve), parseInt(selectedAnnee));
      
      if (result.success) {
        setGeneratedDocument(result.data);
        setSuccess('Relevé de notes généré avec succès');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erreur lors de la génération du relevé');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimer = () => {
    if (!generatedDocument || !generatedDocument.contenu) {
      setError('Aucun document à imprimer');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(generatedDocument.contenu);
    printWindow.document.close();
    printWindow.print();
  };

  const handleTelecharger = () => {
    if (!generatedDocument || !generatedDocument.contenu) {
      setError('Aucun document à télécharger');
      return;
    }

    const blob = new Blob([generatedDocument.contenu], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedDocument.type}_${generatedDocument.eleve.nom}_${generatedDocument.eleve.prenom}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedEleveData = eleves.find(e => e.id === parseInt(selectedEleve));

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Gestion des documents</h1>

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

      {/* Sélection de l'élève et de l'année */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Sélection</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500'
            }}>
              Élève *
            </label>
            <select
              value={selectedEleve}
              onChange={(e) => setSelectedEleve(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Sélectionner un élève --</option>
              {eleves.map(eleve => (
                <option key={eleve.id} value={eleve.id}>
                  {eleve.nom} {eleve.prenom} ({eleve.matricule})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500'
            }}>
              Année scolaire *
            </label>
            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Sélectionner une année --</option>
              {annees.map(annee => (
                <option key={annee.id} value={annee.id}>
                  {annee.libelle} {annee.active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEleveData && (
          <div style={{
            backgroundColor: '#f0f8ff',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0 }}>
              <strong>Élève sélectionné :</strong> {selectedEleveData.nom} {selectedEleveData.prenom}
              <br />
              <strong>Matricule :</strong> {selectedEleveData.matricule}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenererCertificatScolarite}
            disabled={loading || !selectedEleve || !selectedAnnee}
            style={{
              padding: '12px 24px',
              backgroundColor: loading || !selectedEleve || !selectedAnnee ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedEleve || !selectedAnnee ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Génération...' : '📄 Certificat de scolarité'}
          </button>
          <button
            onClick={handleGenererAttestationPaiement}
            disabled={loading || !selectedEleve || !selectedAnnee}
            style={{
              padding: '12px 24px',
              backgroundColor: loading || !selectedEleve || !selectedAnnee ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedEleve || !selectedAnnee ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Génération...' : '💰 Attestation de paiement'}
          </button>
          <button
            onClick={handleGenererReleveNotes}
            disabled={loading || !selectedEleve || !selectedAnnee}
            style={{
              padding: '12px 24px',
              backgroundColor: loading || !selectedEleve || !selectedAnnee ? '#6c757d' : '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedEleve || !selectedAnnee ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Génération...' : '📊 Relevé de notes'}
          </button>
        </div>
      </div>

      {/* Aperçu du document généré */}
      {generatedDocument && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Aperçu du document</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleImprimer}
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
                🖨️ Imprimer
              </button>
              <button
                onClick={handleTelecharger}
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
                💾 Télécharger
              </button>
            </div>
          </div>

          <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '20px',
            backgroundColor: '#fafafa',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <div dangerouslySetInnerHTML={{ __html: generatedDocument.contenu }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionDocuments;
