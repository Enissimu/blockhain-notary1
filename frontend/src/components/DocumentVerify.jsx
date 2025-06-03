import React, { useState, useRef } from 'react';
import { Search, FileText, Hash, CheckCircle, XCircle, Clock, User, Loader, Upload } from 'lucide-react';
import axios from 'axios';

const DocumentVerify = ({ onNotification }) => {
  const [verificationMethod, setVerificationMethod] = useState('hash'); // 'hash' or 'file'
  const [documentHash, setDocumentHash] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setVerificationResult(null);
      onNotification(`Selected file: ${file.name}`, 'info');
    }
  };

  const hashFileForVerification = async () => {
    if (!selectedFile) {
      onNotification('Please select a file first', 'error');
      return;
    }

    setIsHashing(true);
    const formData = new FormData();
    formData.append('document', selectedFile);

    try {
      const response = await axios.post('http://localhost:3000/api/documents/hash', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const hash = response.data.data.hash;
        setDocumentHash(hash);
        onNotification('File hashed successfully', 'success');
        // Automatically verify after hashing
        verifyDocument(hash);
      }
    } catch (error) {
      onNotification('Failed to hash file', 'error');
      console.error('Hashing error:', error);
    } finally {
      setIsHashing(false);
    }
  };

  const verifyDocument = async (hashToVerify = documentHash) => {
    if (!hashToVerify || !hashToVerify.trim()) {
      onNotification('Please provide a document hash', 'error');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await axios.get(`http://localhost:3000/api/documents/verify/${hashToVerify}`);
      
      if (response.data.success) {
        setVerificationResult(response.data.data);
        if (response.data.data.exists) {
          onNotification('Document verification completed', 'success');
        } else {
          onNotification('Document not found on blockchain', 'warning');
        }
      }
    } catch (error) {
      onNotification('Failed to verify document', 'error');
      console.error('Verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      1: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      2: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    };
    
    const statusInfo = statusMap[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Document</h2>
          <p className="text-gray-600">Check if a document has been notarized on the blockchain</p>
        </div>

        {/* Verification Method Toggle */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 p-1 rounded-lg inline-flex">
              <button
                onClick={() => {
                  setVerificationMethod('hash');
                  setSelectedFile(null);
                  setVerificationResult(null);
                }}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  verificationMethod === 'hash'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Hash className="h-4 w-4 inline mr-2" />
                Verify by Hash
              </button>
              <button
                onClick={() => {
                  setVerificationMethod('file');
                  setDocumentHash('');
                  setVerificationResult(null);
                }}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  verificationMethod === 'file'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Verify by File
              </button>
            </div>
          </div>
        </div>

        {/* Hash Input Method */}
        {verificationMethod === 'hash' && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Hash
            </label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder="0x... (Enter the document hash)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => verifyDocument()}
                disabled={isVerifying || !documentHash.trim()}
                className="bg-primary-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isVerifying ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
              </button>
            </div>
          </div>
        )}

        {/* File Upload Method */}
        {verificationMethod === 'file' && (
          <div className="mb-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="h-12 w-12 text-primary-500 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={hashFileForVerification}
                      disabled={isHashing}
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isHashing ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>{isHashing ? 'Verifying...' : 'Verify File'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setDocumentHash('');
                        setVerificationResult(null);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Upload File to Verify</p>
                    <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Results */}
        {verificationResult && (
          <div className="mt-8">
            {verificationResult.exists ? (
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-start space-x-3 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-medium text-green-900">Document Verified ✓</h3>
                    <p className="text-green-700 text-sm">This document has been notarized on the blockchain</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Hash</label>
                      <p className="text-sm font-mono bg-white p-2 rounded border break-all">
                        {documentHash || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notarized By</label>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-mono">
                          {verificationResult.notary.slice(0, 6)}...{verificationResult.notary.slice(-4)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <p className="text-sm">{formatDate(verificationResult.timestamp)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      {getStatusBadge(verificationResult.status)}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Signatures</label>
                      <p className="text-sm">{verificationResult.signerCount} signature(s)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Approvals</label>
                      <p className="text-sm">{verificationResult.approverCount} approval(s)</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-medium text-red-900">Document Not Found</h3>
                    <p className="text-red-700 text-sm mt-1">
                      This document has not been notarized on the blockchain or the hash is incorrect.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm text-red-600">
                        <strong>Searched Hash:</strong> <br />
                        <span className="font-mono">{documentHash}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h4 className="font-medium text-blue-900 mb-2">How Document Verification Works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Each document gets a unique cryptographic hash (fingerprint)</li>
            <li>• The hash is stored permanently on the blockchain with timestamp</li>
            <li>• Anyone can verify a document's authenticity using its hash</li>
            <li>• If the document is modified, its hash will change completely</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DocumentVerify; 