const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('🚀 Setting up Blockchain Notary Service...\n');

  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file...');
    const envExample = fs.readFileSync(path.join(__dirname, 'env.example'), 'utf8');
    fs.writeFileSync(envPath, envExample);
    console.log('✅ .env file created from env.example\n');
  }

  // Read current .env
  require('dotenv').config();

  console.log('🔍 Checking configuration...');
  
  const config = {
    networkUrl: process.env.NETWORK_URL || 'http://127.0.0.1:8545',
    contractAddress: process.env.CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY,
    port: process.env.PORT || 3000
  };

  console.log(`📡 Network URL: ${config.networkUrl}`);
  console.log(`📋 Contract Address: ${config.contractAddress || 'Not set'}`);
  console.log(`🔑 Private Key: ${config.privateKey ? 'Set' : 'Not set'}`);
  console.log(`🌐 API Port: ${config.port}\n`);

  // Test network connection
  console.log('🔌 Testing network connection...');
  try {
    const provider = new ethers.providers.JsonRpcProvider(config.networkUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`📦 Latest block: ${blockNumber}\n`);

    // Test wallet if private key is set
    if (config.privateKey) {
      const wallet = new ethers.Wallet(config.privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      
      console.log(`👤 Wallet Address: ${wallet.address}`);
      console.log(`💰 Wallet Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

      if (parseFloat(ethers.utils.formatEther(balance)) === 0) {
        console.log('⚠️  Warning: Wallet has no ETH for transactions');
        console.log('   You may need to fund your wallet for contract deployment and transactions\n');
      }
    } else {
      console.log('⚠️  Private key not set in .env file\n');
    }

  } catch (error) {
    console.error('❌ Network connection failed:', error.message);
    console.log('💡 Make sure your local blockchain node is running\n');
    console.log('   To start a local Hardhat node:');
    console.log('   npx hardhat node\n');
    return;
  }

  // Check if contract is deployed
  if (config.contractAddress) {
    console.log('🔍 Checking contract deployment...');
    try {
      const provider = new ethers.providers.JsonRpcProvider(config.networkUrl);
      const code = await provider.getCode(config.contractAddress);
      
      if (code === '0x') {
        console.log('❌ Contract not found at specified address');
        console.log('   The contract may not be deployed or the address is incorrect\n');
      } else {
        console.log('✅ Contract found and deployed\n');
      }
    } catch (error) {
      console.log('❌ Error checking contract:', error.message);
    }
  } else {
    console.log('📋 Contract address not set in .env file');
    console.log('   Deploy your contract and update CONTRACT_ADDRESS in .env\n');
    console.log('   To compile and deploy:');
    console.log('   npx hardhat compile');
    console.log('   npx hardhat run scripts/deploy.js --network localhost\n');
  }

  console.log('🎯 Next Steps:');
  console.log('1. Make sure your local blockchain is running: npx hardhat node');
  console.log('2. Deploy the contract: npx hardhat run scripts/deploy.js --network localhost');
  console.log('3. Update CONTRACT_ADDRESS and PRIVATE_KEY in .env file');
  console.log('4. Start the backend: npm start');
  console.log('5. Start the frontend: cd frontend && npm run dev\n');

  console.log('✨ Setup complete!');
}

// Run setup if called directly
if (require.main === module) {
  setup().catch(console.error);
}

module.exports = { setup }; 