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

