# DutchAuction

1. Introduction

This is a project development submission for NTU SC4053 Blockchain Technology Course

Team Members
- Endy
- Jonathan Lim Jun Wei (U2121770L)
- JC

2. Setup Steps for Metamask
# 2.1 Configure MetaMask for Localhost (Hardhat Network):
    o   Open MetaMask and click on "add network manually"
        o   Use the details provided:
        o	Network Name: Localhost 8545
        o	RPC URL: http://127.0.0.1:8545
        o	Chain ID: 1337
        o	Currency Symbol: ETH
        o	Block explorer URL (Optional): Leave blank

3. How to start project locally

# 3.1 Install node dependencies
run the following command in the root of this project:
- npm install

# 3.2 Compile smart contracts
run the following command in the root of this project
- npm run compile


Main page is in src\app\page.js

Start auction is the second page in src\app\start-auction\page.js

src\app\constants.js holds contractAddress to be edited when contract is redeployed through hardhat

dutch-auction-contracts\hardhat.config.js currently set for hardhat localhost network default settings: 

    networks: {
        hardhat: { chainId: 1337 }, //Default on host: 127.0.0.1, port: 8545
    },

To set up meta mask for hardhat local, install meta mask plugin, add new network with 

Network Name: Localhost 8545 (or anything you prefer)
New RPC URL: http://127.0.0.1:8545 (or http://localhost:8545)

Chain ID: 1337

Currency Symbol: ETH

Block Explorer URL: (leave blank for local development)

For Next:

To install packages in package.json: **npm install**

To run next.js: 
    
    npm run dev

For Hardhat:

To install packages in package.json: **npm install**

Starting Hardhat network:

    //This will start a local Ethereum network and provide you with a list of accounts and their private keys.
    npx hardhat node 

Interaction/Deployment of contract:

    npx hardhat run scripts/deploy.js --network localhost
    
    npx hardhat run scripts/interact.js --network localhost

OR

    npx hardhat console --network localhost

Test:

    npx hardhat test
    
    npx hardhat coverage

