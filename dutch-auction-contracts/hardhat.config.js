/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.22",
  networks: {
    hardhat: { chainId: 1337 },
    // Add other networks as needed
  },
};
