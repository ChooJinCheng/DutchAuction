'use client';

import { formatEther, parseEther } from 'ethers';
import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
import { Contract, BrowserProvider } from 'ethers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import { contractAddress, contractJson, getNetworkName } from './constants';

export default function Home() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [averagePrice, setAveragePrice] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [remainingSupply, setRemainingSupply] = useState(null);
  const [reservedTokens, setReservedTokens] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState(null);
  const [network, setNetwork] = useState(null);
  let provider; // Declare provider her (new)

  // const router = useRouter();

  // Automatically connect to MetaMask on load if available and previously connected
  useEffect(() => {
    const autoConnectWallet = async () => {
      const savedAccount = localStorage.getItem('connectedAccount');
      if (typeof window.ethereum !== 'undefined' && savedAccount) {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);

        // If saved account exists in MetaMask, set account and call connectWallet
        if (accounts.includes(savedAccount)) {
          setAccount(savedAccount);
          await connectWallet();
        }
      }
    };
    autoConnectWallet();
  }, []);  // Runs only on initial load

 
  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        provider = new BrowserProvider(window.ethereum); // Initialize provider here
        const accounts = await provider.send('eth_requestAccounts', []);
        const account = accounts[0];
        setAccount(account);
        localStorage.setItem('connectedAccount', account); // Save connected account

        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, contractJson.abi, signer);
        setContract(contractInstance);

        // Fetch contract values after connection
        await fetchContractData(contractInstance);

        // Fetch network information
        const network = await provider.getNetwork();
        setNetwork({
          name: getNetworkName(network.chainId), // Retrieve and set the network name
          chainId: network.chainId,
        });

        // Only fetch balance if an account is connected
        await fetchEthBalance(account);
        
        // Set up event listeners
        setupEventListeners(contractInstance);

      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      alert('Please install MetaMask to use this application.');
    }
  };

  const fetchEthBalance = async (account) => {
    if (!account || !provider) return;
    try {
      const balance = await provider.getBalance(account);
      setEthBalance(balance.toString());
    } catch (error) {
      console.error("Error fetching ETH balance:", error);
    }
  };

  // const handleGoToAdminPage = () => {
  //   // Ensure account is defined before navigating
  //   if (account) {
  //     router.push(`/start-auction?account=${account}`); // Construct URL with query parameters
  //   } else {
  //     console.warn("Account is not defined. Cannot navigate to admin page.");
  //   }
  // };
  
  // Disconnect from wallet
  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    localStorage.removeItem('connectedAccount'); // Remove connected account from localStorage

    // Clear other states
    setTotalSupply(null);
    setAveragePrice(null);
    setCurrentPrice(null);
    setStartTime(null);
    setEndTime(null);
    setRemainingSupply(null);
    setReservedTokens(null);
    setIsAuctionActive(false);
    setTimeLeft(null);
    setBidAmount('');
    setErrorMessage('');
    setAuctionEnded(false);
    setCanWithdraw(false);
    setLoading(false);
    setEthBalance(null);
    setNetwork(null);

    if (contract) {
      contract.removeAllListeners();
    }
  };

  // Fetch data from the contract
  const fetchContractData = async (contractInstance) => {
    try {
      const auctionStatus = await contractInstance.isAuctionActive();
      const totalSupply = await contractInstance.totalSupply();
      const averagePrice = await contractInstance.getAveragePrice();
      setIsAuctionActive(auctionStatus);
      setTotalSupply(totalSupply.toString());
      setAveragePrice(formatEther(averagePrice));

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
        setCanWithdraw(true);
      }
    } catch (error) {
      console.error("Error fetching contract data:", error);
    }
  };

  // Setup event listeners within useEffect
  useEffect(() => {
    const savedStatus = localStorage.getItem('auctionStatus');
    const savedStartTime = localStorage.getItem('auctionStartTime');
    const savedEndTime = localStorage.getItem('auctionEndTime');

    if (savedStatus === 'ongoing' && savedStartTime && savedEndTime) {
        setIsAuctionActive(true);
        setStartTime(parseInt(savedStartTime, 10));
        setEndTime(parseInt(savedEndTime, 10));
        setTimeLeft(parseInt(savedEndTime, 10) - Math.floor(Date.now() / 1000));
    }

    if (contract) {
        const startAuction = async (startTime, endTime) => {
            setIsAuctionActive(true);
            setStartTime(startTime);
            setEndTime(endTime);
            setTimeLeft(endTime - Math.floor(Date.now() / 1000));
            await fetchTotalSupply(); // Fetch total supply when the auction starts
        };

        // Event listener for the "AuctionStarted" event
        contract.on("AuctionStarted", startAuction);

        // Fetch initial auction details asynchronously
        const initializeAuctionDetails = async () => {
            try {
                await fetchTotalSupply();
                // await fetchCurrentPrice();
                // await fetchRemainingSupply();
                // await fetchReservedTokens();
            } catch (error) {
                console.error("Error fetching auction details:", error);
            }
        };

        initializeAuctionDetails();

        // Cleanup function to remove the event listener
        return () => {
            contract.off("AuctionStarted", startAuction);
        };
    }
}, [contract]);


  // Total Supply
  const fetchTotalSupply = async () => {
    try {
        const supply = await contract.totalSupply(); // Call the totalSupply function
        setTotalSupply(supply.toString()); // Store the supply in state
    } catch (error) {
        console.error("Error fetching total supply:", error);
    }
  };


//   // Current Price
//   const fetchCurrentPrice = async () => {
//     const currentPrice = await contract.getCurrentPrice();
//     setCurrentPrice(ethers.utils.formatEther(currentPrice));
//   };

//  // Remaining Supply
//   const fetchRemainingSupply = async () => {
//     const remainingSupply = await contract.getestRemainingSupply();
//     setRemainingSupply(remainingSupply.toString());
//   };


//   // Reserved Tokens
//   const fetchReservedTokens = async () => {
//     const reserved = await contract.getReservedToken();
//     setReservedTokens(reserved.toString());
//   };


  // //
  const calculateTimeLeft = (endTime) => {
    const currentTime = Math.floor(Date.now() / 1000);
    setTimeLeft(endTime - currentTime);
    
    if (timeLeft <= 0) {
      setIsAuctionActive(false);
      setAuctionEnded(true);
      setCanWithdraw(true);
      alert("Auction has ended!");
    }
  };

  useEffect(() => {
    if (isAuctionActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0 && isAuctionActive) {
      setIsAuctionActive(false);
      setAuctionEnded(true);
      setCanWithdraw(true);
      alert("Auction has ended!");
    }
  }, [timeLeft, isAuctionActive]);

  const formatTimeLeft = () => {
    if (timeLeft === null) return '';
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };

  return (
    <div className="auction-container">
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div className="auction-content">
          <div className="header-section">
            <h3>Chainvision</h3>
            <h3>ETH: {ethBalance ? `${parseFloat(formatEther(ethBalance)).toFixed(4)}` : 'Loading...'}</h3>
            <h3>Current Chain: {network ? `${network.chainId}` : 'Loading network...'}</h3>
            <div onClick={disconnectWallet} style={{ cursor: 'pointer', display: 'inline-block', marginRight: '20px' }}>
              <FontAwesomeIcon icon={faSignOutAlt} size="lg" />
            </div>
          </div>

          <h2>Wallet Address: {account}</h2>
          <a href="/start-auction">
            <button className="Adminbutton">Go to Admin Page</button>
          </a>

          <h3>Total Supply: {totalSupply || 'Loading...'}</h3>
          <h3>Average Price (ETH/CVN): {averagePrice} ETH</h3>

            <div className={`status-bar ${isAuctionActive ? 'ongoing' : 'closed'}`}>
          {isAuctionActive ? 'Ongoing' : 'Closed'}
            </div>

          {isAuctionActive ? (
            <div>
              <h3>Current Price: <br></br>{currentPrice} ETH</h3>
              <h3>End Time: <br></br>{new Date(endTime * 1000).toLocaleString()}</h3>
              <h3>Time Left: <br></br>{formatTimeLeft()}</h3>
              <h3>Remaining Supply: <br></br>{remainingSupply}</h3>
              <h3>Reserved Tokens (CVN): <br></br>{reservedTokens}</h3>
              <input
                type="number"
                placeholder="Enter bid amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
              {/* <button onClick={handleBidSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Place Bid'}
              </button> */}
            </div>
          ) : auctionEnded ? (
            <div>
              <h3>Auction Status: Auction has ended</h3>
              {/* {canWithdraw && (
                <button onClick={canWithdraw}>Withdraw Tokens</button>
              )} */}
            </div>
          ) : (
            <div>
              <h3>Auction Status: Auction is not active</h3>
            </div>
          )}
          {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </div>
      )}
    </div>
  );
}
