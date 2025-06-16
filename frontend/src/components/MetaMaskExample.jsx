import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Edit, AlertCircle } from 'lucide-react';

const MetaMaskExample = () => {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // This is how production would work with MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        setAccount(accounts[0]);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  const approveWithUserWallet = async (documentHash) => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      // In production, each user signs with their own wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // This transaction is signed by the USER's wallet, not the backend
      const tx = await contract.approveDocument(documentHash);
      await tx.wait();
      
      alert(`Document approved by ${account}!`);
    } catch (error) {
      if (error.message.includes('Already approved')) {
        alert('You have already approved this document!');
      } else {
        alert('Approval failed: ' + error.message);
      }
    }
  };

  const signWithUserWallet = async (documentHash) => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // This transaction is signed by the USER's wallet
      const tx = await contract.signDocument(documentHash);
      await tx.wait();
      
      alert(`Document signed by ${account}!`);
    } catch (error) {
      if (error.message.includes('Not a required signer')) {
        alert('You are not authorized to sign this document!');
      } else if (error.message.includes('Already signed')) {
        alert('You have already signed this document!');
      } else {
        alert('Signing failed: ' + error.message);
      }
    }
  };

  return (
    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
        <Wallet className="h-5 w-5 mr-2" />
        Production MetaMask Integration Example
      </h3>
      
      {!isConnected ? (
        <div className="text-center">
          <p className="text-blue-700 mb-4">
            In production, each user would connect their own wallet:
          </p>
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Connect MetaMask Wallet
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-white p-4 rounded border mb-4">
            <p className="text-sm text-gray-600">Connected Wallet:</p>
            <p className="font-mono text-sm">{account}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => approveWithUserWallet('0x123...')}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Approve with My Wallet</span>
            </button>
            
            <button
              onClick={() => signWithUserWallet('0x123...')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Sign with My Wallet</span>
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p><strong>How it works:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Each user has their own Ethereum wallet</li>
                  <li>Each wallet can approve/sign independently</li>
                  <li>No backend wallet involved in user actions</li>
                  <li>True decentralized document workflow</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaMaskExample; 