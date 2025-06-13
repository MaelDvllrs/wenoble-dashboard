import React, { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [installCheckMessage, setInstallCheckMessage] = useState('Vérification de l\'installation...');
  const [diagnostics, setDiagnostics] = useState([]);

  useEffect(() => {
    // Fonction pour ajouter un message de diagnostic
    const addDiagnostic = (message, type = 'info') => {
      setDiagnostics(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };
    
    // Vérifier pourquoi l'installation n'est pas proposée
    const checkInstallability = async () => {
      addDiagnostic("Début de la vérification d'installabilité");
      
      // Vérifier si en mode standalone (déjà installé)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        addDiagnostic("Application déjà installée (mode standalone)", "warning");
        setInstallCheckMessage('L\'application est déjà installée');
        return;
      }
      
      // Vérifier le support du service worker
      if (!('serviceWorker' in navigator)) {
        addDiagnostic("Service Worker non supporté par le navigateur", "error");
        setInstallCheckMessage('Votre navigateur ne supporte pas les PWA');
        return;
      }
      
      addDiagnostic("Service Worker supporté par le navigateur", "success");
      
      // Vérifier l'état du service worker
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) {
          addDiagnostic("Aucun Service Worker n'est enregistré", "error");
        } else {
          addDiagnostic(`${registrations.length} Service Worker(s) enregistré(s)`, "success");
          registrations.forEach((registration, i) => {
            addDiagnostic(`SW #${i+1} - Scope: ${registration.scope}, État: ${registration.active ? 'actif' : 'inactif'}`, "info");
          });
        }
      } catch (error) {
        addDiagnostic(`Erreur lors de la vérification des Service Workers: ${error}`, "error");
      }
      
      // Vérifier le manifeste
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        addDiagnostic("Aucun manifeste n'est défini dans le HTML", "error");
      } else {
        addDiagnostic(`Manifeste trouvé: ${manifestLink.href}`, "success");
        
        // Vérifier le contenu du manifeste
        try {
          const manifestResponse = await fetch(manifestLink.href);
          if (!manifestResponse.ok) {
            addDiagnostic(`Erreur de chargement du manifeste: ${manifestResponse.status}`, "error");
          } else {
            const manifest = await manifestResponse.json();
            addDiagnostic("Manifeste chargé avec succès", "success");
            
            // Vérifier les propriétés requises
            const requiredProps = [
              { name: 'name ou short_name', valid: !!(manifest.name || manifest.short_name) },
              { name: 'start_url', valid: !!manifest.start_url },
              { name: 'display', valid: !!manifest.display && ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display) },
              { name: 'icons', valid: !!(manifest.icons && manifest.icons.length > 0 && 
                manifest.icons.some(icon => icon.sizes === '192x192') && 
                manifest.icons.some(icon => icon.sizes === '512x512')) }
            ];
            
            requiredProps.forEach(prop => {
              addDiagnostic(
                `${prop.name}: ${prop.valid ? 'présent et valide' : 'manquant ou invalide'}`,
                prop.valid ? "success" : "error"
              );
            });
          }
        } catch (error) {
          addDiagnostic(`Erreur lors de l'analyse du manifeste: ${error}`, "error");
        }
      }
      
      // Vérifier si le site est servi en HTTPS
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      
      if (!isLocalhost && !isHttps) {
        addDiagnostic("Le site n'est pas servi en HTTPS", "error");
      } else {
        addDiagnostic(`Protocole sécurisé: ${isLocalhost ? 'localhost (exempté)' : 'HTTPS'}`, "success");
      }
    };
    
    checkInstallability();
    
    // Capturer l'événement d'installation
    const handler = (e) => {
      e.preventDefault();
      addDiagnostic("✅ Événement beforeinstallprompt déclenché", "success");
      setSupportsPWA(true);
      setPromptInstall(e);
      setInstallCheckMessage('Installation disponible');
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Ajouter un message de débogage si l'événement n'est pas déclenché après 3 secondes
    const debugTimer = setTimeout(() => {
      if (!promptInstall) {
        addDiagnostic("⚠️ Aucun événement beforeinstallprompt après 3 secondes", "warning");
        setInstallCheckMessage('Critères d\'installation non satisfaits');
      }
    }, 3000);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(debugTimer);
    };
  }, []);

  const handleInstallClick = (e) => {
    e.preventDefault();
    if (!promptInstall) {
      return;
    }
    
    promptInstall.prompt();
    
    promptInstall.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation');
      } else {
        console.log('Utilisateur a refusé l\'installation');
      }
      
      setPromptInstall(null);
    });
  };

  // Si le navigateur supporte l'installation ET que l'événement d'installation a été déclenché
  if (supportsPWA && promptInstall) {
    return (
      <button
        className="install-button"
        onClick={handleInstallClick}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: '#131417',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          fontWeight: 'bold',
          zIndex: 1000,
        }}
      >
        ⬇️ Installer l'application
      </button>
    );
  } else {
    // Afficher le diagnostic
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 15px',
        backgroundColor: '#f0f0f0',
        color: '#333',
        border: '1px solid #ccc',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: '14px',
        maxWidth: '350px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <p><strong>Diagnostic PWA:</strong> {installCheckMessage}</p>
        <div style={{ marginTop: '10px' }}>
          <strong>Journal de diagnostic:</strong>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0,
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {diagnostics.map((item, i) => (
              <li key={i} style={{ 
                padding: '4px 0',
                borderBottom: '1px solid #eee',
                color: item.type === 'error' ? 'red' : 
                       item.type === 'warning' ? 'orange' : 
                       item.type === 'success' ? 'green' : 'inherit'
              }}>
                <small>[{item.timestamp}]</small> {item.message}
              </li>
            ))}
          </ul>
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#777' }}>
          <small>
            Note: L'événement beforeinstallprompt peut ne pas se déclencher si tous les critères d'installation ne sont pas satisfaits ou si vous avez déjà refusé l'installation.
          </small>
        </p>
      </div>
    );
  }
};

export default InstallPWA;