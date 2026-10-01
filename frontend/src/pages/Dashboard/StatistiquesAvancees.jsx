import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function StatistiquesAvancees() {
  const [statsGlobales, setStatsGlobales] = useState(null);
  const [evolution, setEvolution] = useState([]);
  const [statsMensuels, setStatsMensuels] = useState([]);
  const [statsSections, setStatsSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [globalesResult, evolutionResult, mensuelsResult, sectionsResult] = await Promise.all([
        api.dashboard.getStatistiquesGlobales(),
        api.dashboard.getEvolutionInscriptions(),
        api.dashboard.getStatistiquesPaiementsMensuels(),
        api.dashboard.getStatistiquesParSection()
      ]);

      if (globalesResult.success) {
        setStatsGlobales(globalesResult.data);
        setEvolution(globalesResult.data.evolution || []);
        setStatsSections(globalesResult.data.sections || []);
      }
      
      if (evolutionResult.success) {
        setEvolution(evolutionResult.data);
      }
      
      if (mensuelsResult.success) {
        setStatsMensuels(mensuelsResult.data);
      }
      
      if (sectionsResult.success) {
        setStatsSections(sectionsResult.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
  };

  const renderBarChart = (data, labelKey, valueKey, color) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0;
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ minWidth: '150px', fontSize: '13px' }}>
                {item[labelKey]}
              </div>
              <div style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    height: '20px',
                    borderRadius: '4px',
                    boder:0,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ minWidth: '100px', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                {typeof item[valueKey] === 'number' && valueKey.includes('montant') || valueKey.includes('pension') || valueKey.includes('encaisse')
                  ? formatMontant(item[valueKey])
                  : item[valueKey]}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineChart = (data, labelKey, valueKey) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((item[valueKey] / maxValue) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div style={{ position: 'relative', height: '200px', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="#007bff"
            strokeWidth="2"
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((item[valueKey] / maxValue) * 100);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#007bff"
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
          {data.map((item, index) => (
            <span key={index}>{item[labelKey]}</span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement des statistiques...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Rapports statistiques avancés</h1>

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

      {/* Statistiques globales */}
      {statsGlobales && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          border:'0px',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
              {statsGlobales.total_eleves}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Total élèves</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
              {statsGlobales.total_classes}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Total classes</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
              {statsGlobales.total_annees}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Années scolaires</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>
              {statsGlobales.total_paiements}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Total paiements</div>
          </div>
        </div>
      )}

      {/* Évolution des inscriptions */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '0px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Évolution des inscriptions par année scolaire</h2>
        {evolution.length > 0 ? (
          <div>
            {renderLineChart(evolution, 'annee_scolaire', 'nb_inscriptions')}
            <div style={{ marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Année</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Inscriptions</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total pensions</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total encaissé</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Taux recouvrement</th>
                  </tr>
                </thead>
                <tbody>
                  {evolution.map((evo, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{evo.annee_scolaire}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{evo.nb_inscriptions}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatMontant(evo.total_pensions)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatMontant(evo.total_encaisse)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{evo.taux_recouvrement}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Aucune donnée disponible</p>
        )}
      </div>

      {/* Statistiques mensuelles */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '0px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Statistiques de paiements mensuelles</h2>
        {statsMensuels.length > 0 ? (
          <div>
            {renderBarChart(statsMensuels, 'mois_label', 'total_montant', '#28a745')}
            <div style={{ marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Mois</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nb paiements</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nb élèves payeurs</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total montant</th>
                  </tr>
                </thead>
                <tbody>
                  {statsMensuels.map>((stat, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{stat.mois_label}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{stat.nb_paiements}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{stat.nb_eleves_payeurs}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatMontant(stat.total_montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Aucune donnée disponible</p>
        )}
      </div>

      {/* Statistiques par section */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '0px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Statistiques par section</h2>
        {statsSections.length > 0 ? (
          <div>
            {renderBarChart(statsSections, 'section_nom', 'nb_eleves', '#007bff')}
            <div style={{ marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Section</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nb élèves</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nb classes</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total pensions</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total encaissé</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Taux recouvrement</th>
                  </tr>
                </thead>
                <tbody>
                  {statsSections.map((stat, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{stat.section_nom}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{stat.nb_eleves}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{stat.nb_classes}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatMontant(stat.total_pensions)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatMontant(stat.total_encaisse)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{stat.taux_recouvrement}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
}

export default StatistiquesAvancees;
