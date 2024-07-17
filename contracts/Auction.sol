// SPDX-License-Identifier: UNLICEN
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

/** 
 * Design a contract 

 * Create a function

 * Specify Auction Time & minimum Bid Amount & item Description

 * After each auction the highest should be shown

 * When the Auction ends the winner should get his item and the money to seller

 * If the auction ends without any bids, the seller should be able to retrieve the item.
 */

/**
   *function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function transferFrom(address from, address to, uint256 tokenId) external;

  */

contract Auction {
    struct Details {
        address owner;
        uint duration;
        uint amount;
        string description;
        uint tokenId;
        address tokenAddress;
        address previousBidder;
        uint previousAmount;
    }

    // auction ID => item details
    mapping(uint => Details) itemDetails; 
    uint auctionId = 1 ;

    event PutToAuction(
        address _user,
        address _tokenAddress,
        uint _tokenId,
        uint _duration,
        uint _amount,
        string _description,
        uint _auctionID
    );

    event BidAdd(
        address _bidder,
        uint _amount ,
        uint _tokenId
    );

    event BidClaim(
        address _bidder,
        address owner,
        address _tokenAddress,
        uint _tokenId,
        uint _bidAmount,
        uint _auctionId
    );

    event AuctionRevoked(
        address owner,
        address _tokenAddress,
        uint _tokenId,
        uint _auctionId
    );

    fallback() external payable {
        revert ("FORCE ETHERS NOT ACCEPTED");
    }

    function putOnAuction(
        address _tokenAddress,
        uint _tokenId,
        uint _duration,
        uint _amount,
        string calldata _description
    ) external {
        address user = msg.sender;
        address owner = IERC721(_tokenAddress).ownerOf(_tokenId);
        //check owner
        require(user == owner, "NOT OWNER");

        // check approved
        address operator = IERC721(_tokenAddress).getApproved(_tokenId);
        require(address(this) == operator, "NOT APPROVED");

        // moving NFT from user to this contract
        //external call
        IERC721(_tokenAddress).safeTransferFrom(user, address(this), _tokenId);

        //unix timestamp, only give fore those days till then the auction will be valid
        //means if you want to continue auction for days then passs (86400*2) in _duration 
        require(_duration > 0 && _amount > 0, "CANNOT BE ZERO");

        itemDetails[auctionId] = Details(
            user,
            block.timestamp + _duration,
            _amount,
            _description,
            _tokenId,
            _tokenAddress,
            address(0),
            0); 

        emit PutToAuction(
            user,
            _tokenAddress,
            _tokenId,
            _duration,
            _amount,
            _description,
            auctionId
        );
        auctionId ++;
    }

    function placeBid(uint _auctionId) external payable{
        /**
        Auction Exists
        valid Amount
        Amount greater than previous
        Owner can't bid
         */
        // console.log("contract console",msg.value);
        Details storage auction = itemDetails[_auctionId];

        require(block.timestamp < auction.duration, "NOT EXISTS");

        require(msg.value > auction.amount, "AMOUNT ERROR") ;

        require(msg.value > auction.previousAmount, "VALUE ERROR") ;

        require(auction.owner != msg.sender, " CANT'T BID ");

        (bool sent, ) = payable(auction.previousBidder).call{value: auction.previousAmount}("");
        require(sent, "Failed to send Ether");

            
            auction.previousAmount = msg.value;

            auction.previousBidder = msg.sender;       

            emit BidAdd(
                msg.sender,
                msg.value,
                _auctionId
            );

    }

    function claimBid(uint _auctionId) external {
        /**
        auction exists
        auction ended
        msg.sender == lastBidder || owner
        owner != address(0)
        transfer money to owner
        transfer item to lastBidder
         */
        
        Details storage auction = itemDetails[_auctionId];
        console.log('bidder',auction.previousBidder);
        require(auction.duration != 0 && block.timestamp > auction.duration, "NOT EXISTS");
        
        require(msg.sender == auction.previousBidder || msg.sender == auction.owner, "INVALID CALL");

        require(auction.owner != address(0), "ZERO ADDRESS");

        (bool sent, ) = payable(auction.owner).call{value : auction.previousAmount}("");
        require(sent,"TRANSFER FAILED");

        IERC721(auction.tokenAddress).transferFrom(address(this), auction.previousBidder, auction.tokenId);


        emit BidClaim(auction.previousBidder, auction.owner, auction.tokenAddress, auction.tokenId, auction.previousAmount, _auctionId);
        delete itemDetails[_auctionId];
    }

    function revokeAuction(uint _auctionId) external {
        /**
        auction ended
        auction Exists
        no bid placed
        only owner call
        transfer back item
         */
        Details storage auction = itemDetails[_auctionId];
        
        //exists and not ended check
        require(auction.duration != 0 && block.timestamp > auction.duration, "NOT EXISTS");

        //no bid placed
        require(auction.previousAmount == 0, "ALREADY BIDDED");

        require(msg.sender == auction.owner, "NOT OWNER");

        IERC721(auction.tokenAddress).transferFrom(address(this), auction.owner, auction.tokenId);

        emit AuctionRevoked(auction.owner, auction.tokenAddress, auction.tokenId, _auctionId);

        
    }


    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        // Add your implementation here
        return this.onERC721Received.selector;
    }
}
