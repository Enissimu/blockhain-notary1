import React, { useState, useEffect } from 'react';
import { FileText, Shield, Clock, CheckCircle, AlertCircle, Upload, Signature, Eye } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import DocumentVerify from './components/DocumentVerify';
import NotarizedDocuments from './components/NotarizedDocuments';
import Notification from './components/Notification';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [notification, setNotification] = useState(null);
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    // Check if backend is running
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        const data = await response.json();
        console.log('Backend health check:', data);
        
        setContractAddress(data.blockchain.contractAddress);
        
        if (data.blockchain.connected && data.blockchain.networkStatus === 'connected') {
          showNotification('Connected to blockchain notary service', 'success');
        } else if (data.blockchain.networkStatus === 'not configured') {
          showNotification('Backend connected but blockchain not configured', 'warning');
        } else {
          showNotification('Backend connected but blockchain unavailable', 'warning');
        }
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      showNotification('Backend service not available. Please start the server.', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const tabs = [
    { id: 'upload', label: 'Notarize Document', icon: Upload },
    { id: 'verify', label: 'Verify Document', icon: Eye },
    { id: 'documents', label: 'My Documents', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="glass-effect shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500 rounded-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Blockchain Notary</h1>
                <p className="text-sm text-gray-600">Secure document authentication on blockchain</p>
              </div>
            </div>
            
            {contractAddress && (
              <div className="hidden md:flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">
                  Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl min-h-[600px]">
          {activeTab === 'upload' && (
            <DocumentUpload onNotification={showNotification} />
          )}
          {activeTab === 'verify' && (
            <DocumentVerify onNotification={showNotification} />
          )}
          {activeTab === 'documents' && (
            <NotarizedDocuments onNotification={showNotification} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Immutable timestamps</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Blockchain secured</span>
            </div>
            <div className="flex items-center space-x-1">
              <Signature className="h-4 w-4" />
              <span>Digital signatures</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Powered by Ethereum • Smart Contract Technology
          </p>
        </div>
      </footer>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default App;
