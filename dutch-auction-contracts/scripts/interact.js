module.exports = async function (callback) {
    try {
        const DutchAuction = artifacts.require("DutchAuction");
        const dutchInstance = await DutchAuction.deployed();
        const accounts = await web3.eth.getAccounts();

        // console.log(accounts);
        // Call startAuction from accounts[0]
        // await dutchInstance.startAuction(600, { from: accounts[0] });

        // const bidAmount = web3.utils.toWei("1", "ether");
        // let response = await dutchInstance.bid({ from: accounts[1], value: bidAmount });
        // console.log(response);
        callback();
    } catch (error) {
        console.error(error);
        callback(error);
    }
};

