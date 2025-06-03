import React, { useState, useEffect } from 'react';
import { FileText, Clock, User, Eye, Signature, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const NotarizedDocuments = ({ onNotification }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // In a real app, you would fetch user's notarized documents
      // For now, we'll create some mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const mockDocuments = [
        {
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          metadata: 'Contract Agreement for Software Development Services',
          timestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
          notary: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          status: 1, // Approved
          signerCount: 2,
          approverCount: 1,
          requiredSigners: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8']
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef12',
          metadata: 'Identity Verification Document',
          timestamp: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
          notary: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          status: 0, // Pending
          signerCount: 0,
          approverCount: 0,
          requiredSigners: ['0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC']
        }
      ];
      
      setDocuments(mockDocuments);
      onNotification('Documents loaded successfully', 'success');
    } catch (error) {
      onNotification('Failed to load documents', 'error');
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      0: { 
        label: 'Pending', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertCircle,
        iconColor: 'text-yellow-500'
      },
      1: { 
        label: 'Approved', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-500'
      },
      2: { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        iconColor: 'text-red-500'
      },
    };
    
    return statusMap[status] || { 
      label: 'Unknown', 
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: AlertCircle,
      iconColor: 'text-gray-500'
    };
  };

  const openDocumentDetails = (document) => {
    setSelectedDocument(document);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDocument(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    onNotification('Copied to clipboard', 'success');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Notarized Documents</h2>
            <p className="text-gray-600">View and manage your blockchain-notarized documents</p>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
            <span className="ml-3 text-lg text-gray-600">Loading documents...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Notarized Documents</h2>
            <p className="text-gray-600">View and manage your blockchain-notarized documents</p>
          </div>
          
          <button
            onClick={fetchDocuments}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600">
              You haven't notarized any documents yet. Start by uploading a document in the "Notarize Document" tab.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document, index) => {
              const statusInfo = getStatusInfo(document.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={document.hash}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDocumentDetails(document)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileText className="h-5 w-5 text-primary-500" />
                        <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
                          {document.metadata}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.iconColor}`} />
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(document.timestamp)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>
                            {document.notary.slice(0, 6)}...{document.notary.slice(-4)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Signature className="h-4 w-4" />
                          <span>
                            {document.signerCount}/{document.requiredSigners.length} signatures
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded">
                        Hash: {document.hash}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Document Details Modal */}
        {showModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Document Details</h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Hash</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-mono bg-gray-50 p-3 rounded border flex-1 break-all">
                        {selectedDocument.hash}
                      </p>
                      <button
                        onClick={() => copyToClipboard(selectedDocument.hash)}
                        className="px-3 py-2 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Metadata</label>
                    <p className="text-sm bg-gray-50 p-3 rounded border">
                      {selectedDocument.metadata}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const statusInfo = getStatusInfo(selectedDocument.status);
                          const StatusIcon = statusInfo.icon;
                          return (
                            <>
                              <StatusIcon className={`h-4 w-4 ${statusInfo.iconColor}`} />
                              <span className="text-sm">{statusInfo.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notarized By</label>
                      <p className="text-sm font-mono">{selectedDocument.notary}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timestamp</label>
                      <p className="text-sm">{formatDate(selectedDocument.timestamp)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Signatures</label>
                      <p className="text-sm">
                        {selectedDocument.signerCount} of {selectedDocument.requiredSigners.length} required
                      </p>
                    </div>
                  </div>
                  
                  {selectedDocument.requiredSigners.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Required Signers</label>
                      <div className="space-y-2">
                        {selectedDocument.requiredSigners.map((signer, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-mono">{signer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedDocument.hash)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Copy Hash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotarizedDocuments; 