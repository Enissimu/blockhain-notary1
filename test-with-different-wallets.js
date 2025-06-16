const { ethers } = require("hardhat");
require('dotenv').config();

async function testWithDifferentWallets() {
  console.log('🧪 Testing Sign & Approve with Different Wallets\n');

  // Get contract
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const NotaryService = await ethers.getContractFactory("NotaryService");
  const contract = NotaryService.attach(contractAddress);

  // Get different accounts
  const [owner, account1, account2, account3] = await ethers.getSigners();
  
  console.log('👥 Available Wallets:');
  console.log(`Owner (Notary): ${owner.address}`);
  console.log(`Account 1: ${account1.address}`);
  console.log(`Account 2: ${account2.address}`);
  console.log(`Account 3: ${account3.address}\n`);

  // Step 1: Notarize a document with required signers
  const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`Test document ${Date.now()}`));
  const metadata = 'Test contract requiring signatures';
  const requiredSigners = [account2.address, account3.address]; // Account2 and Account3 must sign

  console.log('📝 Step 1: Notarizing document...');
  console.log(`Document Hash: ${documentHash}`);
  console.log(`Required Signers: ${requiredSigners.join(', ')}`);

  try {
    // Authorize the owner as notary first
    await contract.connect(owner).addNotary(owner.address);
    console.log('✅ Owner authorized as notary');

    // Notarize the document
    const notarizeTx = await contract.connect(owner).notarizeDocument(
      documentHash,
      metadata,
      requiredSigners
    );
    await notarizeTx.wait();
    console.log('✅ Document notarized successfully\n');
  } catch (error) {
    console.log('❌ Notarization failed:', error.message);
    return;
  }

  // Step 2: Test approvals from different wallets
  console.log('👍 Step 2: Testing approvals from different wallets...');
  
  const walletsToTest = [
    { name: 'Owner', signer: owner },
    { name: 'Account 1', signer: account1 },
    { name: 'Account 2', signer: account2 },
    { name: 'Account 3', signer: account3 }
  ];

  for (const wallet of walletsToTest) {
    try {
      console.log(`  Approving with ${wallet.name} (${wallet.signer.address})...`);
      const approveTx = await contract.connect(wallet.signer).approveDocument(documentHash);
      await approveTx.wait();
      console.log(`  ✅ ${wallet.name} approved successfully!`);
    } catch (error) {
      if (error.message.includes('Already approved')) {
        console.log(`  ⚠️  ${wallet.name} already approved this document`);
      } else {
        console.log(`  ❌ ${wallet.name} approval failed: ${error.message.split('(')[0]}`);
      }
    }
  }

  // Step 3: Test signing (only required signers can sign)
  console.log('\n✍️  Step 3: Testing signatures from required signers...');
  
  const signersToTest = [
    { name: 'Owner (not required)', signer: owner },
    { name: 'Account 1 (not required)', signer: account1 },
    { name: 'Account 2 (required)', signer: account2 },
    { name: 'Account 3 (required)', signer: account3 }
  ];

  for (const wallet of signersToTest) {
    try {
      console.log(`  Signing with ${wallet.name} (${wallet.signer.address})...`);
      const signTx = await contract.connect(wallet.signer).signDocument(documentHash);
      await signTx.wait();
      console.log(`  ✅ ${wallet.name} signed successfully!`);
    } catch (error) {
      if (error.message.includes('Not a required signer')) {
        console.log(`  ⚠️  ${wallet.name} cannot sign (not a required signer)`);
      } else if (error.message.includes('Already signed')) {
        console.log(`  ⚠️  ${wallet.name} already signed this document`);
      } else {
        console.log(`  ❌ ${wallet.name} signing failed: ${error.message.split('(')[0]}`);
      }
    }
  }

  // Step 4: Check final document state
  console.log('\n🔍 Final Document State:');
  try {
    const verification = await contract.verifyDocument(documentHash);
    console.log(`  Status: ${verification.status} (0=Pending, 1=Signed, 2=Approved, 3=Rejected)`);
    console.log(`  Signatures: ${verification.signerCount}/${requiredSigners.length}`);
    console.log(`  Approvals: ${verification.approverCount}`);
    console.log(`  Notarized by: ${verification.notary}`);
    console.log(`  Timestamp: ${new Date(verification.timestamp * 1000).toLocaleString()}`);
  } catch (error) {
    console.log('  Error checking document state:', error.message);
  }

  console.log('\n💡 Key Takeaways:');
  console.log('  🔸 Each wallet address can approve only ONCE per document');
  console.log('  🔸 Only addresses in "requiredSigners" can sign the document');
  console.log('  🔸 Document becomes SIGNED when all required signers have signed');
  console.log('  🔸 Approvals can happen before or after signing');
  console.log('  🔸 Your frontend uses ONE backend wallet - that\'s why you can\'t approve twice');
}

if (require.main === module) {
  testWithDifferentWallets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} 