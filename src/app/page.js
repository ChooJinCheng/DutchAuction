'use client';  // Ensures Next.js runs this code on the client side

import { useState, useEffect } from 'react';
import { Contract, BrowserProvider, formatEther, parseEther } from 'ethers';
import contractJson from '../../dutch-auction-contracts/build/contracts/DutchAuction.json';
import { contractAddress } from './constants';  // Adjust this import if necessary

export default function Home() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [averagePrice, setAveragePrice] = useState(null);  // Added back the average price
  const [currentPrice, setCurrentPrice] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [remainingSupply, setRemainingSupply] = useState(null);
  const [reservedTokens, setReservedTokens] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [auctionEnded, setAuctionEnded] = useState(false);  // Track if the auction has ended
  const [canWithdraw, setCanWithdraw] = useState(false);  // Track if tokens can be withdrawn
  const [loading, setLoading] = useState(false);  // Loading spinner for bid submission

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);

        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, contractJson.abi, signer);
        setContract(contractInstance);

        // Fetch contract values after connection
        await fetchContractData(contractInstance);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      alert('Please install MetaMask to use this application.');
    }
  };

  // Fetch data from the contract
  const fetchContractData = async (contractInstance) => {
    try {
      const auctionStatus = await contractInstance.isAuctionActive();
      const totalSupply = await contractInstance.totalSupply();
      const averagePrice = await contractInstance.getAveragePrice();  // Fetching average price
      setIsAuctionActive(auctionStatus);
      setTotalSupply(totalSupply.toString());
      setAveragePrice(formatEther(averagePrice));  // Display average price

      if (auctionStatus) {
        const currentPrice = await contractInstance.getCurrentPrice();
        const endTime = await contractInstance.getEndTime();
        const remainingSupply = await contractInstance.getRemainingSupply();
        const reservedTokens = await contractInstance.getReservedTokens();

        setCurrentPrice(formatEther(currentPrice));
        setEndTime(Number(endTime.toString()));
        setRemainingSupply(remainingSupply.toString());
        setReservedTokens(reservedTokens.toString());
        calculateTimeLeft(Number(endTime.toString()));
      } else if (!auctionStatus && !auctionEnded) {
        setAuctionEnded(true);
        setCanWithdraw(true);  // Enable withdraw functionality after auction ends
        setIsAuctionActive(false);
      }
    } catch (error) {
      console.error("Error fetching contract data:", error);
    }
  };

  // Polling logic for contract data refresh
  useEffect(() => {
    let interval;
    if (contract && isAuctionActive) {
      fetchContractData(contract);
      interval = setInterval(() => fetchContractData(contract), 30000);  // Poll only when auction is active
    }
    return () => clearInterval(interval);
  }, [contract, isAuctionActive]);

  // Timer function to calculate remaining time
  const calculateTimeLeft = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    setTimeLeft(timeLeft);

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        const newTimeLeft = endTime - Math.floor(Date.now() / 1000);
        setTimeLeft(newTimeLeft);

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          setIsAuctionActive(false);  // Auction has ended
        }
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setIsAuctionActive(false);  // Auction has already ended
    }
  };

  // Format time left to display in minutes and seconds
  const formatTimeLeft = () => {
    if (timeLeft <= 0) return 'Auction ended';
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes} minutes, ${seconds} seconds left`;
  };

  // Handle user bid submission
  const handleBidSubmit = async () => {
    if (contract && bidAmount && isAuctionActive) {
      try {
        setLoading(true);  // Show spinner during transaction
        const tx = await contract.reserveTokens(parseInt(bidAmount), { value: parseEther(bidAmount) });
        await tx.wait();  // Wait for the transaction to be mined
        alert(`Bid of ${bidAmount} ETH submitted successfully!`);
        fetchContractData(contract);  // Refetch contract data after bid
        setErrorMessage('');
      } catch (error) {
        console.error("Error submitting bid:", error);
        setErrorMessage('Bid submission failed. Please try again.');
      } finally {
        setLoading(false);  // Hide spinner
      }
    } else {
      setErrorMessage('Auction is not active or invalid bid amount.');
    }
  };

  // Handle withdraw tokens
  const handleWithdraw = async () => {
    if (contract && canWithdraw) {
      try {
        const tx = await contract.withdrawTokens();  // Call the withdraw function
        await tx.wait();  // Wait for the transaction to be mined
        alert("Tokens withdrawn successfully!");
        fetchContractData(contract);  // Refetch contract data
      } catch (error) {
        console.error("Error withdrawing tokens:", error);
        setErrorMessage('Withdrawal failed. Please try again.');
      }
    }
  };

  return (
    <div className="auction-container">
      <button onClick={connectWallet}>
        {account ? `Connected: ${account}` : 'Connect Wallet'}
      </button>

      {account && (
        <div className="auction-content">
          <h2>Auction Details</h2>

          <a href="/start-auction">
            <button className="button">Go to Admin Page</button>
          </a>

          <p>Total Supply of Dutch Tokens: {totalSupply}</p>
          <p>Average Price of Dutch Tokens: {averagePrice} ETH</p>  {/* Displaying average price */}

          {isAuctionActive ? (
            <>
              <div className="banner">🚨 Auction is Active! 🚨</div>
              <p>Current Bid Price: {currentPrice} ETH</p>
              <p>Reserved Dutch Tokens: {reservedTokens}</p>
              <p>Remaining Auction Token Supply: {remainingSupply}</p>
              <p>Auction End Time: {new Date(endTime * 1000).toLocaleString()}</p>
              <p>{formatTimeLeft()}</p>

              <div>
                <label>
                  Enter Bid Amount (ETH):
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                  />
                </label>
                <button onClick={handleBidSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>

              {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            </>
          ) : auctionEnded ? (
            <>
              <p>The auction has ended. You can now withdraw your tokens.</p>
              <button onClick={handleWithdraw}>Withdraw Tokens</button>
            </>
          ) : (
            <>
              <p>The auction is not active at the moment.</p>
              {<button onClick={handleWithdraw}>Withdraw Tokens</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
