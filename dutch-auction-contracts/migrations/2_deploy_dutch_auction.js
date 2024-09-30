const ChainvisionToken = artifacts.require("ChainvisionToken");
const DutchAuction = artifacts.require("DutchAuction");

module.exports = async function (deployer) {
  const startingPrice = web3.utils.toWei('1', 'ether');  // Starting price of 1 ETH
  const totalSupply = 100;  // Total tokens available in the auction

  deployer.deploy(DutchAuction, startingPrice, totalSupply)
    .then(() => {
      console.log("DutchAuction contract deployed successfully!");
    }).catch(error => {
      console.error("Error deploying DutchAuction contract:", error);
    });
};
