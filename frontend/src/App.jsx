import React, { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import GestionAnnees from './pages/AnneesScolaires/GestionAnnees';
import GestionClasses from './pages/Classes/GestionClasses';
import NouvelleInscription from './pages/Eleves/NouvelleInscription';
import ListeEleves from './pages/Eleves/ListeEleves';
import Reinscription from './pages/Eleves/Reinscription';
import GestionCalendrier from './pages/Calendrier/GestionCalendrier';
import GestionDocuments from './pages/Documents/GestionDocuments';
import Dashboard from './pages/Dashboard/Dashboard';
import StatistiquesAvancees from './pages/Dashboard/StatistiquesAvancees';
import ProfilAdmin from './pages/Profil/ProfilAdmin';
import ListeInsolvables from './pages/Insolvables/ListeInsolvables';
import JournalActions from './pages/Journal/JournalActions';
import Settings from './pages/Settings/Settings';
import Journalier from './pages/Paiements/Journalier';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  useEffect(() => {
    // Vérifier si une session existe en mémoire
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    setCurrentPage('dashboard');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  useEffect(() => {
    const handleSearch = async () => {
      if (searchTerm.length >= 2) {
        try {
          const result = await window.api.recherche.global(searchTerm);
          if (result.success) {
            setSearchResults(result.data);
            setShowSearchResults(true);
          }
        } catch (err) {
          console.error('Erreur de recherche :', err);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearchResultClick = (eleveId) => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    setCurrentPage('eleves');
    // Store the selected student ID for ListeEleves to handle
    sessionStorage.setItem('selectedEleveId', eleveId);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Chargement...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Navigation simple pour les étapes 1, 2, 3 et dashboard
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'statistiques':
        return <StatistiquesAvancees />;
      case 'annees':
        return <GestionAnnees />;
      case 'classes':
        return <GestionClasses />;
      case 'inscription':
        return <NouvelleInscription />;
      case 'eleves':
        return <ListeEleves />;
      case 'reinscription':
        return <Reinscription />;
      case 'calendrier':
        return <GestionCalendrier />;
      case 'documents':
        return <GestionDocuments />;
      case 'profil':
        return <ProfilAdmin user={user} onUserUpdate={handleUserUpdate} />;
      case 'insolvables':
        return <ListeInsolvables />;
      case 'journal':
        return <JournalActions user={user} />;
      case 'journalier':
        return <Journalier />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header simple */}
      <header style={{
        backgroundColor: '#007bff',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Groupe Scolaire D'eloundem ll</h1>
        
        {/* Barre de recherche globale */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px', margin: '0 40px' }}>
          <input
            type="text"
            placeholder="Rechercher un élève (nom, prénom, matricule)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          
          {/* Résultats de recherche */}
          {showSearchResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1500,
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '5px'
            }}>
              {searchResults.map((eleve) => (
                <div
                  key={eleve.id}
                  onClick={() => handleSearchResultClick(eleve.id)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    color: '#333',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <div style={{ fontWeight: '500' }}>
                    {eleve.prenom} {eleve.nom}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {eleve.matricule} • {eleve.classe_nom || 'Non inscrit'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '14px' }}>{user.nom} ({user.role})</span>
          <button
            onClick={() => setCurrentPage('profil')}
            style={{
              padding: '6px 12px',
              backgroundColor: 'green',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Mon Profil
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              backgroundColor: 'red',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Navigation simple */}
      <nav style={{
        backgroundColor: '#faf8f8',
        padding: '10px 20px',
        borderBottom: '1px solid #ddd',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <button
          onClick={() => setCurrentPage('dashboard')}
          onMouseEnter={() => setHoveredButton('dashboard')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'dashboard' ? '#007bff' : (hoveredButton === 'dashboard' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'dashboard' ? 'white' : (hoveredButton === 'dashboard' ? 'white' : '#007bff'),
            border: currentPage === 'dashboard' ? 'none' : `1px solid ${hoveredButton === 'dashboard' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Tableau de bord
        </button>
        <button
          onClick={() => setCurrentPage('statistiques')}
          onMouseEnter={() => setHoveredButton('statistiques')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'statistiques' ? '#007bff' : (hoveredButton === 'statistiques' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'statistiques' ? 'white' : (hoveredButton === 'statistiques' ? 'white' : '#007bff'),
            border: currentPage === 'statistiques' ? 'none' : `1px solid ${hoveredButton === 'statistiques' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Statistiques
        </button>
        <button
          onClick={() => setCurrentPage('annees')}
          onMouseEnter={() => setHoveredButton('annees')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'annees' ? '#007bff' : (hoveredButton === 'annees' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'annees' ? 'white' : (hoveredButton === 'annees' ? 'white' : '#007bff'),
            border: currentPage === 'annees' ? 'none' : `1px solid ${hoveredButton === 'annees' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Années scolaires
        </button>
        <button
          onClick={() => setCurrentPage('classes')}
          onMouseEnter={() => setHoveredButton('classes')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'classes' ? '#007bff' : (hoveredButton === 'classes' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'classes' ? 'white' : (hoveredButton === 'classes' ? 'white' : '#007bff'),
            border: currentPage === 'classes' ? 'none' : `1px solid ${hoveredButton === 'classes' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Classes et tarifs
        </button>
        <button
          onClick={() => setCurrentPage('inscription')}
          onMouseEnter={() => setHoveredButton('inscription')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'inscription' ? '#007bff' : (hoveredButton === 'inscription' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'inscription' ? 'white' : (hoveredButton === 'inscription' ? 'white' : '#007bff'),
            border: currentPage === 'inscription' ? 'none' : `1px solid ${hoveredButton === 'inscription' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Nouvelle inscription
        </button>
        <button
          onClick={() => setCurrentPage('reinscription')}
          onMouseEnter={() => setHoveredButton('reinscription')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'reinscription' ? '#007bff' : (hoveredButton === 'reinscription' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'reinscription' ? 'white' : (hoveredButton === 'reinscription' ? 'white' : '#007bff'),
            border: currentPage === 'reinscription' ? 'none' : `1px solid ${hoveredButton === 'reinscription' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Réinscription
        </button>
        <button
          onClick={() => setCurrentPage('calendrier')}
          onMouseEnter={() => setHoveredButton('calendrier')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'calendrier' ? '#007bff' : (hoveredButton === 'calendrier' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'calendrier' ? 'white' : (hoveredButton === 'calendrier' ? 'white' : '#007bff'),
            border: currentPage === 'calendrier' ? 'none' : `1px solid ${hoveredButton === 'calendrier' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Calendrier
        </button>
        <button
          onClick={() => setCurrentPage('documents')}
          onMouseEnter={() => setHoveredButton('documents')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'documents' ? '#007bff' : (hoveredButton === 'documents' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'documents' ? 'white' : (hoveredButton === 'documents' ? 'white' : '#007bff'),
            border: currentPage === 'documents' ? 'none' : `1px solid ${hoveredButton === 'documents' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Documents
        </button>
        <button
          onClick={() => setCurrentPage('eleves')}
          onMouseEnter={() => setHoveredButton('eleves')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'eleves' ? '#007bff' : (hoveredButton === 'eleves' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'eleves' ? 'white' : (hoveredButton === 'eleves' ? 'white' : '#007bff'),
            border: currentPage === 'eleves' ? 'none' : `1px solid ${hoveredButton === 'eleves' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Liste des élèves
        </button>
        <button
          onClick={() => setCurrentPage('insolvables')}
          onMouseEnter={() => setHoveredButton('insolvables')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'insolvables' ? '#007bff' : (hoveredButton === 'insolvables' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'insolvables' ? 'white' : (hoveredButton === 'insolvables' ? 'white' : '#007bff'),
            border: currentPage === 'insolvables' ? 'none' : `1px solid ${hoveredButton === 'insolvables' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Insolvables
        </button>
        <button
          onClick={() => setCurrentPage('journalier')}
          onMouseEnter={() => setHoveredButton('journalier')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'journalier' ? '#007bff' : (hoveredButton === 'journalier' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'journalier' ? 'white' : (hoveredButton === 'journalier' ? 'white' : '#007bff'),
            border: currentPage === 'journalier' ? 'none' : `1px solid ${hoveredButton === 'journalier' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          Journalier
        </button>
        {user.role === 'Admin' && (
          <button
            onClick={() => setCurrentPage('journal')}
            onMouseEnter={() => setHoveredButton('journal')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage === 'journal' ? '#007bff' : (hoveredButton === 'journal' ? '#FF69B4' : 'transparent'),
              color: currentPage === 'journal' ? 'white' : (hoveredButton === 'journal' ? 'white' : '#007bff'),
              border: currentPage === 'journal' ? 'none' : `1px solid ${hoveredButton === 'journal' ? '#FF69B4' : '#007bff'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            Journal
          </button>
        )}
        <button
          onClick={() => setCurrentPage('settings')}
          onMouseEnter={() => setHoveredButton('settings')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage === 'settings' ? '#007bff' : (hoveredButton === 'settings' ? '#FF69B4' : 'transparent'),
            color: currentPage === 'settings' ? 'white' : (hoveredButton === 'settings' ? 'white' : '#007bff'),
            border: currentPage === 'settings' ? 'none' : `1px solid ${hoveredButton === 'settings' ? '#FF69B4' : '#007bff'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          ⚙️ Paramètres
        </button>
      </nav>

      {/* Contenu principal */}
      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
