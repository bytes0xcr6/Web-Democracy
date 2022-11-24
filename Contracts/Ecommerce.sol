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
    uint256 disputeID;
    uint24 public dificulty = 1 days; // Easy (Ecommerce)
    uint256 public disputeFee; // Aprox 10$
    uint256 public disputeFeeReceived;
    uint256 public apelationFeeReceived;
    bool public disputeRequested;
    uint8 public nbJuryNeeded = 3; // Set by default for Ecommerce contracts, depending on the arrangement with the partner it could change.
    uint256 coldDowntimeAppeal;
    uint256 withdrawalTime;
    bool disputeGenerated;
    bool ApelationGenerated;
    bool underApelation;
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

    modifier onlyComplainants() {
        require(
            msg.sender == buyer || msg.sender == seller,
            "You need to be a Seller or Buyer"
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
    function generateDispute() public payable onlyComplainants {
        require(
            msg.sender == buyer || msg.sender == seller,
            "You need to be the Buyer or the Seller"
        );
        disputeFee = checkArbitrationFee();
        require(msg.value >= disputeFee / 2, "Send half of the Jury fee");
        require(!disputeGenerated, "Only 1 dispute per SC");
        require(!underApelation, "Apelation processed or finished");
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
            withdrawalTime = 0; // Set withdrawal time to 0
        }
    }

    function appeal() public payable onlyComplainants {
        require(
            msg.sender == buyer || msg.sender == seller,
            "You need to be the Buyer or the Seller"
        );
        require(msg.value >= disputeFee / 2, "Send half of the Jury fee");

        if (!underApelation) {
            apelationFeeReceived += disputeFee / 2;
            underApelation = true;
        } else {
            apelationFeeReceived += disputeFee / 2;
            // We will do a call to the Arbitrage SC and the address will be assigned to disputasSC
            arbitrage.appeal{value: disputeFee}(
                disputeID,
                nbJuryNeeded,
                dificulty
            );
            disputeGenerated = true; // Set the value to only be called once
            withdrawalTime = 0; // Set withdrawal time to 0
        }
    }

    /* @dev this function will allow the winner to withdrawal the total balance in the contract or 
     *  the Seller if the withdrawalTime is over and it is not under dispute or under appelation
     */
    function withdrawal() external {
        require(
            withdrawalTime < block.timestamp || withdrawalTime == 0,
            "The withdrawal time is not over"
        );
        require(
            coldDowntimeAppeal <= block.timestamp,
            "You need to wait until the appeal time is over"
        );
        if (disputeRequested) {
            require(winner == msg.sender, "You are not the winner");
        }
        payable(winner).transfer(address(this).balance);
    }

    function checkBuyer() public view returns (address) {
        return buyer;
    }

    function checkSeller() public view returns (address) {
        return seller;
    }

    function checkWinner() public view returns (address) {
        return winner;
    }

    /* @dev The Arbitrage contract will set the winner externally and
     *  Setter for the cold down time in case complainants want to appel. They cannot withdraw the contract value until it has passed
     */
    function setWinner(address _winner, uint256 _disputeID)
        external
        onlyArbitrage
    {
        winner = _winner;
        disputeID = _disputeID;

        if (!underApelation) {
            coldDowntimeAppeal = 1 days + block.timestamp;
        }
    }

    function buyProduct() public payable {
        require(
            msg.value >= 10 ether,
            "You need to send more ETH to buy the product"
        );
        buyer = msg.sender;
        withdrawalTime = 1 weeks + block.timestamp;
    }

    function checkArbitrationFee() public view returns (uint256) {
        return arbitrage.arbitrationFee(nbJuryNeeded);
    }
}
