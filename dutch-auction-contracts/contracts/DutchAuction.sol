// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DutchAuction {
    uint public startingPrice;
    uint public discountRate;
    uint public startAt;
    uint public endAt;
    uint public totalSupply;
    uint public remainingSupply;
    uint public reservedTokens;
    bool public auctionActive;
    address public auctionOwner;

    // Mapping to track how many tokens each bidder reserved
    mapping(address => uint) public reservedTokensByBidder;

    event AuctionStarted(uint startAt, uint endAt);
    event TokensReserved(address indexed bidder, uint amount, uint totalPrice);
    event AuctionEnded(uint endAt);
    event TokensWithdrawn(address indexed bidder, uint amount);

    // Constructor with require checks to avoid invalid input values
    constructor(uint _startingPrice, uint _discountRate, uint _totalSupply) {
        require(_startingPrice > 0, "Starting price must be greater than zero");
        require(_discountRate > 0, "Discount rate must be greater than zero");
        require(_totalSupply > 0, "Total supply must be greater than zero");

        startingPrice = _startingPrice;
        discountRate = _discountRate;
        totalSupply = _totalSupply;
        remainingSupply = _totalSupply;
        auctionActive = false;
        auctionOwner = msg.sender;  // Set the owner
    }

    // Start the auction
    function startAuction(uint duration) external {
        require(msg.sender == auctionOwner, "Only auction owner can start the auction");
        require(!auctionActive, "Auction is already active");
        startAt = block.timestamp;
        endAt = block.timestamp + duration;
        auctionActive = true;

        emit AuctionStarted(startAt, endAt);
    }

    // Fetch the current price based on time elapsed
    function getCurrentPrice() public view returns (uint) {
        require(auctionActive, "Auction is not active");
        uint timeElapsed = block.timestamp - startAt;
        uint discount = timeElapsed * discountRate;
        if (startingPrice > discount) {
            return startingPrice - discount;
        } else {
            return 0;
        }
    }

    // New function to fetch average price
    function getAveragePrice() public view returns (uint) {
        require(totalSupply > 0, "No tokens available");
        return startingPrice / 2;  // Example logic for calculating average price
    }

    // Reserve tokens and accept payment
    function reserveTokens(uint amount) public payable {
        require(auctionActive, "Auction is not active");
        require(amount > 0 && amount <= remainingSupply, "Invalid token amount");
        uint currentPrice = getCurrentPrice();
        uint totalPrice = currentPrice * amount;
        require(msg.value >= totalPrice, "Insufficient ETH to cover token cost");

        reservedTokens += amount;
        remainingSupply -= amount;
        reservedTokensByBidder[msg.sender] += amount;  // Track bidder's reserved tokens

        // Refund excess ETH if the user overpaid
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit TokensReserved(msg.sender, amount, totalPrice);
    }

    // End the auction
    function endAuction() public {
    require(auctionActive, "Auction is not active");
    require(block.timestamp >= endAt || remainingSupply == 0, "Auction duration has not passed or tokens still remain");

    auctionActive = false;

    // Emit the auction ended event
    emit AuctionEnded(block.timestamp);  // Emit current time, not endAt

    // Reset all auction variables if needed
    // Optional: Consider if the auction should reset certain values (remainingSupply, reservedTokens, etc.)
    }

    // Allow bidders to withdraw their reserved tokens after the auction ends
    function withdrawTokens() public {
        require(!auctionActive, "Auction is still active");
        uint reservedAmount = reservedTokensByBidder[msg.sender];
        require(reservedAmount > 0, "No reserved tokens to withdraw");

        reservedTokensByBidder[msg.sender] = 0;  // Reset the reserved tokens for the user
        emit TokensWithdrawn(msg.sender, reservedAmount);

        // Logic to transfer tokens would go here (if token management was implemented)
    }

    // Withdraw funds to the auction owner
    function withdrawFunds() public {
        require(msg.sender == auctionOwner, "Only auction owner can withdraw funds");
        payable(auctionOwner).transfer(address(this).balance);
    }

    // Fetch the auction end time
    function getEndTime() public view returns (uint) {
        return endAt;
    }

    // Check if the auction is active
    function isAuctionActive() public view returns (bool) {
        return auctionActive;
    }

    // Fetch the remaining token supply
    function getRemainingSupply() public view returns (uint) {
        return remainingSupply;
    }

    // Fetch the reserved tokens
    function getReservedTokens() public view returns (uint) {
        return reservedTokens;
    }
}
