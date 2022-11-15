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
    WebDemocracy disputeSC;

    address public buyer;
    address public seller;
    address public winner;
    uint24 public dificulty = 1 days; // Easy (Ecommerce)
    uint public disputeFee = 0.005 ether; // Aprox 10$
    bool public disputeRequested;
    uint8 public nbJurysNeeded = 5;

    enum Status {
        NOTSTARTED,
        STARTED,
        FINISHED
    }

    Status disputeStatus;

    modifier onlyArbitrage() {
        require(msg.sender == address(disputeSC));
        _;
    }

    constructor(
        address _buyer,
        address _seller,
        WebDemocracy _disputeSC
    ) {
        buyer = _buyer;
        seller = _seller;
        disputeSC = _disputeSC;
    }

    /* @dev this function will call the function generateDispute() from the Arbitrage contract and send ethers for the dispute fee.
            Also, it will start the decentralized dispute, generating random judges and allowing them to vote.
            The msg.value should be at least half of the disputeFee, as it needs to be called twice , it will transfer the total disputeFee value.
    */
    function generateDispute() public payable {
        require(msg.sender == buyer || msg.sender == seller);
        require(msg.value >= disputeFee / 2);
        payable(disputeSC).transfer(msg.value);
        if (!disputeRequested) {
            disputeRequested = true;
        } else {
            // We will do a call to the Arbitrage SC and the address will be assigned to disputasSC
            disputeSC.generateDispute(buyer, seller, dificulty, nbJurysNeeded);
            disputeStatus = Status.STARTED;
        }
    }

    /* @dev this function will allow the winner to withdrawal the total balance in the contract
     */
    function withdrawal(address _winner) external {
        require(address(disputeSC) == msg.sender);
        winner = _winner;
        payable(winner).transfer(address(this).balance);
        disputeStatus = Status.FINISHED;
    }

    function checkBuyer() public view returns (address) {
        return buyer;
    }

    function checkSeller() public view returns (address) {
        return seller;
    }

    function checkStatusDispute() public view returns (Status) {
        return disputeStatus;
    }

    /* @dev The Arbitrage contract will set the winner externally
     */
    function setWinner(address _winner) external onlyArbitrage {
        winner = _winner;
    }
}
