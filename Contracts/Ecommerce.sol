// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/* 
    The E-commerce smart contract should have the function Generate Dispute,
    to send the funds to the Arbitrage.sol contract and start the judge.

    Depending on the deal we reach with the company, they wil set in their contract the amount of jurys they will request.
    For example, for this Ecommerce contract the jurys needed will be only 5.

    All the funds in the contract must be blocked, it can only be withdrawal from the dispute contract if a dispute started.
*/

import "./WebDemocracy.sol";

contract Ecommerce {
    // The company will have to add the Arbitration address when creating a new contract
    WebDemocracy arbitrage;

    address public buyer;
    address public seller;
    address public winner;
    uint24 public dificulty = 1 days; // Easy (Ecommerce)
    uint256 public disputeFee; // Aprox 10$
    uint256 public disputeFeeReceived;
    bool public disputeRequested;
    uint8 public nbJuryNeeded = 3; // Set by default for Ecommerce contracts, depending on the arrangement with the partner it could change.
    uint256 coldDowntimeAppeal;
    uint256 withdrawnTime;
    bool disputeGenerated;
    /* Dispute levels.*/
    uint256 easy = block.timestamp + 1 days; // Easy level.
    // uint intermediate = block.timestamp + 1 weeks; // Intermediate level.
    // uint dificult = block.timestamp + 4 weeks; // Dificult level.

    modifier onlyArbitrage() {
        require(
            msg.sender == address(arbitrage),
            "You are not the Arbitrage contract"
        );
        _;
    }

    constructor(WebDemocracy _arbitrage) {
        seller = msg.sender;
        arbitrage = _arbitrage;
    }

    /* @dev this function will call the function generateDispute() from the Arbitrage contract and send ethers for the dispute fee.
            Also, it will start the decentralized dispute, generating random judges and allowing them to vote.
            The msg.value should be at least half of the disputeFee, as it needs to be called twice , it will transfer the total disputeFee value.
    */
    function generateDispute() public payable {
        require(
            msg.sender == buyer || msg.sender == seller,
            "You need to be the Buyer or the Seller"
        );
        disputeFee = checkArbitrationFee();
        require(msg.value >= disputeFee / 2);
        require(!disputeGenerated, "Only 1 dispute per SC");
        if (!disputeRequested) {
            disputeFeeReceived += disputeFee / 2;
            disputeRequested = true;
        } else {
            disputeFeeReceived += disputeFee / 2;
            // We will do a call to the Arbitrage SC and the address will be assigned to disputasSC
            (arbitrage).generateDispute{value: disputeFee}(
                buyer,
                seller,
                easy,
                nbJuryNeeded
            );
            disputeGenerated = true; // Set the value to only be called once
        }
    }

    function appeal(uint256 _disputeID) public {
        require(
            msg.sender == buyer || msg.sender == seller,
            "You need to be the Buyer or the Seller"
        );
        arbitrage.appeal(_disputeID, nbJuryNeeded, dificulty);
    }

    /* @dev this function will allow the winner to withdrawal the total balance in the contract
     */
    function withdrawal() external {
        require(
            withdrawnTime > block.timestamp,
            "The withdrawn time is not over"
        );
        require(
            coldDowntimeAppeal <= block.timestamp,
            "You need to wait until the appeal time is over"
        );
        require(winner == msg.sender, "You are not the winner");
        payable(winner).transfer(address(this).balance);
    }

    function checkBuyer() public view returns (address) {
        return buyer;
    }

    function checkSeller() public view returns (address) {
        return seller;
    }

    /* @dev The Arbitrage contract will set the winner externally and
     *  Setter for the cold down time in case complainants want to appel. They cannot withdraw the contract value until it has passed
     */
    function setWinner(address _winner) external onlyArbitrage {
        winner = _winner;
        coldDowntimeAppeal = 1 days + block.timestamp;
    }

    function buyProduct() public payable {
        require(
            msg.value >= 10 ether,
            "You need to send more ETH to buy the product"
        );
        buyer = msg.sender;
        withdrawnTime = 1 weeks + block.timestamp;
    }

    function checkArbitrationFee() public view returns (uint256) {
        return arbitrage.arbitrationFee(nbJuryNeeded);
    }
}
