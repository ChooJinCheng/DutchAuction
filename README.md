Main page is in src\app\page.js

Start auction is the second page in src\app\start-auction\page.js

src\app\constants.js holds contractAddress to be editted when contract is redeployed through truffle

dutch-auction-contracts\truffle-config.js currently set for ganache CLI default settings: 
development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gas: 8000000,
     },
     
to install packages in package.json: npm install

to run ganache-cli: ganache-cli

to run next.js: npm run dev

to run truffle after edit to contract: truffle migrate --reset --network development



