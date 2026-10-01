import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';
import { exportToExcel } from '../../utils/exportExcel';

function ListeInsolvables() {
  const [insolvables, setInsolvables] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    classeId: '',
    sectionId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadInsolvables();
    }
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [classesResult, sectionsResult] = await Promise.all([
        api.classes.getAll(),
        api.classes.getSections()
      ]);
      
      if (classesResult.success) setClasses(classesResult.data);
      if (sectionsResult.success) setSections(sectionsResult.data);
      
      await loadInsolvables();
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInsolvables = async () => {
    try {
      const filtersToSend = {};
      if (filters.classeId) filtersToSend.classeId = parseInt(filters.classeId);
      if (filters.sectionId) filtersToSend.sectionId = parseInt(filters.sectionId);
      
      const result = await api.insolvables.getList(filtersToSend);
      
      if (result.success) {
        setInsolvables(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des insolvables');
      }
    } catch (err) {
      setError('Erreur lors du chargement des insolvables');
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    const headers = [
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' },
      { key: 'matricule', label: 'Matricule' },
      { key: 'classe_nom', label: 'Classe' },
      { key: 'section_nom', label: 'Section' },
      { key: 'tranche_libelle', label: 'Tranche en cause' },
      { key: 'montant_du', label: 'Montant dû (FCFA)' },
      { key: 'jours_retard', label: 'Jours de retard' }
    ];

    const fileName = `insolvables_${new Date().toISOString().split('T')[0]}.xlsx`;
    await exportToExcel(insolvables, headers, fileName);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .insolvables-container, .insolvables-container * {
            visibility: visible;
          }
          .insolvables-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="insolvables-container">
        <h1 style={{ marginBottom: '30px', color: '#333' }}>Liste des Insolvables</h1>

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
        <div className="no-print" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '0px solid #ddd',
          display: 'flex',
          gap: '15px',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Classe
            </label>
            <select
              value={filters.classeId}
              onChange={(e) => setFilters({ ...filters, classeId: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Toutes les classes</option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Section
            </label>
            <select
              value={filters.sectionId}
              onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Toutes les sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.nom}
                </option>
              ))}
            </select>
          </div>

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
        </div>

        {/* Tableau des insolvables */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          {insolvables.length === 0 ? (
            <p style={{border:'0px', textAlign: 'center', color: '#666', padding: '40px' }}>
              Aucun élève insolvable pour l'instant
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Nom</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Matricule</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Classe</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Tranche en cause</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Montant dû</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Jours de retard</th>
                </tr>
              </thead>
              <tbody>
                {insolvables.map((item) => (
                  <tr key={`${item.id}-${item.tranche_numero}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      {item.prenom} {item.nom}
                    </td>
                    <td style={{ padding: '12px' }}>{item.matricule}</td>
                    <td style={{ padding: '12px' }}>{item.classe_nom}</td>
                    <td style={{ padding: '12px' }}>{item.section_nom}</td>
                    <td style={{ padding: '12px' }}>{item.tranche_libelle}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#dc3545' }}>
                      {item.montant_du.toLocaleString()} FCFA
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: item.jours_retard > 30 ? '#dc3545' : '#ffc107',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                        
                      }}>
                        {item.jours_retard} jours
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Résumé */}
        {insolvables.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <strong>Total : </strong> {insolvables.length} élève(s) insolvable(s)
          </div>
        )}
      </div>
    </div>
  );
}

export default ListeInsolvables;
