const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    const resRateLimiter = await rateLimiter.consume(req.ip);
    res.set({
      'Retry-After': Math.round(resRateLimiter.msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': 100,
      'X-RateLimit-Remaining': resRateLimiter.remainingHits || 0,
      'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext)
    });
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: secs
    });
  }
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types but limit size
    cb(null, true);
  }
});

// Blockchain configuration
const NETWORK_URL = process.env.NETWORK_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Contract ABI (simplified for main functions)
const CONTRACT_ABI = [
  "function notarizeDocument(bytes32 _documentHash, string memory _metadata, address[] memory _requiredSigners) external",
  "function signDocument(bytes32 _documentHash) external",
  "function approveDocument(bytes32 _documentHash) external",
  "function rejectDocument(bytes32 _documentHash, string memory _reason) external",
  "function verifyDocument(bytes32 _documentHash) external view returns (bool exists, address notary, uint256 timestamp, uint8 status, uint256 signerCount, uint256 approverCount)",
  "function createDocumentVersion(bytes32 _originalHash, bytes32 _newVersionHash, string memory _changeDescription) external",
  "function getDocumentVersions(bytes32 _originalHash) external view returns (tuple(bytes32 documentHash, uint256 version, bytes32 previousVersionHash, address creator, uint256 timestamp, string changeDescription, bool isLatest)[])",
  "function getLatestVersion(bytes32 _originalHash) external view returns (bytes32)",
  "function getRequiredSigners(bytes32 _documentHash) external view returns (address[])",
  "function hasSigned(bytes32 _documentHash, address _signer) external view returns (bool)",
  "function getDocumentMetadata(bytes32 _documentHash) external view returns (string)",
  "function addNotary(address _notary) external",
  "function removeNotary(address _notary) external",
  "function owner() external view returns (address)",
  "function totalDocuments() external view returns (uint256)"
];

// Initialize provider and contract
let provider, contract, wallet;

function initializeBlockchain() {
  try {
    provider = new ethers.providers.JsonRpcProvider(NETWORK_URL);
    
    if (PRIVATE_KEY && CONTRACT_ADDRESS) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      console.log('✅ Blockchain connection initialized successfully');
      console.log('📋 Contract Address:', CONTRACT_ADDRESS);
      console.log('🔗 Network:', NETWORK_URL);
    } else {
      console.log('⚠️  Warning: Contract address or private key not provided. Some features will be limited.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize blockchain connection:', error.message);
  }
}

// Helper functions
function calculateFileHash(fileBuffer) {
  return '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function validateEthereumAddress(address) {
  return ethers.utils.isAddress(address);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    blockchain: {
      connected: !!contract,
      contractAddress: CONTRACT_ADDRESS,
      network: NETWORK_URL
    }
  });
});

// Upload and hash document
app.post('/api/documents/hash', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileHash = calculateFileHash(req.file.buffer);
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      hash: fileHash,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Document hashed successfully',
      data: fileInfo
    });
  } catch (error) {
    console.error('Error hashing document:', error);
    res.status(500).json({ error: 'Failed to hash document' });
  }
});

// Notarize document
app.post('/api/documents/notarize', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { documentHash, metadata, requiredSigners } = req.body;

    if (!documentHash || !metadata) {
      return res.status(400).json({ error: 'Document hash and metadata are required' });
    }

    // Validate Ethereum addresses
    const signers = requiredSigners || [];
    for (const signer of signers) {
      if (!validateEthereumAddress(signer)) {
        return res.status(400).json({ error: `Invalid Ethereum address: ${signer}` });
      }
    }

    const tx = await contract.notarizeDocument(documentHash, metadata, signers);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document notarized successfully',
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        documentHash,
        metadata,
        requiredSigners: signers
      }
    });
  } catch (error) {
    console.error('Error notarizing document:', error);
    res.status(500).json({ 
      error: 'Failed to notarize document',
      details: error.message 
    });
  }
});

// Verify document
app.get('/api/documents/:hash/verify', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const result = await contract.verifyDocument(hash);

    const statusNames = ['PENDING', 'SIGNED', 'APPROVED', 'REJECTED', 'ARCHIVED'];
    
    res.json({
      success: true,
      data: {
        exists: result.exists,
        notary: result.notary,
        timestamp: new Date(result.timestamp.toNumber() * 1000).toISOString(),
        status: statusNames[result.status],
        signerCount: result.signerCount.toNumber(),
        approverCount: result.approverCount.toNumber(),
        documentHash: hash
      }
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ 
      error: 'Failed to verify document',
      details: error.message 
    });
  }
});

// Sign document
app.post('/api/documents/:hash/sign', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const tx = await contract.signDocument(hash);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document signed successfully',
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        documentHash: hash
      }
    });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ 
      error: 'Failed to sign document',
      details: error.message 
    });
  }
});

// Approve document
app.post('/api/documents/:hash/approve', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const tx = await contract.approveDocument(hash);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document approved successfully',
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        documentHash: hash
      }
    });
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({ 
      error: 'Failed to approve document',
      details: error.message 
    });
  }
});

// Reject document
app.post('/api/documents/:hash/reject', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const tx = await contract.rejectDocument(hash, reason);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document rejected successfully',
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        documentHash: hash,
        reason
      }
    });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ 
      error: 'Failed to reject document',
      details: error.message 
    });
  }
});

// Create document version
app.post('/api/documents/:originalHash/versions', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { originalHash } = req.params;
    const { newVersionHash, changeDescription } = req.body;

    if (!newVersionHash || !changeDescription) {
      return res.status(400).json({ error: 'New version hash and change description are required' });
    }

    const tx = await contract.createDocumentVersion(originalHash, newVersionHash, changeDescription);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document version created successfully',
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        originalHash,
        newVersionHash,
        changeDescription
      }
    });
  } catch (error) {
    console.error('Error creating document version:', error);
    res.status(500).json({ 
      error: 'Failed to create document version',
      details: error.message 
    });
  }
});

// Get document versions
app.get('/api/documents/:hash/versions', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const versions = await contract.getDocumentVersions(hash);

    const formattedVersions = versions.map(version => ({
      documentHash: version.documentHash,
      version: version.version.toNumber(),
      previousVersionHash: version.previousVersionHash,
      creator: version.creator,
      timestamp: new Date(version.timestamp.toNumber() * 1000).toISOString(),
      changeDescription: version.changeDescription,
      isLatest: version.isLatest
    }));

    res.json({
      success: true,
      data: {
        documentHash: hash,
        versions: formattedVersions,
        totalVersions: formattedVersions.length
      }
    });
  } catch (error) {
    console.error('Error getting document versions:', error);
    res.status(500).json({ 
      error: 'Failed to get document versions',
      details: error.message 
    });
  }
});

// Get document metadata
app.get('/api/documents/:hash/metadata', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const metadata = await contract.getDocumentMetadata(hash);

    res.json({
      success: true,
      data: {
        documentHash: hash,
        metadata
      }
    });
  } catch (error) {
    console.error('Error getting document metadata:', error);
    res.status(500).json({ 
      error: 'Failed to get document metadata',
      details: error.message 
    });
  }
});

// Get required signers
app.get('/api/documents/:hash/signers', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const { hash } = req.params;
    const signers = await contract.getRequiredSigners(hash);

    res.json({
      success: true,
      data: {
        documentHash: hash,
        requiredSigners: signers,
        signerCount: signers.length
      }
    });
  } catch (error) {
    console.error('Error getting required signers:', error);
    res.status(500).json({ 
      error: 'Failed to get required signers',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Initialize blockchain connection
initializeBlockchain();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blockchain Notary Service API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app; 