import React, { useState, useRef } from 'react';
import { Upload, FileText, Hash, Users, Send, Loader, CheckCircle } from 'lucide-react';
import axios from 'axios';

const DocumentUpload = ({ onNotification }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [metadata, setMetadata] = useState('');
  const [requiredSigners, setRequiredSigners] = useState(['']);
  const [isHashing, setIsHashing] = useState(false);
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [notarized, setNotarized] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileHash('');
      setNotarized(false);
      onNotification(`Selected file: ${file.name}`, 'info');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setFileHash('');
      setNotarized(false);
      onNotification(`Selected file: ${file.name}`, 'info');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const hashDocument = async () => {
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
        setFileHash(response.data.data.hash);
        onNotification('Document hashed successfully', 'success');
      }
    } catch (error) {
      onNotification('Failed to hash document', 'error');
      console.error('Hashing error:', error);
    } finally {
      setIsHashing(false);
    }
  };

  const notarizeDocument = async () => {
    if (!fileHash || !metadata.trim()) {
      onNotification('Please hash the document and provide metadata', 'error');
      return;
    }

    setIsNotarizing(true);
    
    // Filter out empty signer addresses
    const validSigners = requiredSigners.filter(signer => signer.trim() !== '');

    try {
      const response = await axios.post('http://localhost:3000/api/documents/notarize', {
        documentHash: fileHash,
        metadata: metadata.trim(),
        requiredSigners: validSigners,
      });

      if (response.data.success) {
        setNotarized(true);
        onNotification('Document notarized successfully on blockchain!', 'success');
      }
    } catch (error) {
      onNotification('Failed to notarize document', 'error');
      console.error('Notarization error:', error);
    } finally {
      setIsNotarizing(false);
    }
  };

  const addSignerField = () => {
    setRequiredSigners([...requiredSigners, '']);
  };

  const updateSigner = (index, value) => {
    const updated = [...requiredSigners];
    updated[index] = value;
    setRequiredSigners(updated);
  };

  const removeSigner = (index) => {
    if (requiredSigners.length > 1) {
      const updated = requiredSigners.filter((_, i) => i !== index);
      setRequiredSigners(updated);
    }
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Notarize Document</h2>
          <p className="text-gray-600">Upload and permanently record your document on the blockchain</p>
        </div>

        {/* File Upload Area */}
        <div className="mb-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="file-upload-area border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer bg-gray-50"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setFileHash('');
                    setNotarized(false);
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Upload Document</p>
                  <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hash Document Section */}
        {selectedFile && !fileHash && (
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Hash className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900">Generate Document Hash</h3>
                  <p className="text-sm text-gray-600">Create a unique fingerprint for your document</p>
                </div>
              </div>
              <button
                onClick={hashDocument}
                disabled={isHashing}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isHashing ? <Loader className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                <span>{isHashing ? 'Hashing...' : 'Generate Hash'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Document Hash Display */}
        {fileHash && (
          <div className="mb-8 p-6 bg-green-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">Document Hash Generated</h3>
                <p className="text-sm font-mono bg-white p-3 rounded border break-all">{fileHash}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata and Signers */}
        {fileHash && (
          <div className="space-y-6 mb-8">
            {/* Metadata */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Metadata *
              </label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder="Enter document description, purpose, or any relevant information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Required Signers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Required Signers (Optional)
                </label>
                <button
                  onClick={addSignerField}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  + Add Signer
                </button>
              </div>
              
              <div className="space-y-2">
                {requiredSigners.map((signer, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={signer}
                      onChange={(e) => updateSigner(index, e.target.value)}
                      placeholder="0x... (Ethereum address)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {requiredSigners.length > 1 && (
                      <button
                        onClick={() => removeSigner(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notarize Button */}
        {fileHash && (
          <div className="text-center">
            <button
              onClick={notarizeDocument}
              disabled={isNotarizing || !metadata.trim() || notarized}
              className="bg-primary-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {isNotarizing ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : notarized ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>
                {isNotarizing ? 'Notarizing...' : notarized ? 'Notarized!' : 'Notarize on Blockchain'}
              </span>
            </button>
          </div>
        )}

        {notarized && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-green-900 mb-2">Document Successfully Notarized!</h3>
            <p className="text-green-700">
              Your document has been permanently recorded on the blockchain and can now be verified by anyone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload; 