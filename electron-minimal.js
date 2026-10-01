/**
 * TEST MINIMAL ELECTRON — AUCUN code de ton projet chargé.
 * Ouvre simplement une fenêtre bleue avec un message "✅ ELECTRON MARCHE !"
 * Durée de vie : 15 secondes puis fermeture automatique.
 *
 * Usage : node electron-minimal.js  (ou via npm run electron:minimal)
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Désactiver crashpad + autres sécurités pour ce test
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-gpu-compositing');

let win;
let timeoutId;

app.whenReady()
  .then(() => {
    console.log('✅ Electron app.whenReady() OK');
    try {
      win = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#007bff',
        title: 'TEST MINIMAL ELECTRON',
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      console.log('✅ BrowserWindow créé');

      win.once('ready-to-show', () => {
        console.log('🪟 ready-to-show → affichage fenêtre');
        win.show();
      });

      const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Test Minimal</title>
<style>
  body{margin:0;background:#007bff;color:#fff;font-family:Segoe UI,Arial,sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;}
  h1{font-size:42px;margin:0 0 20px;}
  p{font-size:18px;max-width:600px;text-align:center;line-height:1.5;opacity:.95;}
  .box{background:rgba(255,255,255,.12);padding:40px 60px;border-radius:16px;backdrop-filter:blur(4px);}
</style></head>
<body>
  <div class="box">
    <h1>✅ ELECTRON MARCHE !</h1>
    <p>Si tu vois ce message, Electron fonctionne parfaitement sur ton poste.<br>Cette fenêtre se ferme automatiquement dans <b id="s">15</b> secondes.</p>
  </div>
  <script>let n=15;const el=document.getElementById('s');setInterval(()=>{n--;el.textContent=n;if(n<=0)window.close();},1000);</script>
</body></html>`;

      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
        .then(() => console.log('✅ loadURL résolue'))
        .catch(err => console.error('❌ loadURL échouée :', err.message || err));

      timeoutId = setTimeout(() => {
        console.log('⏰ 15s écoulées — fermeture automatique');
        app.quit();
      }, 15000);

      win.on('closed', () => {
        console.log('🚪 Fenêtre fermée');
        if (timeoutId) clearTimeout(timeoutId);
        app.quit();
      });

    } catch (e) {
      console.error('💥 ERREUR pendant création fenêtre :', e.message);
      console.error(e.stack);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('💥 ERREUR app.whenReady() :', err);
    process.exit(1);
  });

app.on('window-all-closed', () => app.quit());
