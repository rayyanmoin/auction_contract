const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction implementation", () => {
	async function deployAuctionAndNFT() {
		const [Auction, MinimalERC721] = await Promise.all([
			ethers.getContractFactory("Auction"),
			ethers.getContractFactory("MinimalERC721"),
		]);

		const [auction, minimalERC721] = await Promise.all([
			Auction.deploy(),
			MinimalERC721.deploy(),
		]);

		// console.log("auction Deployed To: ", auction.address);
		// console.log("minimal Deployed To: ", minimalERC721.address);
		return [auction, minimalERC721];
	}

	const ONE = ethers.utils.parseEther("1");
	let owner, alice, bob, carol;

	describe("put on auction ", () => {
		let auction = null;
		let minimalERC721 = null;

		/**
		 * before
		 * beforeEach
		 * after
		 * afterEach
		 */
		before("", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("Deployment", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after(() => {});
		afterEach(() => {});

		it("should validate the deployment", async () => {
			expect(auction.address).not.to.be.null;
			expect(auction.address).to.be.string;
		});

		it("should revert on placing someone else's NFT on auction", async () => {
			await expect(
				auction.connect(alice).putOnAuction(
					minimalERC721.address,
					1,
					0, // 0 duration
					ONE,
					"Bored ape Non-Fungible Token"
				)
			).to.be.revertedWith("NOT OWNER");
		});

		it("should revert without approval", async () => {
			await expect(
				auction.putOnAuction(
					minimalERC721.address,
					1,
					86400, // 1 day
					ONE,
					"Bored ape Non-Fungible Token"
				)
			).to.be.revertedWith("NOT APPROVED");
		});

		it("should revert on malfunctioned NFT address", async () => {
			await expect(
				auction.putOnAuction(
					owner.address,
					1,
					86400, // 1 day
					ONE,
					"Bored ape Non-Fungible Token"
				)
			).to.be.reverted;
		});

		it("should revert on zero amount input", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await expect(
				auction.putOnAuction(
					minimalERC721.address,
					1,
					86400, // 1 day
					0,
					"Bored ape Non-Fungible Token"
				)
			).to.be.revertedWith("CANNOT BE ZERO");
		});

		it("should revert on zero duration input", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await expect(
				auction.putOnAuction(
					minimalERC721.address,
					1,
					0,
					ONE,
					"Bored ape Non-Fungible Token"
				)
			).to.be.revertedWith("CANNOT BE ZERO");
		});
	});

	describe("force ethers test", () => {
		before("force ethers before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("force ethers beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("force ethers after", async () => {});
		afterEach("force ethers afterEach", async () => {});

		it("should revert on force ethers send", async () => {
			// await expect(auction.function({value:ONE}));
			await expect(
				owner.sendTransaction({
					to: auction.address,
					value: ONE,
				})
			).to.be.revertedWith("FORCE ETHERS NOT ACCEPTED");
		});
	});

	describe("should behave like place bid", () => {
		before("place bid before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("place bid beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("place bid after", async () => {});
		afterEach("place bid afterEach", async () => {});

		it("should revert on non-existing auction bid", async () => {
			// await expect(auction.function({value:ONE}));
			await expect(auction.placeBid(1, { value: ONE })).to.be.revertedWith(
				"NOT EXISTS"
			);
		});
	});

	describe("should behave like catching events", () => {
		before("catching events before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("catching events beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("catching events after", async () => {});
		afterEach("catching events afterEach", async () => {});

		it("should test for event catch for Auction Created", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await expect(
				auction.putOnAuction(
					minimalERC721.address,
					1,
					86400,
					ONE,
					"Bored ape Non-Fungible Token"
				)
			)
				.to.emit(auction, "PutToAuction")
				.withArgs(
					owner.address,
					minimalERC721.address,
					1,
					86400,
					ONE,
					"Bored ape Non-Fungible Token",
					1
				);
		});

		it("should test for event catch for Bid Placed", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await expect(
				auction.putOnAuction(
					minimalERC721.address,
					1,
					86400,
					ONE,
					"Bored ape Non-Fungible Token"
				)
			);
			await expect(auction.connect(alice).placeBid(1, { value: ONE.add(1) }))
				.to.emit(auction, "BidAdd")
				.withArgs(alice.address, ONE.add(1), 1);
		});

		it("should test for event catch for Bid Claim", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);

			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);
			await expect(auction.connect(alice).placeBid(1, { value: ONE.add(1) }))
				.to.emit(auction, "BidAdd")
				.withArgs(alice.address, ONE.add(1), 1);

			//increase time to 1 day to claim bid
			await ethers.provider.send("evm_increaseTime", [86500]);

			console.log("alice address", alice.address);
			await expect(auction.connect(alice).claimBid(1)).to.not.reverted;
		});

		it("should test for event catch for Rewoke Auction", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);

			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await ethers.provider.send("evm_increaseTime", [86500]);
			await expect(auction.revokeAuction(1))
				.to.emit(auction, "AuctionRevoked")
				.withArgs(owner.address, minimalERC721.address, 1, 1);
		});
	});

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	describe("should behave correctly when claimming the bid", () => {
		before("catching events before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("catching events beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("catching events after", async () => {});
		afterEach("catching events afterEach", async () => {});

		it("Should highest bidder claim the nft", async () => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);
			await expect(
				auction.connect(alice).placeBid(1, { value: ONE.add(1) }) 
			).to.emit(auction, "BidAdd");

			await ethers.provider.send("evm_increaseTime", [86500]);

			const bidClaimed = await auction.connect(alice).claimBid(1);
            expect(bidClaimed).to.not.reverted;
            
		});

		it("Should not claim the bid before auction ends", async() => {
            await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

            await expect(auction.connect(alice).placeBid(1, { value: ONE.add(1) })).to.emit(auction, "BidAdd");
            
            const bidClaimed = auction.connect(alice).claimBid(1);

			expect(bidClaimed).to.be.revertedWith("NOT EXISTS");

            

        });

		it("Should not be claimed nft from Non seller and non bidder", async() => {
            
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await auction.connect(alice).placeBid(1, { value: ONE.add(1) });
			await ethers.provider.send("evm_increaseTime", [86500]);
				
			await expect(auction.connect(bob).claimBid(1)).to.be.revertedWith(
				"INVALID CALL"
			);	

        });
	});

	describe("should behave correctly when placing the bid", () => {
		before("catching events before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("catching events beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("catching events after", async () => {});
		afterEach("catching events afterEach", async () => {});

		it("should react when bidding on non existing auction", async() => {

			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await ethers.provider.send("evm_increaseTime", [86500]);

			await expect(
				auction.connect(alice).placeBid(1, { value: ONE.add(1) })
			).to.be.revertedWith("NOT EXISTS");


		});

		it("should not bid if amount below previos", async() => {
			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

            await expect(auction.connect(alice).placeBid(1, { value: ONE.add(1) })).to.emit(auction, "BidAdd");

			await expect(auction.connect(alice).placeBid(1,{ value : ONE.add(2)})).to.emit(auction,"BidAdd")

		});

		it("should not bid when auction ends", async() => {

			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await ethers.provider.send("evm_increaseTime", [86500]);

			await expect(
				auction.connect(alice).placeBid(1, { value: ONE.add(1) })
			).to.be.revertedWith("NOT EXISTS")

		});

		it("Should not bid when bidder not have enough amount to bid", async() => {

			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await expect(
				auction.connect(alice).placeBid(1, { value: ONE.sub(1)})
			).to.be.revertedWith("AMOUNT ERROR");

		});
	});

	describe("Cancelling the auction", () => {
		before("catching events before", async () => {
			const myWallets = await ethers.getSigners();
			[owner, alice, bob, carol] = myWallets;
		});
		beforeEach("catching events beforeeach", async () => {
			[auction, minimalERC721] = await deployAuctionAndNFT();
		});
		after("catching events after", async () => {});
		afterEach("catching events afterEach", async () => {});

		it("Should cancelling the auction before the auction ends", async() => {

			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await expect(auction.revokeAuction(1)).to.be.revertedWith("NOT EXISTS")

		});

		it("Should let owner cancel the auction after the auction ends", async() => {

			await minimalERC721.connect(owner).approve(auction.address, 1);
			await auction.putOnAuction(
				minimalERC721.address,
				1,
				86400,
				ONE,
				"Bored ape Non-Fungible Token"
			);

			await ethers.provider.send("evm_increaseTime", [86500]);

			await expect(auction.revokeAuction(1)).not.to.be.reverted;

		});
	});
});
