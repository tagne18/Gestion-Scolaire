import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function NouvelleInscription() {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [tarifsClasse, setTarifsClasse] = useState(null);
  
  // Formulaire élève
  const [eleveForm, setEleveForm] = useState({
    nom: '',
    prenom: '',
    sexe: '',
    date_naissance: '',
    lieu_naissance: '',
    nom_pere: '',
    telephone_pere: '',
    nom_mere: '',
    telephone_mere: '',
    nom_tuteur: '',
    telephone_tuteur: '',
    lien_tuteur: '',
    adresse: ''
  });
  
  // Formulaire inscription
  const [inscriptionForm, setInscriptionForm] = useState({
    classe_id: '',
    section_id: '',
    montant_inscription: '',
    montant_pension: '',
    reduction: '',
    motif_reduction: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eleveCree, setEleveCree] = useState(null);

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

  const handleClasseChange = async (classeId) => {
    const classe = classes.find(c => c.id === parseInt(classeId));
    if (classe) {
      setInscriptionForm({
        ...inscriptionForm,
        classe_id: classeId,
        section_id: classe.section_id
      });
      
      // Récupérer les tarifs pour cette classe
      if (anneeActive) {
        const tarifsResult = await api.classes.getTarifs(classe.id, anneeActive.id);
        if (tarifsResult.success && tarifsResult.data) {
          setTarifsClasse(tarifsResult.data);
          setInscriptionForm(prev => ({
            ...prev,
            montant_inscription: tarifsResult.data.montant_inscription || '',
            montant_pension: tarifsResult.data.montant_pension_annuel || ''
          }));
        }
      }
    }
  };

  const handleEleveChange = (e) => {
    setEleveForm({
      ...eleveForm,
      [e.target.name]: e.target.value
    });
  };

  const handleInscriptionChange = (e) => {
    const { name, value } = e.target;
    // Pour les champs montétaires, n'accepter que des entiers
    if (name === 'montant_inscription' || name === 'montant_pension' || name === 'reduction') {
      if (value === '' || /^\d+$/.test(value)) {
        setInscriptionForm({
          ...inscriptionForm,
          [name]: value
        });
      }
    } else {
      setInscriptionForm({
        ...inscriptionForm,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      if (!anneeActive) {
        setError('Aucune année scolaire active. Veuillez d\'abord activer une année.');
        setSubmitting(false);
        return;
      }
      
      // Validation
      if (!eleveForm.nom || !eleveForm.prenom) {
        setError('Le nom et le prénom de l\'élève sont obligatoires');
        setSubmitting(false);
        return;
      }
      
      if (!inscriptionForm.classe_id) {
        setError('Veuillez sélectionner une classe');
        setSubmitting(false);
        return;
      }
      
      // Créer l'élève avec la section choisie
      const section = sections.find(s => s.id === parseInt(inscriptionForm.section_id));
      const eleveData = {
        ...eleveForm,
        section_nom: section ? section.nom : 'Francophone'
      };
      
      const eleveResult = await api.eleves.create(eleveData);
      
      if (!eleveResult.success) {
        setError(eleveResult.error);
        setSubmitting(false);
        return;
      }
      
      setEleveCree(eleveResult.data);
      
      // Créer l'inscription
      const inscriptionData = {
        eleve_id: eleveResult.data.id,
        annee_scolaire_id: anneeActive.id,
        classe_id: parseInt(inscriptionForm.classe_id),
        section_id: parseInt(inscriptionForm.section_id),
        montant_inscription: parseInt(inscriptionForm.montant_inscription) || 0,
        montant_pension: parseInt(inscriptionForm.montant_pension) || 0,
        reduction: parseInt(inscriptionForm.reduction) || 0,
        motif_reduction: inscriptionForm.motif_reduction || null
      };
      
      const inscriptionResult = await api.inscriptions.create(inscriptionData);
      
      if (inscriptionResult.success) {
        setSuccess(`Inscription réussie ! Matricule : ${eleveResult.data.matricule}`);
        // Réinitialiser le formulaire
        setEleveForm({
          nom: '',
          prenom: '',
          sexe: '',
          date_naissance: '',
          lieu_naissance: '',
          nom_pere: '',
          telephone_pere: '',
          nom_mere: '',
          telephone_mere: '',
          nom_tuteur: '',
          telephone_tuteur: '',
          lien_tuteur: '',
          adresse: ''
        });
        setInscriptionForm({
          classe_id: '',
          section_id: '',
          montant_inscription: '',
          montant_pension: '',
          reduction: '',
          motif_reduction: ''
        });
        setTarifsClasse(null);
        setEleveCree(null);
      } else {
        setError(inscriptionResult.error);
      }
    } catch (err) {
      setError('Erreur lors de l\'inscription');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Nouvelle inscription</h1>

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

      <form onSubmit={handleSubmit}>
        {/* Section 1: Identité de l'élève */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#007bff' }}>1. Identité de l'élève</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nom <span className='' style={{color:'red'}}>*</span>
              </label>
              <input
                type="text"
                name="nom"
                value={eleveForm.nom}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Prénom <span className='' style={{color:'red'}}>*</span>
              </label>
              <input
                type="text"
                name="prenom"
                value={eleveForm.prenom}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Sexe
              </label>
              <select
                name="sexe"
                value={eleveForm.sexe}
                onChange={handleEleveChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Sélectionner</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Date de naissance
              </label>
              <input
                type="date"
                name="date_naissance"
                value={eleveForm.date_naissance}
                onChange={handleEleveChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Lieu de naissance
              </label>
              <input
                type="text"
                name="lieu_naissance"
                value={eleveForm.lieu_naissance}
                onChange={handleEleveChange}
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
        </div>

        {/* Section 2: Parents */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#007bff' }}>2. Parents</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nom du père
              </label>
              <input
                type="text"
                name="nom_pere"
                value={eleveForm.nom_pere}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Téléphone du père
              </label>
              <input
                type="text"
                name="telephone_pere"
                value={eleveForm.telephone_pere}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nom de la mère
              </label>
              <input
                type="text"
                name="nom_mere"
                value={eleveForm.nom_mere}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Téléphone de la mère
              </label>
              <input
                type="text"
                name="telephone_mere"
                value={eleveForm.telephone_mere}
                onChange={handleEleveChange}
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
        </div>

        {/* Section 3: Tuteur (optionnel) */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#007bff' }}>3. Tuteur (optionnel)</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nom du tuteur
              </label>
              <input
                type="text"
                name="nom_tuteur"
                value={eleveForm.nom_tuteur}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Téléphone du tuteur
              </label>
              <input
                type="text"
                name="telephone_tuteur"
                value={eleveForm.telephone_tuteur}
                onChange={handleEleveChange}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Lien avec l'élève
              </label>
              <input
                type="text"
                name="lien_tuteur"
                value={eleveForm.lien_tuteur}
                onChange={handleEleveChange}
                placeholder="Ex: Oncle, Tante, Grand-père..."
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
        </div>

        {/* Section 4: Inscription */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#007bff' }}>4. Inscription</h2>
          
          {anneeActive && (
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Année scolaire : <strong>{anneeActive.libelle}</strong>
            </p>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Classe <span className='' style={{color:'red'}}>*</span>
              </label>
              <select
                name="classe_id"
                value={inscriptionForm.classe_id}
                onChange={(e) => handleClasseChange(e.target.value)}
                required
                disabled={!anneeActive}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map((classe) => (
                  <option key={classe.id} value={classe.id}>
                    {classe.nom} ({classe.niveau} - {classe.section_nom})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Montant de l'inscription (FCFA)
              </label>
              <input
                type="number"
                name="montant_inscription"
                value={inscriptionForm.montant_inscription}
                onChange={handleInscriptionChange}
                disabled={!tarifsClasse}
                step="1"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  backgroundColor: tarifsClasse ? '#fff' : '#f0f0f0'
                }}
              />
              {tarifsClasse && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Tarif par défaut: {tarifsClasse.montant_inscription?.toLocaleString() || 0} FCFA
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Pension annuelle (FCFA)
              </label>
              <input
                type="number"
                name="montant_pension"
                value={inscriptionForm.montant_pension}
                onChange={handleInscriptionChange}
                disabled={!tarifsClasse}
                step="1"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  backgroundColor: tarifsClasse ? '#fff' : '#f0f0f0'
                }}
              />
              {tarifsClasse && (
                <small style={{ color: '#666' }}>Tarif pour cette classe</small>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Réduction (FCFA)
              </label>
              <input
                type="number"
                name="reduction"
                value={inscriptionForm.reduction}
                onChange={handleInscriptionChange}
                min="0"
                step="1"
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Motif de réduction
              </label>
              <input
                type="text"
                name="motif_reduction"
                value={inscriptionForm.motif_reduction}
                onChange={handleInscriptionChange}
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
          
          {tarifsClasse && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Nombre de Tranches :</strong>
              <ul style={{ margin: '5px 0 0 20px' }}>
                <li>Tranche 1 : {tarifsClasse.tranche_1 || 0} FCFA</li>
                <li>Tranche 2 : {tarifsClasse.tranche_2 || 0} FCFA</li>
                <li>Tranche 3 : {tarifsClasse.tranche_3 || 0} FCFA</li>
              </ul>
            </div>
          )}
        </div>

        {/* Adresse */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#007bff' }}>Adresse</h2>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Adresse
            </label>
            <textarea
              name="adresse"
              value={eleveForm.adresse}
              onChange={handleEleveChange}
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
        </div>

        <button
          type="submit"
          disabled={submitting || !anneeActive}
          style={{
            padding: '12px 24px',
            backgroundColor: submitting || !anneeActive ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting || !anneeActive ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          {submitting ? 'Inscription en cours...' : 'Inscrire l\'élève'}
        </button>
      </form>
    </div>
  );
}

export default NouvelleInscription;
