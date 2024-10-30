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


import { formatEther, parseEther, Contract, BrowserProvider, JsonRpcProvider, Wallet } from 'ethers';

import { contractAddress, contractJson, getNetworkName, ownerPK } from './constants';

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
    const [totalSupply, setTotalSupply] = useState(0);
    const [initialPrice, setInitialPrice] = useState(0);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [remainingSupply, setRemainingSupply] = useState(null);
    const [reservedTokens, setReservedTokens] = useState(0);
    const [isAuctionActive, setIsAuctionActive] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [auctionEnded, setAuctionEnded] = useState(false);
    const [canWithdraw, setCanWithdraw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ethBalance, setEthBalance] = useState(null);
    const [network, setNetwork] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
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
        if (contract) {
            // initialize auction
            initializeAuction();
            //Iniitalize owner account for owner page
            initializeOwnerAccount();
            // Set up event listeners
            setupEventListeners(contract);
            return () => {
            };
        }
    }, [contract]);

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
    // Disconnect from wallet
    const disconnectWallet = () => {
        setAccount(null);
        setContract(null);
        localStorage.removeItem('connectedAccount'); // Remove connected account from localStorage

        // Clear other states
        setTotalSupply(0);
        setInitialPrice(0);
        setCurrentPrice(null);
        setEndTime(null);
        setRemainingSupply(null);
        setReservedTokens(0);
        setIsAuctionActive(null);
        setTimeLeft(null);
        setBidAmount('');
        setErrorMessage('');
        setAuctionEnded(false);
        setCanWithdraw(false);
        setLoading(false);
        setEthBalance(null);
        setNetwork(null);

        if (contract && ownerContract) {
            contract.removeAllListeners();
            ownerContract.removeAllListeners();
        }
    };

    const initializeAuction = async () => {
        try {
            await fetchTotalSupply();
            await fetchInitialPrice();
            const auctionStatus = await fetchAuctionStatus();

            if (auctionStatus) {
                await initializeAuctionDetails();
            }
        } catch (error) {
            console.error("Error initializing auction:", error);
        }
    };

    const initializeAuctionDetails = async () => {
        try {
            await fetchStartTime();
            const endTime = await fetchEndTime();
            calculateTimeLeft(endTime); //Set TimeLeft to the state

            console.log('AuctionDetails initialized');
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
            setInitialPrice(formatEther(initialPrice));
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


    /* // Current Price
    const fetchCurrentPrice = async () => {
      const currentPrice = await contract.getCurrentPrice();
      setCurrentPrice(ethers.utils.formatEther(currentPrice));
    };
    // Remaining Supply
    const fetchRemainingSupply = async () => {
      const remainingSupply = await contract.getestRemainingSupply();
      setRemainingSupply(remainingSupply.toString());
    };
    // Reserved Tokens
    const fetchReservedTokens = async () => {
      const reserved = await contract.getReservedToken();
      setReservedTokens(reserved.toString());
    }; */

    //Setup listeners for the auction
    const setupEventListeners = (contractInstance) => {
        // Listen for AuctionStarted events
        contractInstance.on("AuctionStarted", (start, end) => {
            console.log("AuctionStarted Event received:", start, end);
            setOwnerLoading(false);
            setIsAuctionActive(true);
            setStartTime(Number(start));
            setEndTime(Number(end));
            setTimeLeft(Number(end) - Math.floor(Date.now() / 1000));
        });

        // Listen for AuctionEnded events if necessary
        contractInstance.on("AuctionEnded", () => {
            console.log("AuctionEnded Event received");
            setIsAuctionActive(false);
            setAuctionEnded(true);
            setCanWithdraw(true);
            setStartTime(null);
            setEndTime(null);
        });
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
            // Proceed with bid submission logic here
            closePopup();
            console.log(`Bid submitted: ${bidAmount} ETH`);
        }
    };

    /* Timer section */
    useEffect(() => {
        if (isAuctionActive && timeLeft > 0 && endTime) {
            const timer = setInterval(() => {
                calculateTimeLeft(endTime);
                //setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft <= 0 && isAuctionActive && endTime) {
            endAuction();
            setIsAuctionActive(false);
            setAuctionEnded(true);
            alert("Auction has ended!");
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

                alert("Auction started successfully!");
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
                //setOwnerLoading(false);
            }
        } else {
            alert("Please set auction duration (minimum 5 minutes)");
        }
    };

    //End Auction function
    const endAuction = async () => {
        if (ownerContract) {
            try {
                const tx = await ownerContract.finalizeAuction();
                await tx.wait(); // Wait for transaction confirmation

                // Handle success, e.g., update state or display a success message
                console.log("Auction ended successfully");
            } catch (error) {
                // Handle errors, e.g., display an error message
                console.error("Error starting auction:", error);
            }
        }
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
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
                            <RefreshIcon onClick={refreshPage} />
                        </IconButton>
                        <IconButton color="inherit" size="large">
                            <LogoutIcon onClick={disconnectWallet} />
                        </IconButton>
                    </Toolbar>
                </AppBar><Container maxWidth="md" sx={{ mt: 4 }}>
                        <StyledPaper elevation={3}>
                            {/* Main Stats */}
                            <StatBox>
                                <StatLabel>Total Supply:</StatLabel>
                                <StatValue>{totalSupply.toFixed(2) || 'Loading...'}</StatValue>
                            </StatBox>

                            <StatBox>
                                <StatLabel>Intial Price: (ETH/CVN)</StatLabel>
                                <StatValue>{initialPrice}</StatValue>
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
                                        status={isAuctionActive ? 'ONGOING' : 'CLOSED'}
                                    />
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
                                                <StatValue variant="h5">{formatTime(timeLeft)}</StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>Current Bid Price (ETH):</StatLabel>
                                                <StatValue></StatValue>
                                            </StatBox>

                                            <StatBox>
                                                <StatLabel>Reserved CVN:</StatLabel>
                                                <StatValue>
                                                    {reservedTokens.toFixed(4)} / {totalSupply.toFixed(4)}
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
                                                    Bid Value
                                                </StatValue>
                                            </StatBox>
                                            <Button variant="outlined" color="primary">
                                                Withdraw CVN
                                            </Button>
                                        </Box>

                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 3 }}>
                                            <StatBox>
                                                <StatLabel>Auction Status:</StatLabel>
                                                <StatValue variant="h3">Auction is not active</StatValue>
                                            </StatBox>
                                            <StatBox>
                                                <StatLabel>Bidded CVN:</StatLabel>
                                                <StatValue variant="h5">
                                                    Bid Value
                                                </StatValue>
                                            </StatBox>
                                            <Button variant="outlined" color="primary">
                                                Withdraw CVN
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
                                            <MenuItem value={5}>5 Minutes</MenuItem>
                                            <MenuItem value={10}>10 Minutes</MenuItem>
                                            <MenuItem value={15}>15 Minutes</MenuItem>
                                            <MenuItem value={20}>20 Minutes</MenuItem>
                                        </Select>
                                        <Button variant="contained" color="primary" fullWidth
                                            onClick={startAuction}
                                            disabled={!account || isAuctionActive || ownerLoading}>
                                            {ownerLoading ? 'Starting...' : 'Start Auction'}
                                        </Button>
                                    </Box>
                                </TabPanel>
                            </Box>
                        </StyledPaper>
                    </Container></>
            )}
        </Box>

    );
}