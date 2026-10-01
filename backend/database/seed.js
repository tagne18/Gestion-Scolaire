const bcrypt = require('bcryptjs');
const { getDatabase } = require('./db');

/**
 * Initialise les données de base de l'application
 * - Crée un compte Admin par défaut
 * - Crée les sections Francophone et Anglophone
 */
function seedDatabase() {
  const db = getDatabase();

  const tableUtilisateurs = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='utilisateurs'"
  ).get();
  if (!tableUtilisateurs) {
    console.error('Seed annulé : la table utilisateurs est absente');
    return;
  }


  // Vérifier si des utilisateurs existent déjà
  const userCount = db.prepare('SELECT COUNT(*) as count FROM utilisateurs').get();
  
  if (userCount.count === 0) {
    // Créer l'utilisateur Admin par défaut
    const passwordHash = bcrypt.hashSync('admin123', 10);
    
    db.prepare(`
      INSERT INTO utilisateurs (nom, username, password_hash, role, actif)
      VALUES (?, ?, ?, ?, ?)
    `).run('Administrateur', 'admin', passwordHash, 'Admin', 1);
    
    console.log('Compte Admin créé (username: admin, password: admin123)');
  }
  
  // Vérifier si les sections existent déjà
  const sectionCount = db.prepare('SELECT COUNT(*) as count FROM sections').get();
  
  if (sectionCount.count === 0) {
    // Créer les sections Francophone et Anglophone
    db.prepare('INSERT INTO sections (nom) VALUES (?)').run('Francophone');
    db.prepare('INSERT INTO sections (nom) VALUES (?)').run('Anglophone');
    
    console.log('Sections créées : Francophone, Francohone');
  }
  
  // Vérifier si les paramètres existent déjà
  const paramCount = db.prepare('SELECT COUNT(*) as count FROM parametres').get();
  
  if (paramCount.count === 0) {
    // Créer les paramètres par défaut
    db.prepare(`
      INSERT INTO parametres (cle, valeur, description)
      VALUES (?, ?, ?)
    `).run('duree_validite_tranche_mois', '3', 'Durée de validité d\'une tranche en mois');
    
    console.log('Paramètres créés : duree_validite_tranche_mois = 3 mois');
  }
  
  console.log('Seed terminé avec succès');
}

module.exports = { seedDatabase };
