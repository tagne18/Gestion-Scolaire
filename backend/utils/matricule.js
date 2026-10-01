const { getDatabase } = require('../database/db');

/**
 * Utilitaire de génération de matricules
 * Format : ANNÉE + SECTION + SÉQUENCE
 * Exemple : 25FR0001 (2025, Francophone, séquence 0001)
 */

/**
 * Génère un nouveau matricule pour un élève
 * @param {string} section - Code de la section (FR ou AN)
 * @returns {string} - Le matricule généré
 */
function genererMatricule(section) {
  const db = getDatabase();
  
  // Extraire l'année courante (2 derniers chiffres)
  const annee = new Date().getFullYear().toString().slice(-2);
  
  // Déterminer le code section
  const codeSection = section.toUpperCase() === 'ANGLOPHONE' ? 'AN' : 'FR';
  
  // Récupérer la dernière séquence pour cette année et cette section
  const prefixe = `${annee}${codeSection}`;
  const dernierMatricule = db.prepare(`
    SELECT matricule FROM eleves
    WHERE matricule LIKE ?
    ORDER BY matricule DESC
    LIMIT 1
  `).get(`${prefixe}%`);
  
  let sequence = 1;
  
  if (dernierMatricule) {
    // Extraire la séquence du dernier matricule
    const derniereSequence = parseInt(dernierMatricule.matricule.slice(-4));
    sequence = derniereSequence + 1;
  }
  
  // Formater la séquence sur 4 chiffres avec zéros initiaux
  const sequenceFormatee = sequence.toString().padStart(4, '0');
  
  return `${prefixe}${sequenceFormatee}`;
}

module.exports = { genererMatricule };
