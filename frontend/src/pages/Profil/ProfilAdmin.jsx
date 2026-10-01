import React, { useState, useEffect } from 'react';
import api from '../../api/ipcClient';

function ProfilAdmin({ user, onUserUpdate }) {
  const [profileForm, setProfileForm] = useState({
    nom: '',
    username: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        nom: user.nom,
        username: user.username
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.utilisateurs.updateProfile(
        user.id,
        profileForm.nom,
        profileForm.username
      );

      if (result.success) {
        setSuccess('Profil mis à jour avec succès');
        if (onUserUpdate) {
          onUserUpdate(result.data);
        }
      } else {
        setError(result.error || 'Erreur lors de la mise à jour du profil');
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour du profil');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation frontend
    if (!passwordForm.currentPassword) {
      setPasswordError('Veuillez saisir votre mot de passe actuel');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('Veuillez saisir un nouveau mot de passe');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const result = await api.utilisateurs.changePassword(
        user.id,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        setPasswordSuccess('Mot de passe changé avec succès');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      setPasswordError('Erreur lors du changement de mot de passe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess('');
    
    try {
      const result = await api.backup.save();
      
      if (result.success) {
        setBackupSuccess(`Sauvegarde réussie : ${result.filePath}`);
      } else if (!result.canceled) {
        setBackupSuccess(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setBackupSuccess('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>Mon Profil</h1>

      {/* Section Informations générales */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#007bff' }}>Informations générales</h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Nom
            </label>
            <input
              type="text"
              value={profileForm.nom}
              onChange={(e) => setProfileForm({ ...profileForm, nom: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              required
            />
            <p style={{
              marginTop: '5px',
              fontSize: '12px',
              color: '#dc3545',
              fontStyle: 'italic'
            }}>
              ⚠️ Attention : ceci est votre identifiant de connexion, notez bien le nouveau si vous le modifiez
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Rôle
            </label>
            <input
              type="text"
              value={user?.role || ''}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: '#666'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Section Changement de mot de passe */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#007bff' }}>Changement de mot de passe</h2>

        {passwordError && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Changement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>

      {/* Section Sauvegarde */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#007bff' }}>Sauvegarde manuelle</h2>

        {backupSuccess && (
          <div style={{
            backgroundColor: backupSuccess.includes('réussie') ? '#d4edda' : '#f8d7da',
            color: backupSuccess.includes('réussie') ? '#155724' : '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {backupSuccess}
          </div>
        )}

        <p style={{ marginBottom: '15px', color: '#666' }}>
          Créez une sauvegarde manuelle de la base de données. Le fichier sera horodaté et enregistré à l'emplacement de votre choix.
        </p>

        <button
          onClick={handleBackup}
          disabled={backupLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: backupLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {backupLoading ? 'Sauvegarde...' : '💾 Sauvegarder maintenant'}
        </button>
      </div>
    </div>
  );
}

export default ProfilAdmin;
