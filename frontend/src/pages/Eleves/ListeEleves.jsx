import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';
import FicheEleve from './FicheEleve';
import { exportToExcel } from '../../utils/exportExcel';

function ListeEleves() {
  const [eleves, setEleves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEleveId, setSelectedEleveId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  
  // États pour le formulaire d'inscription rapide
  const [showInscriptionModal, setShowInscriptionModal] = useState(false);
  const [eleveToInscrire, setEleveToInscrire] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [inscriptionForm, setInscriptionForm] = useState({
    classe_id: '',
    section_id: '',
    montant_pension: ''
  });

  useEffect(() => {
    loadEleves();
    loadClassesAndSections();
  }, []);

  const loadEleves = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await api.eleves.getAll();
      if (result.success) {
        setEleves(result.data);
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

  const loadClassesAndSections = async () => {
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
      console.error('Erreur lors du chargement des classes et sections:', err);
    }
  };

  const filteredEleves = eleves.filter(eleve => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      eleve.nom?.toLowerCase().includes(search) ||
      eleve.prenom?.toLowerCase().includes(search) ||
      eleve.matricule?.toLowerCase().includes(search) ||
      eleve.section_nom?.toLowerCase().includes(search) ||
      (eleve.age !== null && eleve.age.toString().includes(search))
    );
    
    const matchesClass = !selectedClass || eleve.classe_nom === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  // Get unique classes for dropdown
  const uniqueClasses = [...new Set(eleves.map(e => e.classe_nom).filter(Boolean))].sort();

  const handleExport = async () => {
    const headers = [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' },
      { key: 'classe_nom', label: 'Classe' },
      { key: 'section_nom', label: 'Section' },
      { key: 'age', label: 'Âge' }
    ];

    const fileName = `liste_eleves_${new Date().toISOString().split('T')[0]}.xlsx`;
    await exportToExcel(filteredEleves, headers, fileName);
  };

  const handleValiderInscription = async (inscriptionId) => {
    if (!confirm('Voulez-vous vraiment valider cette inscription ? L\'élève pourra alors effectuer des paiements.')) {
      return;
    }
    
    try {
      const result = await api.inscriptions.validerInscription(inscriptionId);
      if (result.success) {
        alert('Inscription validée avec succès !');
        loadEleves(); // Recharger la liste
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (err) {
      alert('Erreur lors de la validation de l\'inscription');
      console.error(err);
    }
  };

  const handlePrint = () => {
    const classToPrint = selectedClass || 'Toutes les classes';
    
    const printContent = `
      <html>
        <head>
          <title>Liste des élèves - ${classToPrint}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 10px; text-align: left; }
            th { background-color: #f0f0f0; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Liste des élèves - ${classToPrint}</h1>
          <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Sexe</th>
                <th>Classe</th>
                <th>Section</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEleves.map((eleve, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${eleve.matricule}</td>
                  <td>${eleve.nom}</td>
                  <td>${eleve.prenom}</td>
                  <td>${eleve.sexe || '-'}</td>
                  <td>${eleve.classe_nom || '-'}</td>
                  <td>${eleve.section_nom || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Total: ${filteredEleves.length} élève(s)</p>
            <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (selectedEleveId) {
    return (
      <FicheEleve
        eleveId={selectedEleveId}
        onBack={() => setSelectedEleveId(null)}
      />
    );
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '30px' }}>
      <h1 style={{ marginBottom: '30px' }}>Liste des élèves</h1>

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

      {/* Barre de recherche et filtres */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou matricule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            
            flex: 1,
            minWidth: '200px',
            maxWidth: '400px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '150px'
          }}
        >
          <option value="">Toutes les classes</option>
          {uniqueClasses.map(classe => (
            <option key={classe} value={classe}>{classe}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
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
          📊 Exporter en Excel
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🖨️ Imprimer la liste
        </button>
      </div>

      {/* Liste des élèves */}
      {eleves.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          border: 'none'
        }}>
          <p>Aucun élève enregistré.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Utilisez le formulaire "Nouvelle inscription" pour enregistrer des élèves.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '0px solid #ddd',
          
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' ,}}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Matricule</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Nom</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Prénom</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Sexe</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Date de naissance</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Âge</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Classe</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Section</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Statut</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>Total payé</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => (
                <tr key={eleve.id} style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: !eleve.inscription_statut ? '#f8d7da' : eleve.inscription_statut === 'à_inscrire' ? '#fff3cd' : 'white'
                }}>
                  <td style={{ padding: '15px', fontWeight: '500' }}>{eleve.matricule}</td>
                  <td style={{ padding: '15px' }}>{eleve.nom}</td>
                  <td style={{ padding: '15px' }}>{eleve.prenom}</td>
                  <td style={{ padding: '15px' }}>{eleve.sexe || '-'}</td>
                  <td style={{ padding: '15px' }}>{eleve.date_naissance || '-'}</td>
                  <td style={{ padding: '15px' }}>{eleve.age !== null ? `${eleve.age} ans` : '-'}</td>
                  <td style={{ padding: '15px' }}>{eleve.classe_nom || '-'}</td>
                  <td style={{ padding: '15px' }}>{eleve.section_nom || '-'}</td>
                  <td style={{ padding: '15px' }}>
                    {!eleve.inscription_statut ? (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Non inscrit
                      </span>
                    ) : eleve.inscription_statut === 'à_inscrire' ? (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#ffc107',
                        color: '#000',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        À inscrire
                      </span>
                    ) : eleve.inscription_statut === 'active' ? (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Actif
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {eleve.inscription_statut}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right', fontWeight: '500' }}>
                    {eleve.total_paiements ? eleve.total_paiements.toLocaleString('fr-FR') + ' FCFA' : '0 FCFA'}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {!eleve.inscription_statut && (
                        <button
                          onClick={() => alert('Pour inscrire cet élève, utilisez le formulaire "Nouvelle inscription"')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                          title="Créer une inscription"
                        >
                          + Inscrire
                        </button>
                      )}
                      {eleve.inscription_statut === 'à_inscrire' && eleve.inscription_id && (
                        <button
                          onClick={() => handleValiderInscription(eleve.inscription_id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                          title="Valider l'inscription"
                        >
                          ✓ Valider
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEleveId(eleve.id)}
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
                        Voir la fiche
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEleves.length === 0 && searchTerm && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666'
            }}>
              Aucun résultat pour "{searchTerm}"
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        Total : {eleves.length} élève{eleves.length > 1 ? 's' : ''}
        {searchTerm && ` (${filteredEleves.length} affiché${filteredEleves.length > 1 ? 's' : ''})`}
      </p>
    </div>
  );
}

export default ListeEleves;
