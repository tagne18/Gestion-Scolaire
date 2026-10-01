const { getDatabase, executeSqlFile, initDatabase } = require('./db');
const path = require('path');

console.log('Initialisation de la base de données...');
initDatabase();

console.log('Création des tables si elles n\'existent pas...');
const schemaPath = path.join(__dirname, 'schema.sql');
executeSqlFile(schemaPath);

console.log('Exécution de la migration pour ajouter montant_inscription...');

try {
  // Exécuter la migration
  const migrationPath = path.join(__dirname, 'migration_montant_inscription.sql');
  executeSqlFile(migrationPath);

  console.log('Migration exécutée avec succès !');
  console.log('Le champ montant_inscription a été ajouté à la table tarifs_classe');
  console.log('Le champ montant_inscription a été ajouté à la table inscriptions');

  // Fermer la connexion
  const db = getDatabase();
  db.close();

  console.log('Base de données fermée');
} catch (error) {
  // Si l'erreur est "duplicate column name", c'est que la colonne existe déjà
  if (error.message.includes('duplicate column name')) {
    console.log('Les colonnes montant_inscription existent déjà. Migration ignorée.');
    const db = getDatabase();
    db.close();
    console.log('Base de données fermée');
  } else {
    console.error('Erreur lors de l\'exécution de la migration :', error);
    process.exit(1);
  }
}
