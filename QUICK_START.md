# 🚀 Quick Start Guide - Blockchain Notary Service

This guide will help you get your blockchain notary service running seamlessly with frontend and backend connected.

## 📋 Prerequisites

- Node.js (v14+)
- npm or yarn
- Git

## 🎯 Quick Setup (5 minutes)

### Step 1: Initialize the Project
```bash
# Run the setup script to check configuration
npm run setup
```

### Step 2: Start Local Blockchain
```bash
# Open a new terminal window and run:
npx hardhat node
```
Keep this terminal open - it's your local blockchain network.

### Step 3: Deploy the Smart Contract
```bash
# In another terminal, compile and deploy the contract:
npm run compile
npm run deploy:localhost
```

After deployment, you'll see output like:
```
NotaryService deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 4: Configure Environment
Create a `.env` file (or copy from `env.example`):
```bash
NETWORK_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PORT=3000
NODE_ENV=development
```

> **Note**: The private key above is from Hardhat's default accounts (safe for local development only!)

### Step 5: Start the Backend
```bash
# Start the backend API server
npm start
```

You should see:
```
✅ Blockchain connection initialized successfully
📋 Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
🔗 Network: http://127.0.0.1:8545
👤 Wallet Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
🚀 Blockchain Notary Service API running on port 3000
```

### Step 6: Start the Frontend
```bash
# In a new terminal window:
cd frontend
npm install  # if not already done
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## ✅ Test the Connection

1. Open your browser to `http://localhost:5173`
2. You should see "Connected to blockchain notary service" notification
3. Upload a document and test the flow!

## 🔧 Troubleshooting

### Backend Issues

**Error: "Blockchain not available"**
- Make sure `npx hardhat node` is running
- Check that CONTRACT_ADDRESS and PRIVATE_KEY are set in `.env`
- Verify the contract is deployed

**Error: "Network connection failed"**
- Ensure Hardhat node is running on `http://127.0.0.1:8545`
- Check firewall settings

### Frontend Issues

**Error: "Backend service not available"**
- Make sure the backend is running on port 3000
- Check CORS configuration
- Verify the backend health endpoint: `http://localhost:3000/api/health`

### Contract Issues

**Error: "Contract not found"**
- Re-deploy the contract: `npm run deploy:localhost`
- Update CONTRACT_ADDRESS in `.env` file
- Make sure you're using the correct network

## 🎛️ Available Scripts

### Backend Scripts
- `npm run setup` - Check configuration and setup
- `npm start` - Start the backend server
- `npm run dev` - Start with nodemon (auto-restart)
- `npm run node` - Start local Hardhat blockchain
- `npm run compile` - Compile smart contracts
- `npm run deploy:localhost` - Deploy to local network

### Frontend Scripts
- `npm run frontend` - Start frontend development server
- `npm run build:frontend` - Build frontend for production

## 📊 System Architecture

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    Web3/Ethers    ┌─────────────────┐
│                 │ <=============> │                 │ <===============> │                 │
│   React Frontend │                │  Express Backend │                   │  Smart Contract │
│   (Port 5173)   │                │   (Port 3000)   │                   │   (Blockchain)  │
│                 │                │                 │                   │                 │
└─────────────────┘                └─────────────────┘                   └─────────────────┘
```

## 🔒 Security Notes

- The provided private key is only for local development
- Never use test private keys in production
- Always use proper environment variable management in production
- Consider implementing proper authentication for production use

## 🎉 You're Ready!

Your blockchain notary service is now running! You can:
- Upload and hash documents
- Notarize documents on the blockchain
- Verify document authenticity
- **Approve documents** (anyone can approve)
- **Sign documents** (if you're a required signer)
- Track document versions

### 🎯 Complete Document Workflow:

1. **Notarize** → Upload document, add metadata, notarize on blockchain
2. **Verify** → Check document exists and view details
3. **Approve** → Click "Approve Document" button in verification results
4. **Sign** → Click "Sign Document" button (only works if you're a required signer)
5. **Refresh** → Click "Refresh Status" to see updated counts

### 📱 Available Actions:

**In "Notarize Document" tab:**
- Upload files
- Generate document hashes
- Add metadata and required signers
- Submit to blockchain

**In "Verify Document" tab:**
- Verify by hash or file upload
- View document details (status, signatures, approvals)
- **NEW: Approve documents** ✅
- **NEW: Sign documents** ✍️
- **NEW: Refresh status** 🔄

**In "My Documents" tab:**
- View your notarized documents (coming soon)

For production deployment, refer to the deployment guides in the `deployment/` folder. 