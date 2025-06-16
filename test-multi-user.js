const { ethers } = require("hardhat");
const axios = require('axios');
require('dotenv').config();

async function testMultiUserWorkflow() {
  console.log('🧪 Testing Multi-User Sign & Approve Workflow\n');

  // Get different wallet accounts
  const [owner, account1, account2, account3] = await ethers.getSigners();
  
  console.log('👥 Available Accounts:');
  console.log(`Owner: ${owner.address}`);
  console.log(`Account 1: ${account1.address}`);
  console.log(`Account 2: ${account2.address}`);
  console.log(`Account 3: ${account3.address}\n`);

  // Step 1: Create a document with required signers
  const DOCUMENT_HASH = '0x' + '1234567890abcdef'.repeat(4); // Mock hash
  const metadata = 'Multi-user test contract';
  const requiredSigners = [account2.address, account3.address]; // Account2 and Account3 must sign

  console.log('📝 Step 1: Simulating document notarization...');
  console.log(`Document Hash: ${DOCUMENT_HASH}`);
  console.log(`Required Signers: ${requiredSigners.join(', ')}\n`);

  // Step 2: Test approvals from different accounts
  console.log('👍 Step 2: Testing approvals from different accounts...');
  
  const accountsToTest = [
    { name: 'Owner', address: owner.address },
    { name: 'Account 1', address: account1.address },
    { name: 'Account 2', address: account2.address }
  ];

  for (const account of accountsToTest) {
    try {
      // Simulate approval by temporarily changing backend wallet
      console.log(`  Trying approval from ${account.name} (${account.address})...`);
      
      // In real scenario, each user would have their own wallet
      const response = await axios.post(`http://localhost:3000/api/documents/${DOCUMENT_HASH}/approve`);
      
      if (response.data.success) {
        console.log(`  ✅ ${account.name} approved successfully!`);
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('Already approved')) {
        console.log(`  ⚠️  ${account.name} already approved this document`);
      } else if (error.response?.data?.error?.includes('Document does not exist')) {
        console.log(`  ❌ Document not found - you need to notarize a real document first`);
        break;
      } else {
        console.log(`  ❌ ${account.name} approval failed:`, error.response?.data?.error || error.message);
      }
    }
  }

  console.log('\n🔍 Current Document State:');
  try {
    const verifyResponse = await axios.get(`http://localhost:3000/api/documents/${DOCUMENT_HASH}/verify`);
    if (verifyResponse.data.success && verifyResponse.data.data.exists) {
      const doc = verifyResponse.data.data;
      console.log(`  Status: ${doc.status}`);
      console.log(`  Signatures: ${doc.signerCount}`);
      console.log(`  Approvals: ${doc.approverCount}`);
    }
  } catch (error) {
    console.log('  Document not found - use a real document hash from your notarization');
  }

  console.log('\n💡 Key Insights:');
  console.log('  • Each address can only approve ONCE per document');
  console.log('  • Only designated "required signers" can sign documents');
  console.log('  • Your backend uses a single wallet, so it can only approve once');
  console.log('  • In production, each user would have their own wallet/private key');
}

console.log('🚀 Multi-User Blockchain Notary Test');
console.log('='.repeat(50));
console.log('📝 Instructions:');
console.log('1. Make sure your backend is running (npm start)');
console.log('2. Replace DOCUMENT_HASH with a real hash from your notarization');
console.log('3. Run: npx hardhat run test-multi-user.js --network localhost');
console.log('='.repeat(50));
console.log();

testMultiUserWorkflow().catch(console.error); 