const ChainvisionToken = artifacts.require("ChainvisionToken");
const DutchAuction = artifacts.require("DutchAuction");

module.exports = async function (deployer) {
  const startingPrice = web3.utils.toWei('1', 'ether');  // Starting price of 1 ETH
  const discountRate = web3.utils.toWei('0.01', 'ether');  // Discount rate of 0.01 ETH per second
  const totalSupply = 1000;  // Total tokens available in the auction

  await deployer.deploy(ChainvisionToken);
  const tokenInstance = await ChainvisionToken.deployed()

  deployer.deploy(DutchAuction, startingPrice, discountRate, totalSupply, tokenInstance.address)
    .then(() => {
      console.log("DutchAuction contract deployed successfully!");
    }).catch(error => {
      console.error("Error deploying DutchAuction contract:", error);
    });
};
