require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// Function to get accounts array - only include private key if it's valid
function getAccounts() {
  if (PRIVATE_KEY && PRIVATE_KEY.length === 66) { // 0x + 64 hex characters
    return [PRIVATE_KEY];
  }
  return []; // Use default accounts if no valid private key
}

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    goerli: {
      url: INFURA_PROJECT_ID ? `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}` : "",
      accounts: getAccounts(),
      chainId: 5,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000
    },
    sepolia: {
      url: INFURA_PROJECT_ID ? `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}` : "",
      accounts: getAccounts(),
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000
    },
    mainnet: {
      url: INFURA_PROJECT_ID ? `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}` : "",
      accounts: getAccounts(),
      chainId: 1,
      gasPrice: 30000000000, // 30 gwei
      gas: 8000000
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: getAccounts(),
      chainId: 137,
      gasPrice: 30000000000 // 30 gwei
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: getAccounts(),
      chainId: 80001,
      gasPrice: 20000000000 // 20 gwei
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
}; 