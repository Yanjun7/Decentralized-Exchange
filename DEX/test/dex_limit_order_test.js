// The user must have ETH deposited such that deposited ETH >= buy order value
// The user must have token deposited such that deposited token >= sell order amount
// The BUY order book should be ordered on price from the highest to the lowest starting at index 0
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")

const truffleAssert = require("truffle-assertions")

contract.skip("Dex-limit-order", accounts=>{
    it("The user must have ETH deposited such that deposited ETH >= buy order value", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
 
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),10, 1)
        )        
        await dex.depositEth({value:5000})
        
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
        
        await link.approve(dex.address, 2000) // should not exceed 2000 mint value
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address,{from: accounts[0]})
        dex.deposit(2000, web3.utils.fromUtf8("LINK")) 
        
        // await truffleAssert.passes(
        //     dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),20, 1)
        // )
    })
    it("The BUY order book should be ordered on price from the highest to the lowest", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        //await link.approve(dex.address, 200)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),1,16)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),1,19)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),1,12)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),1,13)
        let buyBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        assert(buyBook.length>0, "no orders")
        console.log(buyBook)
        for (let i=0; i<buyBook.length-1; i++){
            console.log(buyBook[i].price)
            assert(buyBook[i].price >= buyBook[i+1].price, "the order is not right in buy book");
            
        }
    })
    it("The SELL order book should be ordered on price from the lowest to the highest", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,13)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,11)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,17)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,19)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,13)
        
        let sellBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        //assert(sellBook.length>0, "no orders")
        //console.log(sellBook)
        for (let i=0;i<sellBook.length-1; i++){
            console.log(sellBook[i].price)
            assert(sellBook[i].price <= sellBook[i+1].price,"the order is not right in sell book");
        }
      
    })
}) 

