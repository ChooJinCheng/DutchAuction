'use client'; 

import { useState, useEffect } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import contractJson from '../../../dutch-auction-contracts/artifacts/contracts/DutchAuction.sol/DutchAuction.json';
import { contractAddress } from '../constants';

export default function StartAuction() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [auctionDuration, setAuctionDuration] = useState(5);
  const [totalSupply, setTotalSupply] = useState(0); 
  const [initialPrice, setInitialPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state

  // Function to connect Wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);

        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, contractJson.abi, signer);
        setContract(contractInstance);

        contractInstance.on("AuctionStarted", (start, end) => {
          console.log("AuctionStarted Event received:", start, end);
          setStartTime(start);
          setEndTime(end);
        });
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
        alert("Could not connect to wallet. Please try again.");
      }
    } else {
      alert('Please install MetaMask to use this application.');
    }
  };

  // startAuction Function
  const startAuction = async () => {
    if (contract && auctionDuration >= 5) { 
      try {
        setLoading(true);
        
        // Start auction with specified parameters
        const tx = await contract.startAuction(auctionDuration * 60);
        await tx.wait(); // Wait for transaction confirmation

        alert("Auction started successfully!");

        const currentTime = Math.floor(Date.now() / 1000);
        const auctionEndTime = currentTime + auctionDuration * 60;
        
        // Save auction time/state in localStorage
        localStorage.setItem('auctionStatus', 'ongoing');
        localStorage.setItem('auctionStartTime', currentTime);
        localStorage.setItem('auctionEndTime', auctionEndTime);
        
        setIsAuctionActive(true);
        setStartTime(currentTime);
        setEndTime(auctionEndTime);
        setTimeLeft(auctionDuration * 60);

      } catch (error) {
        let errorMessage = "Failed to start auction. Please check your wallet and try again.";
        if (error.code === 'INSUFFICIENT_FUNDS') {
          errorMessage = "Insufficient funds for gas.";
        } else if (error.code === 'USER_REJECTED') {
          errorMessage = "Transaction rejected by user.";
        }
        console.error("Error starting auction:", error);
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      alert("Please set auction duration (minimum 5 minutes)");
    }
  };

  useEffect(() => {
    // Check localStorage for auction state on component mount
    const savedStartTime = localStorage.getItem('auctionStartTime');
    const savedEndTime = localStorage.getItem('auctionEndTime');
    
    if (savedStartTime && savedEndTime) {
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = parseInt(savedStartTime, 10);
      const endTime = parseInt(savedEndTime, 10);

      if (currentTime < endTime) {
        // Auction is ongoing
        setIsAuctionActive(true);
        setStartTime(startTime);
        setEndTime(endTime);
        setTimeLeft(endTime - currentTime);
      } else {
        // Auction has ended
        setIsAuctionActive(false);
        alert("Auction has ended!");
        localStorage.removeItem('auctionStartTime');
        localStorage.removeItem('auctionEndTime');
      }
    }

    if (isAuctionActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setIsAuctionActive(false);
            alert("Auction has ended!");
            localStorage.removeItem('auctionStartTime');
            localStorage.removeItem('auctionEndTime');
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isAuctionActive]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <div className="auction-container">
      <h1>Start Auction</h1>

      <button
        className={`connect-button ${account ? 'connected' : ''}`} 
        onClick={connectWallet}
      >
        {account ? `Connected: ${account}` : 'Connect Wallet'}
      </button>
  
      <label>
        Auction Duration:
        <br /><br />
        <select 
          value={auctionDuration}
          onChange={(e) => setAuctionDuration(Number(e.target.value))}
        >
          <option value={5}>5 Minutes</option>
          <option value={10}>10 Minutes</option>
          <option value={15}>15 Minutes</option>
          <option value={20}>20 Minutes</option>
        </select>
      </label>

      <button 
        className="start-auction-button" 
        onClick={startAuction} 
        disabled={!account || isAuctionActive || loading} // Disable if loading
      >
        {loading ? 'Starting...' : 'Start Auction'}
      </button>
  
      <div className={`status-bar ${isAuctionActive ? 'ongoing' : 'closed'}`}>
        {isAuctionActive ? 'Ongoing' : 'Closed'}
      </div>

      {startTime !== null && endTime !== null && (
        <div>
          <p>Auction started at: {new Date(startTime * 1000).toLocaleString()}</p>
          <p>Auction will end at: {new Date(endTime * 1000).toLocaleString()}</p>
        </div>
      )}
  
      {isAuctionActive && (
        <div className="timer">
          <h2>Time Left: {formatTime(timeLeft)}</h2>
        </div>
      )}

      <p>Total Supply: {totalSupply}</p>
      <p>Current Bid Price (Initial Price): {initialPrice}</p>

      <a href="/">
        <button className="main-page-button">Go to Main Page</button>
      </a>
    </div>
  );
}
