# DutchAuction

## 1. Introduction

This is a project development submission for NTU SC4053 Blockchain Technology Course

Team Members
- Endy (U2121941B)
- Jonathan Lim Jun Wei (U2121770L)
- Jin Cheng (U2121190C)

## 2. How to install dependencies in the project

### 2.1 Install node dependencies
run the following command in the <ins>**root**</ins> directory of this project to install dependency for the webserver:

    npm install
    
run the following command in the <ins>**dutch-auction-contracts/**</ins> directory of this project to install dependency for the webserver:

    npm install


## 3. Setup HardHat Network Locally & Deploy contracts (Navigate to dutch-auction-contracts/ directory of this project)
### 3.0 Network properties:
dutch-auction-contracts\hardhat.config.js currently set for hardhat localhost network default settings: 

    networks: {
        hardhat: { chainId: 1337 }, //Default on host: 127.0.0.1, port: 8545
    },
   
### 3.1 Compile written smart contract:

    npx hardhat compile
    
### 3.2 Starting Hardhat network:

    //This will start a local Ethereum network and provide you with a list of accounts and their private keys.
    npx hardhat node

### 3.3 Deployment of auction contract (use a separate cmd from 3.2):

    npx hardhat run scripts/deploy.js --network localhost
    //Output: Address of deployed auction & CVN token address
    

### 3.4 To generate test/test coverage for written contracts:

    npx hardhat test
    
    npx hardhat coverage

## 4. Setting up MetaMask in Browser
### 4.2 Setup Metamask with Hardhat network (You need to have an existing Metamask account)
To set up Metamask with a Hardhat network, install Metamask plugin (if you haven't), in Metamask settings, add a new network with the following:

    o   Open MetaMask, go to settings, click on network section, click on network & click on "add network manually"
        o   Use the details provided:
        o	Network Name: Localhost 8545
        o	RPC URL: http://127.0.0.1:8545
        o	Chain ID: 1337
        o	Currency Symbol: ETH
        o	Block explorer URL (Optional): Leave blank

### 4.3 Import Hardhat account in Metamask:
Open MetaMask, go to accounts, click on add account, click on import account & paste the private key of a hardhat account (Can be obtained in 3.2)

## 5. Configure and run web server

### 5.1 Amend constant values that are needed before running the webserver
Main page is in src\app\page.js

src\app\constants.js holds contractAddress to be edited when a contract is first deployed/redeployed through hardhat (Info can be obtained in 3.2 & 3.3):

    o  contractAddress (The address of the deployed smart contract)
    o  tokenAddress (The address of the deployed ERC20 smart contract)
    o  ownerPK (The private key of the account used to deploy the smart contract)

## 5.2 Run the following command in **root** directory to start the web server

    //URL of the web server will be shown e.g. http://localhost:3000
    npm run dev
 
