/**
 * Utilitaires pour la gestion des années scolaires
 */

/**
 * Retourne l'année scolaire courante au format "YYYY/YYYY"
 * Basé sur la date actuelle : si mois >= 9, année en cours/année+1, sinon année-1/année en cours
 * @returns {string} - Année scolaire au format "2025/2026"
 */
function getAnneeScolaireCourante() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth() + 1; // getMonth() retourne 0-11
  
  if (mois >= 9) {
    // À partir de septembre, on est dans l'année scolaire année/année+1
    return `${annee}/${annee + 1}`;
  } else {
    // Avant septembre, on est dans l'année scolaire année-1/année
    return `${annee - 1}/${annee}`;
  }
}

/**
 * Parse une année scolaire au format "YYYY/YYYY" et retourne l'année de début
 * @param {string} anneeScolaire - Année scolaire au format "2025/2026"
 * @returns {number} - Année de début (2025)
 */
function parseAnneeScolaire(anneeScolaire) {
  const parts = anneeScolaire.split('/');
  return parseInt(parts[0]);
}

module.exports = {
  getAnneeScolaireCourante,
  parseAnneeScolaire
};
