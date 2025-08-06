import React, { useState, useEffect } from 'react';
import { Play, Square, Home, RotateCw, RotateCcw, Settings, Wifi, WifiOff, Zap } from 'lucide-react';

const StepperController = () => {
  // IP FIXE de l'ESP32
  const ESP32_IP = '192.168.1.100';
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState({
    isRunning: false,
    direction: 1,
    speed: 0,
    position: 0,
    targetPosition: 0
  });
  const [settings, setSettings] = useState({
    speed: 300,
    distance: 10
  });
  const [loading, setLoading] = useState(false);
  const [lastPing, setLastPing] = useState(null);

  // Test de connexion/ping
  const testConnection = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const response = await fetch(`http://${ESP32_IP}/api/ping`);
      const pingTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setLastPing(pingTime);
        console.log('Connexion OK - Ping:', pingTime + 'ms', data);
        // Récupérer le statut immédiatement après connexion
        updateStatus();
        return true;
      }
    } catch (error) {
      console.error('Erreur ping:', error);
    }
    setIsConnected(false);
    setLastPing(null);
    setLoading(false);
    return false;
  };

  // Appel API générique
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    if (!isConnected && endpoint !== 'ping') {
      alert('ESP32 non connecté! Testez la connexion d\'abord.');
      return null;
    }

    if (endpoint !== 'ping') setLoading(true);
    try {
      const config = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (data) config.body = JSON.stringify(data);

      const response = await fetch(`http://${ESP32_IP}/api/${endpoint}`, config);
      const result = await response.json();
      
      // Rafraîchir le statut après chaque action
      if (endpoint !== 'status' && endpoint !== 'ping') {
        setTimeout(updateStatus, 100);
      }
      
      return result;
    } catch (error) {
      console.error('Erreur API:', error);
      setIsConnected(false);
      return null;
    } finally {
      if (endpoint !== 'ping') setLoading(false);
    }
  };

  // Mise à jour du statut
  const updateStatus = async () => {
    if (isConnected) {
      const newStatus = await apiCall('status');
      if (newStatus) {
        setStatus(newStatus);
      }
    }
  };

  // Actions du moteur
  const stopMotor = () => apiCall('stop', 'POST');
  const homeMotor = () => apiCall('home', 'POST');
  
  const moveDistance = () => {
    const distance = settings.distance;
    apiCall('move', 'POST', { 
      distance: distance, 
      speed: settings.speed,
      direction: distance >= 0 ? 1 : 0
    });
  };
  
  const moveForward = () => apiCall('move', 'POST', { 
    continuous: true, 
    speed: settings.speed, 
    direction: 1 
  });
  
  const moveBackward = () => apiCall('move', 'POST', { 
    continuous: true, 
    speed: settings.speed, 
    direction: 0 
  });

  // Effet pour la mise à jour automatique du statut
  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(updateStatus, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  // Test de connexion au démarrage
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec connexion */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              🎛️ Stepper ESP32 Controller
            </h1>
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <Wifi className="text-green-500" size={24} />
              ) : (
                <WifiOff className="text-red-500" size={24} />
              )}
              <div className="text-right">
                <div className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? '✅ Connecté' : '❌ Déconnecté'}
                </div>
                {lastPing && (
                  <div className="text-sm text-gray-500">
                    Ping: {lastPing}ms
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info connexion */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>IP ESP32:</strong> {ESP32_IP} (fixe)
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Config:</strong> PULSE=Pin4, DIR=Pin2, 800steps/mm
                </p>
              </div>
              <button
                onClick={testConnection}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Zap size={16} className="mr-2" />
                {loading ? 'Test...' : 'Tester Ping'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statut du Moteur */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              📊 Statut Moteur
              <div className={`ml-3 w-3 h-3 rounded-full ${
                status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="font-medium">État:</span>
                <span className={`font-bold ${
                  status.isRunning ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.isRunning ? '🏃 En mouvement' : '⏹️ Arrêté'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="font-medium">Position:</span>
                <span className="font-mono font-bold text-blue-600">
                  {status.position?.toFixed(2)} mm
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="font-medium">Vitesse:</span>
                <span className="font-mono font-bold">
                  {status.speed?.toFixed(0)} mm/min
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="font-medium">Direction:</span>
                <span className="font-bold">
                  {status.direction === 1 ? '➡️ Avant' : '⬅️ Arrière'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="font-medium">Cible:</span>
                <span className="font-mono text-gray-600">
                  {status.targetPosition?.toFixed(2)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Contrôles */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              🎮 Contrôles
            </h2>

            {/* Paramètres */}
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-gray-700 flex items-center">
                <Settings size={18} className="mr-2" />
                Paramètres
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vitesse (mm/min)
                  </label>
                  <input
                    type="number"
                    value={settings.speed}
                    onChange={(e) => setSettings({...settings, speed: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="50"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance (mm)
                  </label>
                  <input
                    type="number"
                    value={settings.distance}
                    onChange={(e) => setSettings({...settings, distance: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Contrôles de mouvement */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700">Mouvements</h3>
              
              {/* Distance fixe */}
              <button
                onClick={moveDistance}
                disabled={loading || !isConnected}
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={18} className="mr-2" />
                Déplacer {settings.distance}mm
              </button>
              
              {/* Mouvements continus */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={moveForward}
                  disabled={loading || !isConnected}
                  className="flex items-center justify-center px-4 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCw size={18} className="mr-2" />
                  Avant Continu
                </button>
                <button
                  onClick={moveBackward}
                  disabled={loading || !isConnected}
                  className="flex items-center justify-center px-4 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw size={18} className="mr-2" />
                  Arrière Continu
                </button>
              </div>

              {/* Contrôles système */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <button
                  onClick={stopMotor}
                  disabled={loading || !isConnected}
                  className="flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Square size={18} className="mr-2" />
                  ARRÊT
                </button>
                <button
                  onClick={homeMotor}
                  disabled={loading || !isConnected}
                  className="flex items-center justify-center px-4 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Home size={18} className="mr-2" />
                  Reset Position
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec infos */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-600 text-sm">
            <p>🔧 Contrôleur stepper ESP32 - Configuration: 800 steps/mm</p>
            <p>⚠️ Assurez-vous que l'ESP32 et votre appareil sont sur le même réseau WiFi</p>
            {!isConnected && (
              <p className="text-red-600 font-medium mt-2">
                ❌ Vérifiez la connexion à l'ESP32
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepperController;