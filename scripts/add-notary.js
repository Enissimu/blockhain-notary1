const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 Adding wallet as authorized notary...\n");

  // Get the contract
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ CONTRACT_ADDRESS not found in .env file");
    return;
  }

  // Get signers (wallets)
  const [owner, account1, account2] = await ethers.getSigners();
  
  console.log("👤 Contract owner:", owner.address);
  console.log("👤 Account 1:", account1.address);
  console.log("👤 Account 2:", account2.address);
  console.log("📋 Contract address:", contractAddress);
  console.log();

  // Connect to contract with owner
  const NotaryService = await ethers.getContractFactory("NotaryService");
  const contract = NotaryService.attach(contractAddress);

  try {
    // Check current authorization status
    console.log("🔍 Checking current authorization status...");
    const ownerAuthorized = await contract.authorizedNotaries(owner.address);
    const account1Authorized = await contract.authorizedNotaries(account1.address);
    const account2Authorized = await contract.authorizedNotaries(account2.address);
    
    console.log(`Owner (${owner.address}): ${ownerAuthorized ? '✅ Authorized' : '❌ Not authorized'}`);
    console.log(`Account 1 (${account1.address}): ${account1Authorized ? '✅ Authorized' : '❌ Not authorized'}`);
    console.log(`Account 2 (${account2.address}): ${account2Authorized ? '✅ Authorized' : '❌ Not authorized'}`);
    console.log();

    // Add account1 as authorized notary if not already authorized
    if (!account1Authorized) {
      console.log("📝 Adding Account 1 as authorized notary...");
      const tx = await contract.connect(owner).addNotary(account1.address);
      await tx.wait();
      console.log("✅ Account 1 added as authorized notary!");
      console.log("📄 Transaction hash:", tx.hash);
    } else {
      console.log("ℹ️  Account 1 is already an authorized notary");
    }

    // Add account2 as authorized notary if not already authorized
    if (!account2Authorized) {
      console.log("📝 Adding Account 2 as authorized notary...");
      const tx = await contract.connect(owner).addNotary(account2.address);
      await tx.wait();
      console.log("✅ Account 2 added as authorized notary!");
      console.log("📄 Transaction hash:", tx.hash);
    } else {
      console.log("ℹ️  Account 2 is already an authorized notary");
    }

    console.log();
    console.log("🎉 All accounts are now authorized notaries!");
    console.log();
    console.log("💡 To use a different account in your backend:");
    console.log("   Update PRIVATE_KEY in .env to one of these:");
    console.log(`   Owner: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
    console.log(`   Account 1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`);
    console.log(`   Account 2: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("Only owner can perform this action")) {
      console.log("💡 Make sure you're using the contract owner's private key in .env");
      console.log("   The owner is usually the first account from hardhat node");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 