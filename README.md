Main page is in src\app\page.js

Start auction is the second page in src\app\start-auction\page.js

src\app\constants.js holds contractAddress to be editted when contract is redeployed through truffle

dutch-auction-contracts\truffle-config.js currently set for ganache CLI default settings: 
development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gas: 8000000,
     },
     
to set up meta mask for ganache-cli, install meta mask plugin, add new network with 

Network Name: Localhost 7545 (or anything you prefer)

New RPC URL: http://127.0.0.1:7545 (or http://localhost:7545)

Chain ID: 1337 (Ganache’s default chain ID)

Currency Symbol: ETH

Block Explorer URL: (leave blank for local development)

For Next:
to install packages in package.json: npm install

to run ganache-cli: ganache-cli

to run next.js: npm run dev

For Truffle:

To install packages in package.json: npm install

To run truffle after contract is edited for redeployment: truffle migrate --reset --network development
