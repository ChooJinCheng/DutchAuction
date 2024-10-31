'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    Container,
    Paper,
    Tabs,
    Tab,
    Button,
    IconButton,
    styled,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


import { formatEther, parseEther, Contract, BrowserProvider, JsonRpcProvider, Wallet } from 'ethers';

import { contractAddress, contractJson, getNetworkName, ownerPK, tokenAddress, tokenContractJson } from './constants';

// Custom styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    marginTop: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
}));

const StatBox = styled(Box)(({ theme }) => ({
    textAlign: 'center',
    marginBottom: theme.spacing(3),
}));

const StatValue = styled(Typography)(({ theme }) => ({
    fontSize: '2rem',
    fontWeight: 'bold',
}));

const StatLabel = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
    width: '100%',
    height: '40px',
    fontSize: '1rem',
    marginBottom: theme.spacing(3),
    backgroundColor: status === 'ONGOING'
        ? theme.palette.success.light
        : theme.palette.error.light,
    color: status === 'ONGOING'
        ? theme.palette.success.contrastText
        : theme.palette.error.contrastText,
}));

// TabPanel component
function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function DutchAuctionPage() {
    /* User Bidding States Declarations */
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [tokenContract, setTokenContract] = useState(null);
    const [totalSupply, setTotalSupply] = useState(0);
    const [initialPrice, setInitialPrice] = useState(BigInt(0));
    const [currentPrice, setCurrentPrice] = useState(BigInt(0));
    const [finalPrice, setFinalPrice] = useState(BigInt(0));
    const [minPrice, setMinPrice] = useState(BigInt(0));
    const [startTime, setStartTime] = useState(null); //Number
    const [endTime, setEndTime] = useState(null); //Number
    const [remainingSupply, setRemainingSupply] = useState(0);
    const [reservedTokens, setReservedTokens] = useState(0);
    const [totalReservedTokens, setTotalReservedTokens] = useState(0);
    const [refundAmount, setRefundAmount] = useState(BigInt(0));
    const [isAuctionActive, setIsAuctionActive] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [auctionEnded, setAuctionEnded] = useState(false);
    const [canWithdraw, setCanWithdraw] = useState(true);
    const [loading, setLoading] = useState(false);
    const [ethBalance, setEthBalance] = useState(null);
    const [network, setNetwork] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
    const [cvnWalletBalance, setCvnWalletBalance] = useState('0');
    const [processedEvents, setProcessedEvents] = useState(new Set());
    let userProvider; // Declare provider her (new)

    /* Owner States Declarations */
    const [ownerAccount, setOwnerAccount] = useState(null);
    const [ownerBalance, setOwnerBalance] = useState(null);
    const [ownerContract, setOwnerContract] = useState(null);
    const [auctionDuration, setAuctionDuration] = useState(1);
    const [ownerLoading, setOwnerLoading] = useState(false);

    /* Tab functions/state */
    const [tabValue, setTabValue] = useState(0);
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    /* User Bidding Page Functions */

    // Automatically connect to MetaMask on load if available and previously connected
    /* useEffect(() => {
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
    }, []); */  // Runs only on initial load

    //Onload, when new contract is initialized, load all details
    useEffect(() => {
        let cleanup;

        if (contract) {
            // initialize auction
            initializeAuction();
            //Iniitalize owner account for owner page
            initializeOwnerAccount();
            // Set up event listeners
            cleanup = setupEventListeners(contract);
            return () => {
                if (cleanup) {
                    cleanup();
                }
            };
        }
    }, [contract, account]);

    // Connect to MetaMask
    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                userProvider = new BrowserProvider(window.ethereum); // Initialize provider here

                const accounts = await userProvider.send('eth_requestAccounts', []);
                const account = accounts[0];
                setAccount(account);
                localStorage.setItem('connectedAccount', account); // Save connected account

                const signer = await userProvider.getSigner();
                const contractInstance = new Contract(contractAddress, contractJson.abi, signer);
                setContract(contractInstance);

                const tokenContractInstance = new Contract(tokenAddress, tokenContractJson.abi, signer);
                setTokenContract(tokenContractInstance);

                // Fetch network information
                const network = await userProvider.getNetwork();
                setNetwork({
                    name: getNetworkName(network.chainId), // Retrieve and set the network name
                    chainId: network.chainId,
                });

                // Only fetch balance if an account is connected
                await fetchEthBalance(account);
            } catch (error) {
                console.error("Error connecting to MetaMask:", error);
            }
        } else {
            alert('Please install MetaMask to use this application.');
        }
    };

    const fetchEthBalance = async (account) => {
        if (!account || !userProvider) return;
        try {
            const balance = await userProvider.getBalance(account);
            setEthBalance(balance.toString());
        } catch (error) {
            console.error("Error fetching ETH balance:", error);
        }
    };

    const fetchTokenBalance = async () => {
        try {
            const balance = await tokenContract.balanceOf(account);
            setCvnWalletBalance(formatEther(balance));
            setIsWalletPopupOpen(true);
        } catch (error) {
            console.error("Error fetching CVN balance:", error);
        }
    }

    const closeWalletPopup = () => {
        setIsWalletPopupOpen(false);
        setCvnWalletBalance(BigInt(0));
    };
    // Disconnect from wallet
    const disconnectWallet = () => {
        setAccount(null);
        setContract(null);
        setTokenContract(null);
        localStorage.removeItem('connectedAccount'); // Remove connected account from localStorage

        // Clear other states
        setTotalSupply(0);
        setInitialPrice(BigInt(0));
        setCurrentPrice(BigInt(0));
        setFinalPrice(BigInt(0));
        setMinPrice(BigInt(0));
        setStartTime(null);
        setEndTime(null);
        setRemainingSupply(0);
        setReservedTokens(0);
        setTotalReservedTokens(0)
        setRefundAmount(BigInt(0));
        setIsAuctionActive(null);
        setTimeLeft(null);
        setBidAmount('');
        setBidError('');
        setErrorMessage('');
        setAuctionEnded(false);
        setCanWithdraw(true);
        setLoading(false);
        setEthBalance(null);
        setNetwork(null);
        setIsPopupOpen(false);
        setIsWalletPopupOpen(false);
        setCvnWalletBalance('0');

        setOwnerAccount(null);
        setOwnerBalance(null);
        setOwnerContract(null);
        setAuctionDuration(1);
        setOwnerLoading(false);

        if (contract && ownerContract) {
            contract.removeAllListeners();
            ownerContract.removeAllListeners();
        }
    };

    const initializeAuction = async () => {
        try {
            await fetchTotalSupply();
            const initialPrice = await fetchInitialPrice();
            const auctionStatus = await fetchAuctionStatus();
            const minPrice = await fetchMinPrice();
            await fetchTotalReservedTokens();

            if (auctionStatus) {
                await initializeAuctionDetails(initialPrice, minPrice);
                setCanWithdraw(false);
            }
        } catch (error) {
            console.error("Error initializing auction:", error);
        }
    };

    const initializeAuctionDetails = async (initialPrice, minPrice) => {
        try {
            const startTime = await fetchStartTime();
            const endTime = await fetchEndTime();
            calculateTimeLeft(endTime); //Set TimeLeft to the state
            calculateEstimatedBidPrice(startTime, endTime, initialPrice, minPrice);
        } catch (error) {
            console.error("Error initializing auction details:", error);
        }
    };

    //Instantiate owner account
    const initializeOwnerAccount = async () => {
        const localProvider = new JsonRpcProvider('http://127.0.0.1:8545');
        const ownerWallet = new Wallet(ownerPK, localProvider);

        const init = async () => {
            const account = await ownerWallet.getAddress();
            setOwnerAccount(account);

            const balance = await localProvider.getBalance(account);
            const formattedBalance = formatEther(balance);
            setOwnerBalance(formattedBalance);

            const contract = new Contract(contractAddress, contractJson.abi, ownerWallet);
            setOwnerContract(contract);
        };
        init();
    };

    //Refresh page
    const refreshPage = async () => {
        const provider = new BrowserProvider(window.ethereum);
        const latestBlock = await provider.getBlockNumber();
        console.log('refreshPage: Latest block number:', latestBlock);
    };

    // Fetch data from the contract
    const fetchContractData = async (contractInstance) => {
        try {
            const auctionStatus = await contractInstance.isAuctionActive();
            const totalSupply = await contractInstance.totalSupply();
            const averagePrice = await contractInstance.getAveragePrice();
            setIsAuctionActive(auctionStatus);
            setTotalSupply(totalSupply.toString());
            setInitialPrice(formatEther(averagePrice));

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

    // Total Supply
    const fetchTotalSupply = async () => {
        try {
            const supply = await contract.totalSupply(); // Call the totalSupply function
            setTotalSupply(Number(supply)); // Store the supply in state
        } catch (error) {
            console.error("Error fetching total supply:", error);
        }
    };

    const fetchInitialPrice = async () => {
        try {
            const initialPrice = await contract.initialPrice();
            setInitialPrice(initialPrice);
            return initialPrice;
        } catch (error) {
            console.error("Error fetching initial price:", error);
        }
    };

    const fetchMinPrice = async () => {
        try {
            const minPrice = await contract.minPrice();
            setMinPrice(minPrice);
            return minPrice;
        } catch (error) {
            console.error("Error fetching initial price:", error);
        }
    };

    const fetchAuctionStatus = async () => {
        try {
            const auctionStatus = await contract.auctionActive();
            setIsAuctionActive(auctionStatus);
            return auctionStatus;
        } catch (error) {
            console.error("Error fetching auction status:", error);
        }
    };

    const fetchStartTime = async () => {
        try {
            const startTime = await contract.startTime();
            setStartTime(Number(startTime));
            return Number(startTime);
        } catch (error) {
            console.error("Error fetching auction start time:", error);
        }
    };

    const fetchEndTime = async () => {
        try {
            const endTime = await contract.endTime();
            setEndTime(Number(endTime));
            return Number(endTime);
        } catch (error) {
            console.error("Error fetching auction end time:", error);
        }
    };

    const fetchRemainingSupply = async () => {
        try {
            const remainingTokenSupply = await contract.estRemainingSupply();
            setRemainingSupply(Number(remainingTokenSupply));
            return Number(remainingTokenSupply);
        } catch (error) {
            console.error("Error fetching auction remaining token supply:", error);
        }
    };

    const fetchTotalReservedTokens = async () => {
        try {
            const totalReservedTokens = await contract.getReservedToken();
            setTotalReservedTokens(Number(totalReservedTokens));
            return Number(totalReservedTokens);
        } catch (error) {
            console.error("Error fetching auction reserved tokens:", error);
        }
    };

    const calculateEstimatedBidPrice = (startTime, endTime, initialPrice, minPrice) => {
        const now = Math.floor(Date.now() / 1000);
        const timeElapsed = BigInt(now - startTime);
        const duration = BigInt(endTime - startTime);
        const priceDrop = (initialPrice - minPrice) / duration;
        const currentPrice = initialPrice - (priceDrop * timeElapsed);
        const finalPrice = currentPrice < minPrice ? minPrice : currentPrice;
        setCurrentPrice(finalPrice);
    };

    const openPopup = () => {
        setIsPopupOpen(true);
    };
    const closePopup = () => {
        setIsPopupOpen(false);
        setBidAmount('');
        setErrorMessage('');
    };

    const handleBidChange = (event) => {
        const value = event.target.value;

        // Allow empty input for clearing the field
        if (value === '') {
            setBidAmount('');
            setBidError('');
            return;
        }

        // Regex to match number with exactly 2 decimal places
        const regex = /^\d*\.?\d{0,2}$/;

        if (regex.test(value)) {
            setBidAmount(value);
            setBidError('');
        } else {
            setBidError('Please enter a valid number with max 2 decimal places');
        }
    };

    const handleBidSubmit = () => {
        const parsedBid = parseFloat(bidAmount);
        if (isNaN(parsedBid) || parsedBid <= 0) {
            setErrorMessage('Please enter a valid bid amount above 0 ETH');
        } else {
            bidAuction(bidAmount);
            closePopup();
            // console.log(`Bid submitted: ${bidAmount} ETH`);
        }
    };

    const bidAuction = async (bidAmount) => {
        if (contract) {
            try {
                const tx = await contract.bid({ value: parseEther(bidAmount) });
                await tx.wait(); // Wait for transaction confirmation

                console.log("Auction Bid request sent to Blockchain");
            } catch (error) {
                // Handle errors, e.g., display an error message
                console.error("Error bidding auction:", error);
            }
        }
    };

    const withdrawAllTokens = async () => {
        if (contract) {
            try {
                setCanWithdraw(false);
                const tx = await contract.withdrawTokens();
                await tx.wait(); // Wait for transaction confirmation

                console.log("Withdraw Tokens request sent to Blockchain");
            } catch (error) {
                // Handle errors, e.g., display an error message
                console.error("Error withdrawing tokens:", error);
            }
        }
    };

    /* Setup listeners section */
    const handleEvent = (eventName, txHash, callback) => {
        const eventKey = `${eventName}-${txHash}`;
        if (!processedEvents.has(eventKey)) {
            setProcessedEvents(prev => new Set([...prev, eventKey]));
            callback();
        }
    };

    const setupEventListeners = (contractInstance) => {
        const listeners = {
            auctionStarted: (startTime, endTime, event) => {
                handleEvent('AuctionStarted', event.log.transactionHash, () => {
                    console.log("AuctionStarted Event received");
                    setOwnerLoading(false);
                    setIsAuctionActive(true);
                    setCanWithdraw(false);
                    setStartTime(Number(startTime));
                    setEndTime(Number(endTime));
                    setTimeLeft(Number(endTime) - Math.floor(Date.now() / 1000));
                    toast.success("Auction has started!", {
                        position: "bottom-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });
                });
            },

            auctionEnded: (endTime, event) => {
                handleEvent('AuctionEnded', event.log.transactionHash, () => {
                    console.log("AuctionEnded Event received");
                    setOwnerLoading(false);
                    setIsAuctionActive(false);
                    setAuctionEnded(true);
                    setCanWithdraw(true);
                    setStartTime(null);
                    setEndTime(null);
                    toast.success("Auction has ended!", {
                        position: "bottom-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });
                });
            },

            bidSuccess: (bidder, pricePerToken, event) => {
                if (bidder.toLowerCase() === account.toLowerCase()) {
                    handleEvent('BidSuccess', event.log.transactionHash, () => {
                        console.log("BidSuccess Event received");
                        fetchRemainingSupply();
                        toast.success("Your bid is successful", {
                            position: "bottom-right",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        });
                    });
                }
            },

            tokensReserved: (bidder, tokensAmount, tokenPrice, event) => {
                if (bidder.toLowerCase() === account.toLowerCase()) {
                    handleEvent('TokensReserved', event.log.transactionHash, () => {
                        console.log("TokensReserved Event received");
                        setFinalPrice(tokenPrice);
                        setReservedTokens(Number(tokensAmount));
                        fetchTotalReservedTokens();
                    });
                }
            },

            refundAmount: (bidder, refundAmount, event) => {
                if (bidder.toLowerCase() === account.toLowerCase()) {
                    handleEvent('RefundAmount', event.log.transactionHash, () => {
                        console.log("RefundAmount Event received");
                        setRefundAmount(refundAmount);
                    });
                }
            },

            tokensWithdrawn: (bidder, withdrawTokenAmount, event) => {
                if (bidder.toLowerCase() === account.toLowerCase()) {
                    handleEvent('TokensWithdrawn', event.log.transactionHash, () => {
                        console.log("TokensWithdrawn Event received");
                        fetchTotalReservedTokens();
                        setCanWithdraw(true);
                        toast.success("You have successfully withdrawn all tokens of " + withdrawTokenAmount, {
                            position: "bottom-right",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        });
                    });
                }
            }
        };

        // Register all event listeners
        contractInstance.on("AuctionStarted", listeners.auctionStarted);
        contractInstance.on("AuctionEnded", listeners.auctionEnded);
        contractInstance.on("BidSuccess", listeners.bidSuccess);
        contractInstance.on("TokensReserved", listeners.tokensReserved);
        contractInstance.on("RefundAmount", listeners.refundAmount);
        contractInstance.on("TokensWithdrawn", listeners.tokensWithdrawn);

        // Return cleanup function
        return () => {
            contractInstance.off("AuctionStarted", listeners.auctionStarted);
            contractInstance.off("AuctionEnded", listeners.auctionEnded);
            contractInstance.off("BidSuccess", listeners.bidSuccess);
            contractInstance.off("TokensReserved", listeners.tokensReserved);
            contractInstance.off("RefundAmount", listeners.refundAmount);
            contractInstance.off("TokensWithdrawn", listeners.tokensWithdrawn);
            // Clear processed events on cleanup
            setProcessedEvents(new Set());
        };
    };


    /* Timer section */
    useEffect(() => {
        if (isAuctionActive && timeLeft > 0 && endTime) {
            const timer = setInterval(() => {
                calculateTimeLeft(endTime);
                calculateEstimatedBidPrice(startTime, endTime, initialPrice, minPrice);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft <= 0 && isAuctionActive && endTime) {
            endAuction();
            setOwnerLoading(true);
            setIsAuctionActive(false);
            setAuctionEnded(true);
        }
    }, [timeLeft, isAuctionActive, endTime]);

    const calculateTimeLeft = (auctionEndTime) => {
        const currentTime = Math.floor(Date.now() / 1000);
        setTimeLeft(auctionEndTime - currentTime);
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
    };

    /* Owner Page Functions */
    // startAuction Function
    const startAuction = async () => {
        if (ownerContract && auctionDuration >= 1) {
            try {
                setOwnerLoading(true);

                // Start auction with specified parameters
                const tx = await ownerContract.startAuction(auctionDuration * 60);
                await tx.wait(); // Wait for transaction confirmation

                console.log("Start Auction request sent to Blockchain");
            } catch (error) {
                let errorMessage = "Failed to start auction. Please check your wallet and try again.";
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    errorMessage = "Insufficient funds for gas.";
                } else if (error.code === 'USER_REJECTED') {
                    errorMessage = "Transaction rejected by user.";
                }
                console.error("Error starting auction:", error);
            } finally {
                //setOwnerLoading(false);
            }
        } else {
            alert("Please set auction duration (minimum 5 minutes)");
        }
    };

    //End Auction function
    const endAuction = async () => {
        if (ownerContract) {
            setTimeout(async () => {
                try {
                    const tx = await ownerContract.finalizeAuction();
                    await tx.wait(); // Wait for transaction confirmation

                    // Handle success, e.g., update state or display a success message
                    console.log("Auction ended request sent to Blockchain");
                } catch (error) {
                    // Handle errors, e.g., display an error message
                    console.error("Error starting auction:", error);
                }
            }, 2000);
        }
    };

    return (
        <><Box sx={{ flexGrow: 1 }}>
            {/* Header AppBar */}
            {!account ? (
                <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="contained" color="primary" onClick={connectWallet}>
                        Connect Wallet
                    </Button>
                </Container>

            ) : (
                <><AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            ChainVision ICO Auction
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            Current Chain: {network ? `${network.chainId}` : 'Loading network...'}
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            |
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            Address: {account}
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            |
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            ETH: {ethBalance ? `${parseFloat(formatEther(ethBalance)).toFixed(4)}` : 'Loading...'}
                        </Typography>
                        <Typography variant="body1" sx={{ mr: 1 }}>
                            |
                        </Typography>

                        <IconButton color="inherit" size="large">
                            <AccountBalanceWalletIcon onClick={fetchTokenBalance} />
                        </IconButton>
                        <IconButton color="inherit" size="large">
                            <RefreshIcon onClick={refreshPage} />
                        </IconButton>
                        <IconButton color="inherit" size="large">
                            <LogoutIcon onClick={disconnectWallet} />
                        </IconButton>
                    </Toolbar>
                </AppBar><Container maxWidth="md" sx={{ mt: 4 }}>
                        <Dialog open={isWalletPopupOpen} onClose={closeWalletPopup} fullWidth maxWidth="sm">
                            <DialogTitle>CVN Balance</DialogTitle>
                            <DialogContent>
                                <p>Your CVN Balance: {cvnWalletBalance} CVN</p>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={closeWalletPopup} color="primary">
                                    Close
                                </Button>
                            </DialogActions>
                        </Dialog>
                        <StyledPaper elevation={3}>
                            {/* Main Stats */}
                            <StatBox>
                                <StatLabel>Total Supply:</StatLabel>
                                <StatValue>{totalSupply.toFixed(2) ?? '-'}</StatValue>
                            </StatBox>

                            <StatBox>
                                <StatLabel>Intial Price: (ETH/CVN)</StatLabel>
                                <StatValue>{initialPrice <= 0 ? '-' : formatEther(initialPrice) ?? '-'}</StatValue>
                            </StatBox>

                            {/* Tabs */}
                            <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
                                <Tabs
                                    value={tabValue}
                                    onChange={handleTabChange}
                                    centered
                                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                                >
                                    <Tab label="Auction Page" />
                                    <Tab label="Owner Page" />
                                </Tabs>

                                {/* Auction Tab */}
                                <TabPanel value={tabValue} index={0}>
                                    <StatusChip
                                        label={isAuctionActive ? 'ONGOING' : 'CLOSED'}
                                        status={isAuctionActive ? 'ONGOING' : 'CLOSED'} />
                                    {isAuctionActive ? (
                                        <>
                                            <StatBox>
                                                <StatLabel>Start Time:</StatLabel>
                                                <StatValue variant="h5">{startTime !== null ? new Date(startTime * 1000).toLocaleString() : '-'}</StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>End Time:</StatLabel>
                                                <StatValue variant="h5">{endTime !== null ? new Date(endTime * 1000).toLocaleString() : '-'}</StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>Time left:</StatLabel>
                                                <StatValue variant="h5">{formatTime(timeLeft) ?? '-'}</StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>Current Bid Price (ETH):</StatLabel>
                                                <StatValue>{currentPrice <= 0 ? '-' : formatEther(currentPrice)}</StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>Est. Remaining Supply:</StatLabel>
                                                <StatValue>
                                                    {remainingSupply.toFixed(4) ?? '-'} / {totalSupply.toFixed(4) ?? '-'}
                                                </StatValue>
                                            </StatBox>

                                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={openPopup}
                                                >
                                                    Place Bid
                                                </Button>

                                                <Dialog
                                                    open={isPopupOpen}
                                                    onClose={closePopup}
                                                    maxWidth="sm"
                                                    fullWidth
                                                >
                                                    <DialogTitle>
                                                        Enter Bid Amount
                                                    </DialogTitle>

                                                    <DialogContent>
                                                        <Box sx={{
                                                            mt: 2,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <TextField

                                                                type="number"
                                                                label="Bid Amount"
                                                                value={bidAmount}
                                                                onChange={handleBidChange}
                                                                error={!!bidError}
                                                                helperText={bidError}
                                                                sx={{ mb: 2 }} />

                                                            {errorMessage && (
                                                                <Typography
                                                                    color="error"
                                                                    variant="body2"
                                                                    sx={{ mb: 2 }}
                                                                >
                                                                    {errorMessage}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </DialogContent>

                                                    <DialogActions sx={{
                                                        justifyContent: 'center',
                                                        pb: 3
                                                    }}>
                                                        <Button
                                                            onClick={closePopup}
                                                            color="primary"
                                                            sx={{ mx: 1 }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleBidSubmit}
                                                            variant="contained"
                                                            color="primary"
                                                            sx={{ mx: 1 }}
                                                        >
                                                            Submit Bid
                                                        </Button>
                                                    </DialogActions>
                                                </Dialog>
                                            </Box>
                                        </>
                                    ) : auctionEnded ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 3 }}>
                                            <StatBox>
                                                <StatLabel>Auction Status:</StatLabel>
                                                <StatValue variant="h3">Auction has ended</StatValue>
                                            </StatBox>
                                            <StatBox>
                                                <StatLabel>Bidded CVN:</StatLabel>
                                                <StatValue variant="h5">
                                                    {reservedTokens} CVN @ {finalPrice <= 0 ? '-' : formatEther(finalPrice)} ETH
                                                </StatValue>
                                            </StatBox>
                                            <StatBox>
                                                <StatLabel>Refunded Amount:</StatLabel>
                                                <StatValue variant="h5">
                                                    {refundAmount <= 0 ? '-' : formatEther(refundAmount)} ETH
                                                </StatValue>
                                            </StatBox>
                                            <StatBox>
                                                <StatLabel>Total bidded CVN:</StatLabel>
                                                <StatValue variant="h5">
                                                    {totalReservedTokens} CVN
                                                </StatValue>
                                            </StatBox>
                                            <Button variant="outlined" color="primary"
                                                disabled={!canWithdraw || totalReservedTokens <= 0}
                                                onClick={withdrawAllTokens}>
                                                {canWithdraw ? 'Withdraw CVN' : 'Processing...'}
                                            </Button>
                                        </Box>

                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 3 }}>
                                            <StatBox>
                                                <StatLabel>Auction Status:</StatLabel>
                                                <StatValue variant="h3">Auction is not active</StatValue>
                                            </StatBox>
                                            <StatBox>
                                                <StatLabel>Total bidded CVN:</StatLabel>
                                                <StatValue variant="h5">
                                                    {totalReservedTokens} CVN
                                                </StatValue>
                                            </StatBox>
                                            <Button variant="outlined" color="primary" disabled={!canWithdraw || totalReservedTokens <= 0} onClick={withdrawAllTokens}>
                                                {canWithdraw ? 'Withdraw CVN' : 'Processing...'}
                                            </Button>
                                        </Box>
                                    )}
                                </TabPanel>

                                {/* Owner Tab */}
                                <TabPanel value={tabValue} index={1}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <StatBox>
                                            <StatLabel>Owner Address: </StatLabel>
                                            <StatValue>
                                                {ownerAccount}
                                            </StatValue>
                                        </StatBox>
                                        <StatBox>
                                            <StatLabel>Eth Balance: </StatLabel>
                                            <StatValue>
                                                {ownerBalance}
                                            </StatValue>
                                        </StatBox>
                                        {startTime !== null && endTime !== null && (
                                            <StatBox>
                                                <StatLabel>Started At: </StatLabel>
                                                <StatValue>
                                                    {new Date(startTime * 1000).toLocaleString()}
                                                </StatValue>
                                                <StatLabel>End At: </StatLabel>
                                                <StatValue>
                                                    {new Date(endTime * 1000).toLocaleString()}
                                                </StatValue>
                                            </StatBox>)}
                                        <Select
                                            value={auctionDuration}
                                            onChange={(e) => setAuctionDuration(Number(e.target.value))}
                                        >
                                            <MenuItem value={1}>1 Minutes</MenuItem>
                                            <MenuItem value={2}>2 Minutes</MenuItem>
                                            <MenuItem value={5}>5 Minutes</MenuItem>
                                            <MenuItem value={10}>10 Minutes</MenuItem>
                                            <MenuItem value={15}>15 Minutes</MenuItem>
                                            <MenuItem value={20}>20 Minutes</MenuItem>
                                        </Select>
                                        <Button variant="contained" color="primary" fullWidth
                                            onClick={startAuction}
                                            disabled={!account || isAuctionActive || ownerLoading}>
                                            {ownerLoading ? 'Processing...' : 'Start Auction'}
                                        </Button>
                                    </Box>
                                </TabPanel>
                            </Box>
                        </StyledPaper>
                    </Container></>
            )}
        </Box><ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light" /></>
    );
}