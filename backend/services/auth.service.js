const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/db');
const journalService = require('./journal.service');

/**
 * Service d'authentification
 */
const authService = {
  /**
   * Vérifie les identifiants de connexion
   * @param {string} username - Nom d'utilisateur
   * @param {string} password - Mot de passe en clair
   * @returns {Object} - { success: boolean, user?: object, error?: string }
   */
  login(username, password) {
    try {
      const db = getDatabase();
      
      // Récupérer l'utilisateur
      const user = db.prepare(`
        SELECT id, nom, username, password_hash, role, actif
        FROM utilisateurs
        WHERE username = ?
      `).get(username);
      
      if (!user) {
        return { success: false, error: 'Identifiants incorrects' };
      }
      
      if (!user.actif) {
        return { success: false, error: 'Compte désactivé' };
      }
      
      // Vérifier le mot de passe
      const passwordMatch = bcrypt.compareSync(password, user.password_hash);
      
      if (!passwordMatch) {
        return { success: false, error: 'Identifiants incorrects' };
      }
      
      // Retourner les infos utilisateur (sans le hash)
      const { password_hash, ...userWithoutPassword } = user;
      
      // Enregistrer la connexion dans le journal
      journalService.enregistrerAction(
        user.id,
        'CONNEXION',
        `Connexion de ${user.nom} (${user.username}) - Rôle: ${user.role}`
      );
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      return { success: false, error: 'Erreur lors de la connexion' };
    }
  },

  /**
   * Vérifie le mot de passe pour un utilisateur donné
   * @param {number} userId - ID de l'utilisateur
   * @param {string} password - Mot de passe en clair à vérifier
   * @returns {Object} - { success: boolean, error?: string }
   */
  verifyPassword(userId, password) {
    try {
      const db = getDatabase();
      
      // Récupérer l'utilisateur
      const user = db.prepare(`
        SELECT id, password_hash, role, actif
        FROM utilisateurs
        WHERE id = ?
      `).get(userId);
      
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      if (!user.actif) {
        return { success: false, error: 'Compte désactivé' };
      }
      
      // Vérifier le mot de passe
      const passwordMatch = bcrypt.compareSync(password, user.password_hash);
      
      if (!passwordMatch) {
        return { success: false, error: 'Mot de passe incorrect' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la vérification du mot de passe :', error);
      return { success: false, error: 'Erreur lors de la vérification du mot de passe' };
    }
  }
};

module.exports = authService;
