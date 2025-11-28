// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PakChainAid Donation Contract
 * @notice A transparent, blockchain-based donation platform for Pakistan causes
 * @dev All donations are recorded permanently on-chain for complete transparency
 */

contract PakChainAid {
    event DonationReceived(
        indexed uint256 campaignId,
        indexed address donor,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignCreated(
        indexed uint256 campaignId,
        string title,
        uint256 goalAmount
    );

    event CampaignClosed(indexed uint256 campaignId);

    struct Campaign {
        uint256 id;
        string title;
        string description;
        uint256 goalAmount;
        uint256 totalDonated;
        uint256 donationCount;
        bool isActive;
        address creator;
        uint256 createdAt;
    }

    struct Donation {
        uint256 campaignId;
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(address => uint256[]) public donorHistory;
    mapping(address => uint256) public donorTotalContributed;

    uint256 public campaignCounter = 0;
    uint256 public totalDonationsInPlatform = 0;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId < campaignCounter, "Campaign does not exist");
        _;
    }

    modifier campaignIsActive(uint256 _campaignId) {
        require(
            campaigns[_campaignId].isActive,
            "Campaign is not active"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a new donation campaign
     * @param _title Title of the campaign
     * @param _description Description of the campaign
     * @param _goalAmount Goal amount in Wei
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goalAmount
    ) public onlyOwner {
        campaigns[campaignCounter] = Campaign({
            id: campaignCounter,
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            totalDonated: 0,
            donationCount: 0,
            isActive: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit CampaignCreated(campaignCounter, _title, _goalAmount);
        campaignCounter++;
    }

    /**
     * @notice Make a donation to a campaign
     * @param _campaignId ID of the campaign to donate to
     */
    function donate(uint256 _campaignId)
        public
        payable
        campaignExists(_campaignId)
        campaignIsActive(_campaignId)
    {
        require(msg.value > 0, "Donation amount must be greater than 0");

        campaigns[_campaignId].totalDonated += msg.value;
        campaigns[_campaignId].donationCount++;

        Donation memory newDonation = Donation({
            campaignId: _campaignId,
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        });

        campaignDonations[_campaignId].push(newDonation);
        donorHistory[msg.sender].push(_campaignId);
        donorTotalContributed[msg.sender] += msg.value;
        totalDonationsInPlatform += msg.value;

        emit DonationReceived(_campaignId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Get campaign details
     */
    function getCampaign(uint256 _campaignId)
        public
        view
        campaignExists(_campaignId)
        returns (Campaign memory)
    {
        return campaigns[_campaignId];
    }

    /**
     * @notice Get all donations for a campaign
     */
    function getCampaignDonations(uint256 _campaignId)
        public
        view
        campaignExists(_campaignId)
        returns (Donation[] memory)
    {
        return campaignDonations[_campaignId];
    }

    /**
     * @notice Get total donations for a campaign
     */
    function getCampaignTotal(uint256 _campaignId)
        public
        view
        campaignExists(_campaignId)
        returns (uint256)
    {
        return campaigns[_campaignId].totalDonated;
    }

    /**
     * @notice Get total platform donations
     */
    function getTotalDonations() public view returns (uint256) {
        return totalDonationsInPlatform;
    }

    /**
     * @notice Get donor's total contribution
     */
    function getDonorTotal(address _donor) public view returns (uint256) {
        return donorTotalContributed[_donor];
    }

    /**
     * @notice Get donor's donation history
     */
    function getDonorHistory(address _donor)
        public
        view
        returns (uint256[] memory)
    {
        return donorHistory[_donor];
    }

    /**
     * @notice Close a campaign
     */
    function closeCampaign(uint256 _campaignId)
        public
        onlyOwner
        campaignExists(_campaignId)
    {
        campaigns[_campaignId].isActive = false;
        emit CampaignClosed(_campaignId);
    }

    /**
     * @notice Withdraw funds from contract (for campaign recipients)
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Get contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        revert("Use donate function to make donations");
    }
}
