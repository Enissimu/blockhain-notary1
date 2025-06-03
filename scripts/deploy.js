const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of NotaryService contract...");
  
  // Get the contract factory
  const NotaryService = await ethers.getContractFactory("NotaryService");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy the contract
  console.log("Deploying NotaryService...");
  const notaryService = await NotaryService.deploy();
  
  // Wait for deployment to be mined
  await notaryService.deployed();
  
  console.log("✅ NotaryService deployed successfully!");
  console.log("📋 Contract address:", notaryService.address);
  console.log("🔗 Network:", hre.network.name);
  console.log("🚀 Deployer:", deployer.address);
  
  // Log transaction hash
  console.log("📄 Transaction hash:", notaryService.deployTransaction.hash);
  
  // Wait for a few confirmations on mainnet/testnets
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for confirmations...");
    await notaryService.deployTransaction.wait(6);
    console.log("✅ Confirmations complete!");
  }
  
  // Verify contract on Etherscan if not local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: notaryService.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: notaryService.address,
    deployer: deployer.address,
    transactionHash: notaryService.deployTransaction.hash,
    blockNumber: notaryService.deployTransaction.blockNumber,
    gasUsed: notaryService.deployTransaction.gasLimit?.toString(),
    timestamp: new Date().toISOString()
  };
  
  console.log("\n📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Check owner
    const owner = await notaryService.owner();
    console.log("✅ Contract owner:", owner);
    
    // Check total documents (should be 0)
    const totalDocs = await notaryService.totalDocuments();
    console.log("✅ Total documents:", totalDocs.toString());
    
    console.log("✅ All tests passed!");
    
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📝 Save this contract address for future interactions:", notaryService.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 