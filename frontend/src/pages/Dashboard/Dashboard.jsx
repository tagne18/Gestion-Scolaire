import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function Dashboard() {
  const [indicateurs, setIndicateurs] = useState(null);
  const [recouvrement, setRecouvrement] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [indicateursResult, recouvrementResult, alertesResult] = await Promise.all([
        api.dashboard.getIndicateurs(),
        api.dashboard.getRecouvrementParClasse(),
        api.dashboard.getAlertesEcheancesProches()
      ]);
      
      if (indicateursResult.success) {
        setIndicateurs(indicateursResult.data);
      } else {
        setError(indicateursResult.error);
      }
      
      if (recouvrementResult.success) {
        setRecouvrement(recouvrementResult.data);
      }
      
      if (alertesResult.success) {
        setAlertes(alertesResult.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement du tableau de bord');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    const valeur = Number(montant);
    if (!Number.isFinite(valeur)) {
      return '0 FCFA';
    }
    return valeur.toLocaleString('fr-FR') + ' FCFA';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '30px', color: '#2c3e50', fontSize: '28px' }}>Tableau de bord</h1>

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

      {/* Indicateurs clés */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Total aujourd'hui */}
        <div style={{
          backgroundColor: '#98bef4ff',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
         
          
        }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>
            Encaissé aujourd'hui
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
            {indicateurs ? formatMontant(indicateurs.total_aujourdhui) : '0 FCFA'}
          </div>
        </div>

        {/* Total ce mois */}
        <div style={{
          backgroundColor: '#6f91b4ff',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>
            Encaissé ce mois-ci
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>
            {indicateurs ? formatMontant(indicateurs.total_mois) : '0 FCFA'}
          </div>
        </div>

        {/* Total encaissé année */}
        <div style={{
          backgroundColor: 'green',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
         
        }}>
          <div style={{ fontSize: '14px', color: '#ffff', marginBottom: '10px' }}>
            Total encaissé (année)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffff' }}>
            {indicateurs ? formatMontant(indicateurs.total_encaisse) : '0 FCFA'}
          </div>
        </div>

        {/* Total attendu / Recouvrement */}
        <div style={{
          backgroundColor: '#ffc107',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#ffff', marginBottom: '10px' }}>
            Attendu vs Encaissé
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
            {indicateurs ? formatMontant(indicateurs.total_encaisse) : '0 FCFA'} 
            <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}> 
              / {indicateurs ? formatMontant(indicateurs.total_attendu) : '0 FCFA'}
            </span>
          </div>
          {indicateurs && indicateurs.total_attendu > 0 && (
            <div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '5px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (indicateurs.total_encaisse / indicateurs.total_attendu) * 100)}%`,
                  backgroundColor: 
                    (indicateurs.total_encaisse / indicateurs.total_attendu) * 100 >= 90 ? '#28a745' :
                    (indicateurs.total_encaisse / indicateurs.total_attendu) * 100 >= 70 ? '#ffc107' : '#dc3545',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>
                Taux de recouvrement : {((indicateurs.total_encaisse / indicateurs.total_attendu) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Total élèves */}
        <div style={{
          backgroundColor: '#6610f2',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>
            Élèves inscrits
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#000' }}>
            {indicateurs ? indicateurs.total_eleves : 0}
          </div>
        </div>

        {/* Élèves insolvables */}
        <div style={{
          backgroundColor: '#f7bcc2',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#000', marginBottom: '10px' }}>
            Élèves insolvables
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
            {indicateurs ? indicateurs.eleves_insolvables : 0}
          </div>
        </div>
      </div>

      {/* Frais d'inscription et Pension */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Frais d'inscription */}
        <div style={{
          backgroundColor: '#dceff1',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>
            Frais d'inscription
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
            {indicateurs ? formatMontant(indicateurs.total_inscription_encaisse) : '0 FCFA'} 
            <span style={{ fontSize: '14px', color: '#000', fontWeight: 'normal' }}> 
              / {indicateurs ? formatMontant(indicateurs.total_inscription_attendu) : '0 FCFA'}
            </span>
          </div>
          {indicateurs && indicateurs.total_inscription_attendu > 0 && (
            <div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#cfa79794',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '5px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (indicateurs.total_inscription_encaisse / indicateurs.total_inscription_attendu) * 100)}%`,
                  backgroundColor: '#17a2b8',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>
                Taux : {((indicateurs.total_inscription_encaisse / indicateurs.total_inscription_attendu) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Pension */}
        <div style={{
          backgroundColor: '#28a745',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          
        }}>
          <div style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>
            Pension
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#000', marginBottom: '5px' }}>
            {indicateurs ? formatMontant(indicateurs.total_pension_encaisse) : '0 FCFA'} 
            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'normal' }}> 
              / {indicateurs ? formatMontant(indicateurs.total_pension_attendu) : '0 FCFA'}
            </span>
          </div>
          {indicateurs && indicateurs.total_pension_attendu > 0 && (
            <div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#000',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '5px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (indicateurs.total_pension_encaisse / indicateurs.total_pension_attendu) * 100)}%`,
                  backgroundColor: '#92a897',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>
                Taux : {((indicateurs.total_pension_encaisse / indicateurs.total_pension_attendu) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Recouvrement par classe */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50', fontSize: '20px' }}>
            Recouvrement par classe
          </h2>
          
          {recouvrement.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
              Aucune donnée disponible
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#6c757d' }}>Classe</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#6c757d' }}>Élèves</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#6c757d' }}>Attendu</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#6c757d' }}>Encaissé</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#6c757d' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {recouvrement.map((classe) => (
                  <tr key={classe.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{classe.classe_nom}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{classe.section_nom}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{classe.nb_eleves}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatMontant(classe.total_attendu)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatMontant(classe.total_encaisse)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          classe.pourcentage_recouvrement >= 90 ? '#d4edda' :
                          classe.pourcentage_recouvrement >= 70 ? '#fff3cd' :
                          classe.pourcentage_recouvrement >= 50 ? '#ffe5d0' : '#f8d7da',
                        color:
                          classe.pourcentage_recouvrement >= 90 ? '#155724' :
                          classe.pourcentage_recouvrement >= 70 ? '#856404' :
                          classe.pourcentage_recouvrement >= 50 ? '#856404' : '#721c24'
                      }}>
                        {classe.pourcentage_recouvrement.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alertes échéances proches */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50', fontSize: '20px' }}>
            Alertes échéances proches
          </h2>
          
          {alertes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
              Aucune échéance proche
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {alertes.map((alerte) => (
                <div key={alerte.tranche_id} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: alerte.jours_restants <= 2 ? '#fff3cd' : '#f8f9fa',
                  border: `1px solid ${alerte.jours_restants <= 2 ? '#ffc107' : '#e9ecef'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        {alerte.eleve_nom} {alerte.eleve_prenom}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6c757d' }}>
                        {alerte.matricule} • {alerte.classe_nom}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: alerte.jours_restants <= 2 ? '#dc3545' : '#ffc107',
                      color: 'white'
                    }}>
                      {alerte.jours_restants} jour{alerte.jours_restants > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                    <strong>{alerte.tranche_libelle}</strong> - 
                    Échéance : {alerte.date_limite}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                    Reste à payer : {formatMontant(alerte.reste_a_payer)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={loadDashboardData}
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
        Actualiser
      </button>
    </div>
  );
}

export default Dashboard;
