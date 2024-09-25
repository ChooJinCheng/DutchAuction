'use client';

import { useState } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import contractJson from '../../../dutch-auction-contracts/build/contracts/DutchAuction.json';
import { contractAddress } from '../constants';

export default function StartAuction() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);

        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, contractJson.abi, signer);
        setContract(contractInstance);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      alert('Please install MetaMask to use this application.');
    }
  };

  const startAuction = async () => {
    if (contract) {
      try {
        const tx = await contract.startAuction(40);
        await tx.wait();
        alert("Auction started successfully!");
      } catch (error) {
        console.error("Error starting auction:", error);
        alert("Failed to start auction.");
      }
    }
  };

  return (
    <div className="auction-container">
      <h1>Start Auction</h1>
      <button className="connect-button" onClick={connectWallet}>
        {account ? `Connected: ${account}` : 'Connect Wallet'}
      </button>
      <button className="start-auction-button" onClick={startAuction} disabled={!account}>
        Start 5 Minute Auction
      </button>
      <a href="/">
        <button className="main-page-button">Go to Main Page</button>
      </a>
    </div>
  );
}
