const { getDatabase } = require('../database/db');
const bcrypt = require('bcryptjs');
const journalService = require('./journal.service');

/**
 * Service de gestion des utilisateurs
 */
const utilisateursService = {
  /**
   * Met à jour les informations générales d'un utilisateur
   */
  updateProfile(userId, nom, username) {
    try {
      const db = getDatabase();
      
      const ancienUser = db.prepare('SELECT nom, username FROM utilisateurs WHERE id = ?').get(userId);
      
      // Vérifier si le username est déjà utilisé par un autre utilisateur
      const existingUser = db.prepare(`
        SELECT id FROM utilisateurs 
        WHERE username = ? AND id != ?
      `).get(username, userId);
      
      if (existingUser) {
        return { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé' };
      }
      
      // Mettre à jour l'utilisateur
      const result = db.prepare(`
        UPDATE utilisateurs 
        SET nom = ?, username = ?
        WHERE id = ?
      `).run(nom, username, userId);
      
      if (result.changes === 0) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      // Récupérer l'utilisateur mis à jour
      const utilisateur = db.prepare(`
        SELECT id, nom, username, role, actif
        FROM utilisateurs
        WHERE id = ?
      `).get(userId);
      
      journalService.enregistrerAction(
        userId,
        'MODIFICATION',
        `Profil modifié: Nom "${ancienUser?.nom}" → "${nom}", Username "${ancienUser?.username}" → "${username}"`
      );
      
      return { success: true, data: utilisateur };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil :', error);
      return { success: false, error: 'Erreur lors de la mise à jour du profil' };
    }
  },
  
  /**
   * Change le mot de passe d'un utilisateur
   */
  changePassword(userId, currentPassword, newPassword) {
    try {
      const db = getDatabase();
      
      // Récupérer l'utilisateur avec son hash de mot de passe actuel
      const utilisateur = db.prepare(`
        SELECT password_hash, nom, username FROM utilisateurs WHERE id = ?
      `).get(userId);
      
      if (!utilisateur) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      // Vérifier le mot de passe actuel
      const isPasswordValid = bcrypt.compareSync(currentPassword, utilisateur.password_hash);
      if (!isPasswordValid) {
        return { success: false, error: 'Mot de passe actuel incorrect' };
      }
      
      // Hasher le nouveau mot de passe
      const newPasswordHash = bcrypt.hashSync(newPassword, 10);
      
      // Mettre à jour le mot de passe
      const result = db.prepare(`
        UPDATE utilisateurs 
        SET password_hash = ?
        WHERE id = ?
      `).run(newPasswordHash, userId);
      
      if (result.changes === 0) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      journalService.enregistrerAction(
        userId,
        'MODIFICATION',
        `Mot de passe changé pour l'utilisateur: ${utilisateur.nom} (${utilisateur.username})`
      );
      
      return { success: true, message: 'Mot de passe changé avec succès' };
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe :', error);
      return { success: false, error: 'Erreur lors du changement de mot de passe' };
    }
  },
  
  /**
   * Récupère un utilisateur par son ID
   */
  getById(userId) {
    try {
      const db = getDatabase();
      const utilisateur = db.prepare(`
        SELECT id, nom, username, role, actif
        FROM utilisateurs
        WHERE id = ?
      `).get(userId);
      
      if (!utilisateur) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      return { success: true, data: utilisateur };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur :', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'utilisateur' };
    }
  }
};

module.exports = utilisateursService;
