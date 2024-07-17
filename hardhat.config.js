require("@nomicfoundation/hardhat-toolbox");
const { PRIVATE_KEY, RPC_URL } = require("./secret");

// here `account` in setparams is a parameter of CLI
// passed as `--account [address]`
task("balance", "Prints an account's balance")
	.addParam("account", "The account's address")
	.setAction(async (taskArgs) => {
		const balance = await ethers.provider.getBalance(taskArgs.account);

		console.log(ethers.utils.formatEther(balance), "ETH");
	});

module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.19",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
			{
				version: "0.8.18",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		],
	},
	networks: {
		mumbai: {
			url: RPC_URL,
			accounts: [PRIVATE_KEY],
		},
	},
	etherscan: {
		// apiKey: "CE2CVNK6SBFB4FVU6IGRFK2CE61PTVM2SD", //ethereum
		apiKey: "V5BWSBFIFE1AKUEYCSW6P9JEN4A9GMTRGH", //polygon
	},
};
