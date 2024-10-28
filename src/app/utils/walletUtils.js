// // src/app/utils/walletUtils.js

// import { BrowserProvider, Contract } from 'ethers';
// import { contractAddress, contractJson } from '../constants';

// export const connectWalletAndGetContract = async () => {
//   if (typeof window.ethereum === 'undefined') {
//     alert('Please install MetaMask to use this application.');
//     return { account: null, contractInstance: null, provider: null };
//   }

//   try {
//     const provider = new BrowserProvider(window.ethereum);
//     const accounts = await provider.send('eth_requestAccounts', []);
//     const account = accounts[0];
//     const signer = await provider.getSigner();
//     const contractInstance = new Contract(contractAddress, contractJson.abi, signer);

//     return { account, contractInstance, provider };
//   } catch (error) {
//     console.error("Error connecting to MetaMask:", error);
//     alert("Could not connect to wallet. Please try again.");
//     return { account: null, contractInstance: null, provider: null };
//   }
// };



// To try if got time src/app/page,js
// import { connectWalletAndGetContract } from './utils/walletUtils'; // New*


// useEffect(() => {
//     const autoConnectWallet = async () => {
//       const savedAccount = localStorage.getItem('connectedAccount');
//       if (savedAccount) {
//         const { account, contractInstance, provider } = await connectWalletAndGetContract();
//         if (account === savedAccount) {
//           setAccount(account);
//           setContract(contractInstance);
//           await fetchEthBalance(provider, account);
//           setNetwork(await provider.getNetwork());
//         }
//       }
//     };
//     autoConnectWallet();
//   }, []);

//   const connectWallet = async () => {
//     const { account, contractInstance, provider } = await connectWalletAndGetContract();
//     if (account) {
//       setAccount(account);
//       setContract(contractInstance);
//       localStorage.setItem('connectedAccount', account);
//       await fetchEthBalance(provider, account);
//       setNetwork(await provider.getNetwork());
//     }
//   };

