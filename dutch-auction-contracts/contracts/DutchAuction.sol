// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChainvisionToken.sol";

contract DutchAuction is Ownable, ReentrancyGuard {
    ChainvisionToken public token;
    uint public initialPrice;
    uint public finalPrice;
    uint public minPrice = 100000000000000000; //0.1eth
    uint public startTime;
    uint public endTime;
    uint public totalSupply;
    uint public estRemainingSupply;
    bool public auctionActive;
    bool internalCall = false;

    struct Bid {
        address bidder;
        uint256 amount;
    }

    Bid[] public bidsQueue;
    // Mapping to track how many tokens each bidder reserved
    mapping(address => uint) public reservedTokensByBidder;

    event AuctionStarted(uint startTime, uint endTime);
    event AuctionEnded(uint endTime);
    event TokensReserved(
        address indexed bidder,
        uint tokensAmount,
        uint tokenPrice
    );
    event TokensWithdrawn(address indexed bidder, uint amount);
    event RefundAmount(address bidder, uint amount);
    event BidSuccess(address bidder, uint amount);

    constructor(uint _initialPrice, uint _totalSupply) Ownable(msg.sender) {
        require(_initialPrice > 0, "Starting price must be greater than zero");
        require(_totalSupply > 0, "Total supply must be greater than zero");

        initialPrice = _initialPrice;
        totalSupply = _totalSupply;
        estRemainingSupply = _totalSupply;
        auctionActive = false;
        token = new ChainvisionToken();
    }

    modifier activeAuction() {
        require(isAuctionActive(), "Auction is not active");
        _;
    }

    modifier notActiveAuction() {
        require(!isAuctionActive(), "Auction is still active");
        _;
    }

    modifier onlyOwnerOrInternal() {
        require(
            msg.sender == owner() || internalCall,
            "You are not authorized to make this call"
        );
        _;
    }

    //Fallback function to receive any ether that has no msg.data
    receive() external payable {}

    //Need to call from to start auction
    function startAuction(uint duration) external onlyOwner notActiveAuction {
        require(duration >= 60, "Minimum duration is 60");
        startTime = block.timestamp;
        endTime = block.timestamp + duration;
        auctionActive = true;

        emit AuctionStarted(startTime, endTime);
    }

    //Need to call from frontend to end auction once timer is up
    function finalizeAuction()
        public
        activeAuction
        onlyOwnerOrInternal
        nonReentrant
    {
        require(
            !_isAuctionRunning() || _isSupplyDepleted(),
            "Auction duration has not passed or tokens still remain"
        );

        auctionActive = false;
        //Ensure call to this function is only made available through internal call within contract and owner call
        internalCall = false;

        uint remainingTokens = totalSupply;
        uint bidIndex = 0;

        //Go through all bidders, allocate them tokens and refund any excess eth
        while (remainingTokens > 0 && bidIndex < bidsQueue.length) {
            Bid memory currentBid = bidsQueue[bidIndex];
            uint bidderAmount = currentBid.amount;
            uint pricePerToken = finalPrice;

            uint tokensToBuy = bidderAmount / pricePerToken;
            if (tokensToBuy > remainingTokens) {
                tokensToBuy = remainingTokens;
            }

            uint totalCost = tokensToBuy * pricePerToken;
            uint refund = bidderAmount - totalCost;

            if (tokensToBuy > 0) {
                reservedTokensByBidder[currentBid.bidder] += tokensToBuy;
                remainingTokens -= tokensToBuy;
                emit TokensReserved(
                    currentBid.bidder,
                    tokensToBuy,
                    pricePerToken
                );
            }

            if (refund > 0) {
                _refundAmount(currentBid.bidder, refund);
                emit RefundAmount(currentBid.bidder, refund);
            }

            bidIndex++;
        }

        //Make full refund to bidders that did not get allocated any tokens
        while (bidIndex < bidsQueue.length) {
            Bid memory currentBid = bidsQueue[bidIndex];
            _refundAmount(currentBid.bidder, currentBid.amount);
            emit RefundAmount(currentBid.bidder, currentBid.amount);

            bidIndex++;
        }

        //Reset auction variables
        finalPrice = initialPrice;
        estRemainingSupply = totalSupply;
        delete bidsQueue;

        emit AuctionEnded(block.timestamp);
    }

    //Need to call from frontend to participate in the auction for bidders
    function bid() external payable activeAuction {
        require(_isAuctionRunning(), "Auction has ended");
        finalPrice = getCurrentPrice();
        uint pricePerToken = finalPrice;
        uint tokenReserved = msg.value / pricePerToken;

        if (tokenReserved > estRemainingSupply) {
            tokenReserved = estRemainingSupply;
        }

        estRemainingSupply -= tokenReserved;

        bidsQueue.push(Bid({bidder: msg.sender, amount: msg.value}));

        emit BidSuccess(msg.sender, pricePerToken);
        if (_isSupplyDepleted()) {
            internalCall = true;
            finalizeAuction();
        }
    }

    //Need to call from frontend to get latest price per token
    function getCurrentPrice() public view returns (uint) {
        if (!_isAuctionRunning()) {
            return finalPrice;
        }
        uint timeElapsed = block.timestamp - startTime;
        uint priceDrop = (initialPrice - minPrice) / (endTime - startTime);
        uint currentPrice = initialPrice - (priceDrop * timeElapsed);
        return currentPrice < minPrice ? minPrice : currentPrice;
    }

    //Need to call from frontend for bidders to withdraw their tokens
    // Allow bidders to withdraw their reserved tokens after the auction ends
    function withdrawTokens() external notActiveAuction nonReentrant {
        uint reservedAmount = reservedTokensByBidder[msg.sender];
        require(reservedAmount > 0, "No reserved tokens to withdraw");

        reservedTokensByBidder[msg.sender] = 0;

        token.mintTokens(msg.sender, reservedAmount);

        emit TokensWithdrawn(msg.sender, reservedAmount);
    }

    //Need to call from frontend for owner to retrieve eth stored in this contract
    // Withdraw funds to the auction owner
    function withdrawFunds() external onlyOwner nonReentrant {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");

        require(success, "Funds not withdrawn successfully");
    }

    function _refundAmount(address bidder, uint amount) internal {
        (bool success, ) = bidder.call{value: amount}("");
        require(success, "Funds not refunded successfully");
    }

    function _isAuctionRunning() internal view returns (bool) {
        return block.timestamp < endTime ? true : false;
    }

    function _isSupplyDepleted() internal view returns (bool) {
        return estRemainingSupply <= 0 ? true : false;
    }

    function isAuctionActive() public view returns (bool) {
        return auctionActive;
    }

    function getRemainingTime() public view activeAuction returns (uint) {
        return endTime - block.timestamp;
    }

    function getEndTime() public view returns (uint) {
        return endTime;
    }

    function getStartTime() public view returns (uint) {
        return startTime;
    }

    function getestRemainingSupply() public view returns (uint) {
        return estRemainingSupply;
    }

    function getReservedToken() external view returns (uint) {
        return reservedTokensByBidder[msg.sender];
    }

    function getBidsQueueLength() external view returns (uint) {
        return bidsQueue.length;
    }

    //Can call to obtain the current timestamp in the blockchain from frontend
    function getCurrentTimestamp() external view returns (uint) {
        return block.timestamp;
    }

    //Need to call this to simulate the ticking of timestamp by mining an empty block
    function triggerDummyBlock() external {}

    //This function is created for reentrancy attack test purpose only
    function refundAmountPublic(
        address bidder,
        uint amount
    ) external nonReentrant {
        (bool success, ) = bidder.call{value: amount}("");
        require(success, "Funds not refunded successfully");
    }
}
