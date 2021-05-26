const Link = artifacts.require("Link");
// const ETH = artifacts.require("ETH");
const Dex = artifacts.require("Dex");
module.exports = async function (deployer,network, accounts) {
  await deployer.deploy(Link);
  // await deployer.deploy(ETH);
  //await deployer.deploy(Dex);
  //let dex = await Dex.deployed()
  //let eth = await ETH.deployed()
  //await eth.approve(dex.address, 5000)
  //dex.addToken(web3.utils.fromUtf8("ETH"), eth.address)
  // await dex.deposit(web3.utils.fromUtf8("LINK"),100)
  // let balanceOfLink = await dex.getBalance(accounts[0], web3.utils.fromUtf8("LINK"))
  // console.log("balanceOfLink: "+balanceOfLink)
};
