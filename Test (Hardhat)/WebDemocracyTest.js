const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { providers } = require("web3");
const { BigNumber } = require("ethers");

describe("WebDemocracy", function () {
  async function deployment() {
    const [
      owner,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      account7, // Seller
      account8, // Buyer
      AppealJuror1,
      AppealJuror2,
      AppealJuror3,
    ] = await ethers.getSigners();

    const ownerBalance = await ethers.provider.getBalance(owner.address);

    const WebDemocracy = await ethers.getContractFactory("WebDemocracy");
    const webDemocracy = await WebDemocracy.deploy(owner.address);

    await webDemocracy.deployed();
    console.log("\n-WebDemocracy owner address is:", owner.address);
    console.log("-WebDemocracy address is:", webDemocracy.address);

    const Ecommerce = await ethers.getContractFactory("Ecommerce");
    const ecommerce = await Ecommerce.connect(account7).deploy(
      webDemocracy.address
    );
    await ecommerce.deployed();

    // Adjust time to vote (1 day)
    const day = 24 * 60 * 60; // 24 hours * 60 minuts * 60 secconds (1 day)
    const now = Date.now();

    // Check balance after deployment WebDemocracy SC
    const balanceOwnerAfterDeployment = await ethers.provider.getBalance(
      owner.address
    );

    const feeWebDemocracyDeployment =
      Number(ownerBalance) - Number(balanceOwnerAfterDeployment);
    console.log(
      `* Fee paid after deployment Web Democracy contract: ${ethers.utils.formatEther(
        String(feeWebDemocracyDeployment)
      )} Ethers`
    );

    return {
      owner,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      webDemocracy,
      ecommerce,
      account7, // Seller
      account8, // Buyer
      day,
      now,
      AppealJuror1,
      AppealJuror2,
      AppealJuror3,
    };
  }

  // Check that the Seller and Buyer´s addres are set. Also, try to withdrawn the total Smart contrac value. ECOMMERCE
  it("Check Buyer and Seller and try to withdrawn Ecommerce", async function () {
    const { ecommerce, account7, account8 } = await loadFixture(deployment);

    // Purchase of the product in the Ecommerce contract
    await ecommerce
      .connect(account8)
      .buyProduct({ value: ethers.utils.parseEther("10") });

    const buyer = await ecommerce.checkBuyer();
    const seller = await ecommerce.checkSeller();
    console.log("-buyer: ", buyer);
    console.log("-Seller: ", seller);

    // Expect reverted if the withdrawnTime to open a dispute is not over
    await expect(ecommerce.connect(account8).withdrawal()).to.be.revertedWith(
      "The withdrawn time is not over"
    );

    // Expect account8 to be set as Buyer
    expect(buyer).to.equal(account8.address);
    // Expect account7 to be set as Seller
    expect(seller).to.equal(account7.address);
  });

  // Generate a dispute from the ECOMMERCE contract.
  it("Generate dispute from Ecommerce", async function () {
    const {
      owner,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      webDemocracy,
      ecommerce,
      account7, // Seller
      account8, // Buyer
    } = await loadFixture(deployment);

    // Purchase of the product in the Ecommerce contract (Item price is 10 Eth)
    await ecommerce
      .connect(account8)
      .buyProduct({ value: ethers.utils.parseEther("10") });

    // Get arbitration Fee
    const arbitrationFee = await ecommerce.checkArbitrationFee();

    // 1st call to Generate dispute for the Ecommerce contract (Buyer)
    await ecommerce
      .connect(account8)
      .generateDispute({ value: ethers.utils.parseEther("0.0075") });

    // 2nd call to Generate dispute form the Ecommerce contract (Seller)
    await ecommerce
      .connect(account7)
      .generateDispute({ value: ethers.utils.parseEther("0.0075") });

    const balanceEcommerce = await ethers.provider.getBalance(
      ecommerce.address
    );

    console.log(
      "\n-Total value for the purchase: ",
      ethers.utils.parseEther("10")
    );
    console.log("-Total Fee for the dispute: ", arbitrationFee);
    console.log("-Total value after generate the dispute:", balanceEcommerce);

    expect(ethers.utils.parseEther("10")).to.equal(balanceEcommerce);
  });

  // Buy tokens with Owner, stake them and unstake half of the staked tokens
  it("Buy, Stake and Unstake ", async function () {
    const { owner, webDemocracy } = await loadFixture(deployment);
    // Buy tokens
    await webDemocracy.buyTokens(1000, {
      value: ethers.utils.parseEther("1"),
    });

    // Stake 1000 tokens
    await webDemocracy.stake(1000);

    const balanceOwnerBefore = await webDemocracy.checkTokensStaked(
      owner.address
    );

    // Unstake 500 tokens
    await webDemocracy.unStake(500, owner.address);
    const balanceOwnerAfter = await webDemocracy.balanceUser(owner.address);

    console.log(`\n-Tokens staked by owner:`, balanceOwnerBefore);
    console.log("-Owner balance after unstake -500 DEM:", balanceOwnerAfter);

    expect(balanceOwnerAfter).to.equal(500);
  });

  // Buy tokens with Account 1 and transfesr to Account 2
  it("Buy and Transfer tokens", async function () {
    const { account1, account2, webDemocracy } = await loadFixture(deployment);

    await webDemocracy.connect(account1).buyTokens(1000, {
      value: ethers.utils.parseEther("1"),
    });
    const balanceAddr2Before = await webDemocracy.balanceUser(account2.address);

    await webDemocracy.connect(account1).transfer(account2.address, 1000);

    const balanceAddr2After = await webDemocracy.balanceUser(account2.address);

    expect(balanceAddr2After).to.equal(1000);
    console.log("\n-Addr2 balance before transfer:", balanceAddr2Before);
    console.log("-Addr2 balance after transfer received:", balanceAddr2After);
  });

  // Update token price and check that it was updated.
  it("Update token price", async function () {
    const { webDemocracy } = await loadFixture(deployment);

    const oldTokenPrice = await webDemocracy.checkTokenPrice();

    await webDemocracy.updateTokenPrice(ethers.utils.parseEther("0.05"));

    const newTokenPrice = await webDemocracy.checkTokenPrice();

    console.log(
      `-Old token price is: ${ethers.utils.formatEther(
        oldTokenPrice
      )} Ethers each DEM`
    );
    console.log(
      `-New token price is: ${ethers.utils.formatEther(
        newTokenPrice
      )} Ethers each DEM`
    );

    expect("0.05").to.equal(ethers.utils.formatEther(newTokenPrice));
  });

  // Change the protocolWorking value to false;
  it("Stop and restart new disputes", async function () {
    const { owner, day, now, webDemocracy } = await loadFixture(deployment);

    // Stop disputes
    await webDemocracy.stopStartNewDisputes();

    await expect(
      webDemocracy.generateDispute(owner.address, owner.address, now + day, 3, {
        value: ethers.utils.parseEther("0.015"),
      })
    ).to.be.revertedWith("Protocol under maintenance");

    // Reanude disputes
    await webDemocracy.stopStartNewDisputes();

    await webDemocracy.generateDispute(
      owner.address,
      owner.address,
      now + day,
      3,
      {
        value: ethers.utils.parseEther("0.015"),
      }
    );
  });

  // Check if the Protocol fee is updated
  it("Update Web democracy fee", async function () {
    const { webDemocracy } = await loadFixture(deployment);

    await webDemocracy.updateWDFee(5);

    const updatedFee = await webDemocracy.checkWDFee();

    expect(updatedFee).to.equal(5);
  });

  // Buy tokens, stake, generate dispute, vote and penalize
  it("Full process WEB DEMOCRACY (Buy product (Eccomerce.sol), Buy tokens, Stake tokens, Generate dispute, Store Jury, Vote, Penalize, ", async function () {
    const {
      owner,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      account7, // Seller
      account8, // Buyer
      webDemocracy,
      ecommerce,
      day,
      now,
      AppealJuror1,
      AppealJuror2,
      AppealJuror3,
    } = await loadFixture(deployment);

    // Buy and Stake tokens for Jury to vote and be penalized
    await webDemocracy
      .connect(account3)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(account4)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(account5)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(account6)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(AppealJuror1)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(AppealJuror2)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });
    await webDemocracy
      .connect(AppealJuror3)
      .buyTokens(1000, { value: ethers.utils.parseEther("1") });

    await webDemocracy.connect(account3).stake(500);
    await webDemocracy.connect(account4).stake(500);
    await webDemocracy.connect(account5).stake(500);
    await webDemocracy.connect(account6).stake(500);
    await webDemocracy.connect(AppealJuror1).stake(500);
    await webDemocracy.connect(AppealJuror2).stake(500);
    await webDemocracy.connect(AppealJuror3).stake(500);

    const balanceAcco5Before = await webDemocracy.balanceUser(account5.address);
    const amountStakedBefore = await webDemocracy.amountStaked(
      account5.address
    );
    console.log("\n-Balance account 5 before penalized: ", balanceAcco5Before);
    console.log("-Amount staked before penalized:", amountStakedBefore);

    // Purchase of the product in the Ecommerce contract
    await ecommerce
      .connect(account8)
      .buyProduct({ value: ethers.utils.parseEther("10") });

    // 1st call to Generate dispute for the Ecommerce contract (Buyer)
    await ecommerce
      .connect(account8)
      .generateDispute({ value: ethers.utils.parseEther("0.0075") });

    // 2nd call to Generate dispute form the Ecommerce contract (Seller)
    await ecommerce
      .connect(account7)
      .generateDispute({ value: ethers.utils.parseEther("0.0075") });

    const balanceEcommerce = await ethers.provider.getBalance(
      ecommerce.address
    );

    console.log(
      "\n-Total balance Ecommerce contract after generating Dispute:",
      balanceEcommerce
    );

    // Store Jury (Jury selected from active Jury) - Offchain
    await webDemocracy.storeJurys(0, [
      account3.address,
      account4.address,
      account5.address,
    ]);

    // // Voting from 2 Jury selected
    await webDemocracy.connect(account3).vote(0, 1);
    await webDemocracy.connect(account4).vote(0, 1);

    // Try to vote 2 times with the same Juror
    await expect(webDemocracy.connect(account4).vote(0, 1)).to.be.revertedWith(
      "You are not allow to vote"
    );

    // Increase the time to revocate a Juror
    await ethers.provider.send("evm_increaseTime", [now + day]);

    // Penalize Juror who did not vote and add a new juror (selected from active Jury) - Offchain
    await webDemocracy
      .connect(owner)
      .revocateJuror(account5.address, account6.address, 0, day);

    // Check the staked balance decreased for been revotacted
    const balanceAcco5After = await webDemocracy.balanceUser(account5.address);
    const amountStakedAfter = await webDemocracy.amountStaked(account5.address);

    console.log("\n-Balance account 5 after penalized: ", balanceAcco5After);
    console.log("-Amount staked after penalized:", amountStakedAfter);

    // Get balance Juror BEFORE Withdrawal
    const balanceJurorWinner1Before = await ethers.provider.getBalance(
      account3.address
    );
    const balanceJurorWinner2Before = await ethers.provider.getBalance(
      account4.address
    );
    const balanceJurorLooser3Before = await ethers.provider.getBalance(
      account6.address
    );

    // Web democracy balance before withdraWal the fees and share the comisions
    const balanceWebDemocracyContractBefore = await ethers.provider.getBalance(
      webDemocracy.address
    );

    // Web Democracy owner balance before withdrawal the fees and get the protocol comision
    const balanceOwnerBefore = await ethers.provider.getBalance(owner.address);

    // New Juror votes
    await webDemocracy.connect(account6).vote(0, 2);

    // Check right to vote when we remove a Juror and add a new one
    const acceptedJury = await webDemocracy.jurySelected(0);
    const rightToVote3 = await webDemocracy.juryRightToVote(
      0,
      account3.address
    );
    const rightToVote4 = await webDemocracy.juryRightToVote(
      0,
      account4.address
    );
    const rightToVote5 = await webDemocracy.juryRightToVote(
      0,
      account5.address
    );
    const rightToVote6 = await webDemocracy.juryRightToVote(
      0,
      account6.address
    );

    // Final Jury selected to vote
    console.log("\n-The accepted Jury is:", acceptedJury);
    console.log("\n-Account3: ", rightToVote3);
    console.log("-Account4: ", rightToVote4);
    console.log("-Account5 (Juror revocated): ", rightToVote5);
    console.log("-Account6 (New Juror): ", rightToVote6);

    // Get balance Juror AFTER Withdrawal
    const balanceJurorWinner1After = await ethers.provider.getBalance(
      account3.address
    );
    const balanceJurorWinner2After = await ethers.provider.getBalance(
      account4.address
    );
    const balanceJurorLooser3After = await ethers.provider.getBalance(
      account6.address
    );

    const rewardJuror1 =
      Number(balanceJurorWinner1After) - Number(balanceJurorWinner1Before);

    const rewardJuror2 =
      Number(balanceJurorWinner2After) - Number(balanceJurorWinner2Before);

    const penalizationJuror3 =
      Number(balanceJurorLooser3After) - Number(balanceJurorLooser3Before);

    console.log(
      `\n* Juror Winner 1 won: ${ethers.utils.formatEther(
        String(rewardJuror1)
      )} Ethers`
    );

    console.log(
      `\n* Juror Winner 2 won: ${ethers.utils.formatEther(
        String(rewardJuror2)
      )} Ethers`
    );

    console.log(
      `* Juror looser lost: ${ethers.utils.formatEther(
        penalizationJuror3
      )} Ethers`
    );

    expect(Number(balanceJurorWinner1After)).to.greaterThan(
      Number(balanceJurorWinner1Before)
    );

    const balanceOwnerAfter = await ethers.provider.getBalance(owner.address);

    const balanceWebDemocracyContractAfter = await ethers.provider.getBalance(
      webDemocracy.address
    );

    console.log(
      `\n* Contract Balance Before withdrawal: ${ethers.utils.formatEther(
        balanceWebDemocracyContractBefore
      )} Ethers`
    );

    console.log(
      `* Contract Balance After withdrawal: ${ethers.utils.formatEther(
        balanceWebDemocracyContractAfter
      )} Ethers`
    );

    console.log(
      `\n* WebDemocracy Owner Balance Before withdrawal: ${ethers.utils.formatEther(
        balanceOwnerBefore
      )} Ethers`
    );

    console.log(
      `* WebDemocracy Owner Balance After withdrawal: ${ethers.utils.formatEther(
        balanceOwnerAfter
      )} Ethers`
    );

    const protocolProfit =
      Number(balanceOwnerAfter) - Number(balanceOwnerBefore);

    console.log(
      `* The protocol profit for the dispute is: ${ethers.utils.formatEther(
        protocolProfit
      )} ETH`
    );

    // Get Winner position from Storage at Ecommerce contract and format bytes to match the Buyer address
    const winnerStorage = await ethers.provider.getStorageAt(
      ecommerce.address,
      1
    );

    console.log("*** Winner", winnerStorage);
    console.log("*** Seller", account7.address);

    const account8LowerCase = account8.address.toLowerCase();

    const winnerFormated = winnerStorage.slice(0, 2) + winnerStorage.slice(26);
    expect(winnerFormated.toLowerCase()).to.equal(account8LowerCase);
    console.log(
      `\n-Dispute winner is the Buyer with address: ${winnerFormated} `
    );

    //*** APELATION PROCESS FROM THE ECOMMERCE CONTRACT ***/

    // Expect reverted if the ColdDownTime to appeal has not passed
    await expect(ecommerce.connect(account8).withdrawal()).to.be.revertedWith(
      "You need to wait until the appeal time is over"
    );

    // Start apelation process
    await ecommerce
      .connect(account7)
      .appeal({ value: ethers.utils.parseEther("0.0075") });
    await ecommerce
      .connect(account8)
      .appeal({ value: ethers.utils.parseEther("0.0075") });

    // Store Jury for the apelation process
    await webDemocracy.storeJurys(0, [
      AppealJuror1.address,
      AppealJuror2.address,
      AppealJuror3.address,
    ]);

    // Voting process with the new Jury
    await webDemocracy.connect(AppealJuror1).vote(0, 1);
    await webDemocracy.connect(AppealJuror2).vote(0, 2);
    await webDemocracy.connect(AppealJuror3).vote(0, 2);

    // Check if the Seller was set as winnerç
    const winnerAppeal = await ecommerce.checkWinner();

    expect(winnerAppeal).to.equal(account7.address);

    console.log(
      `\n-Apelation winner is the Seller with address: ${winnerAppeal} `
    );

    //*** WITHDRAWAL PROCESS FROM ECOMMERCE CONTRACT (When dispute and apelation are finished).***/

    // Expect reverted if the ColdDownTime to appeal has not passed
    await expect(ecommerce.connect(account7).withdrawal()).to.be.revertedWith(
      "You need to wait until the appeal time is over"
    );

    // Increase time until
    await ethers.provider.send("evm_increaseTime", [now + day]);

    // Expect reverted if the ColdDownTime to appeal has not passed
    await expect(ecommerce.connect(account8).withdrawal()).to.be.revertedWith(
      "You are not the winner"
    );

    // Get the winner balance before and after to compare it
    const balanceWinnerBefore = await ethers.provider.getBalance(
      account7.address
    );

    await ecommerce.connect(account7).withdrawal();

    const balanceWinnerAfter = await ethers.provider.getBalance(
      account7.address
    );

    const winnerProfit =
      Number(balanceWinnerAfter) - Number(balanceWinnerBefore);

    console.log(
      `* After withdrawal Winner balance, winner balance increased: ${ethers.utils.formatEther(
        String(winnerProfit)
      )} Ethers`
    );

    // We expect it to be greater than 9, as it will consume some gas and will not be 10ETH
    expect(
      Number(ethers.utils.formatEther(balanceWinnerAfter)) -
        Number(ethers.utils.formatEther(balanceWinnerBefore))
    ).to.be.greaterThan(9);
  });
});
