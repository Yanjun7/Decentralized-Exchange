// The user must have ETH deposited such that deposited ETH >= buy order value
// The user must have token deposited such that deposited token >= sell order amount
// The BUY order book should be ordered on price from the highest to the lowest starting at index 0
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const ETH = artifacts.require("ETH")
const truffleAssert = require("truffle-assertions")

contract("Dex", accounts=>{
    it("The user must have ETH deposited such that deposited ETH >= buy order value", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let eth = await ETH.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),10, 1)
        )        
        await dex.deposit(100, web3.utils.fromUtf8("ETH"))
        
        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),10, 1)
        )
    })
    it("The user must have token deposited such that deposited token >= sell order amount", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),20, 1)
        ) 
        
        await link.approve(dex.address, 200)
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address,{from: accounts[0]})

        await truffleAssert.passes(
            dex.deposit(100, web3.utils.fromUtf8("LINK"))
        )
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),20, 1)
        )
    })
    it("The BUY order book should be ordered on price from the highest to the lowest", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let order1 = await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),5,7)
        let order2 = await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),5,9)
        let order3 = await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),5,3)
        let orders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        for (let i=0; i++; i<orders.length-1){
            assert(orders[i].price > orders[i+1].price);
        }
      
    })
}) 
