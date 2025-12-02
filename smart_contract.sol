// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PakChainAid
 * @notice A transparent blockchain donation platform for managing campaigns and donations
 * @dev This contract manages donation campaigns and processes donations with optional platform fees
 * 
 * Features:
 * - Create and manage donation campaigns
 * - Accept donations with automatic fee distribution
 * - Track all donations on-chain
 * - Platform fee support (optional)
 * - Campaign status management
 * - Comprehensive event logging
 */
contract PakChainAid {
    // ============ State Variables ============
    
    address public owner;
    address public platformFeeAddress;
    uint256 public platformFeePercentage; // Basis points (100 = 1%)
    uint256 public campaignCounter;
    bool public paused;
    
    // ============ Structs ============
    
    struct Campaign {
        uint256 id;
        string title;
        string description;
        address recipientAddress;
        uint256 goalAmount;
        uint256 currentAmount;
        uint256 donationCount;
        bool isActive;
        bool isFeatured;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    struct Donation {
        uint256 campaignId;
        address donor;
        uint256 amount;
        uint256 timestamp;
        bool exists;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(address => uint256[]) public donorCampaigns;
    mapping(address => uint256) public donorTotalDonated;
    mapping(address => uint256) public donorDonationCount;
    
    // ============ Events ============
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        address indexed recipientAddress,
        uint256 goalAmount,
        address indexed creator
    );
    
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 platformFee,
        uint256 netAmount,
        uint256 timestamp
    );
    
    event CampaignUpdated(
        uint256 indexed campaignId,
        string title,
        bool isActive,
        bool isFeatured
    );
    
    event CampaignClosed(
        uint256 indexed campaignId,
        uint256 totalRaised,
        uint256 donationCount
    );
    
    event PlatformFeeUpdated(
        address indexed newFeeAddress,
        uint256 newFeePercentage
    );
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    event Paused(address account);
    event Unpaused(address account);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "PakChainAid: caller is not the owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "PakChainAid: contract is paused");
        _;
    }
    
    modifier validCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].id != 0, "PakChainAid: campaign does not exist");
        _;
    }
    
    modifier activeCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].isActive, "PakChainAid: campaign is not active");
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the contract with owner
     * @dev Platform fees are disabled by default (can be enabled later using setPlatformFee)
     */
    constructor() {
        owner = msg.sender;
        platformFeeAddress = address(0); // No platform fees by default
        platformFeePercentage = 0; // No platform fees by default
        campaignCounter = 0;
        paused = false;
        
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    // ============ Campaign Management ============
    
    /**
     * @notice Create a new donation campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _recipientAddress Address to receive donations
     * @param _goalAmount Target donation amount in wei
     * @param _isFeatured Whether campaign should be featured
     * @return campaignId The ID of the newly created campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        address _recipientAddress,
        uint256 _goalAmount,
        bool _isFeatured
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_recipientAddress != address(0), "PakChainAid: invalid recipient address");
        require(_goalAmount > 0, "PakChainAid: goal amount must be greater than zero");
        require(bytes(_title).length > 0, "PakChainAid: title cannot be empty");
        
        campaignCounter++;
        
        campaigns[campaignCounter] = Campaign({
            id: campaignCounter,
            title: _title,
            description: _description,
            recipientAddress: _recipientAddress,
            goalAmount: _goalAmount,
            currentAmount: 0,
            donationCount: 0,
            isActive: true,
            isFeatured: _isFeatured,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        emit CampaignCreated(
            campaignCounter,
            _title,
            _recipientAddress,
            _goalAmount,
            msg.sender
        );
        
        return campaignCounter;
    }
    
    /**
     * @notice Update campaign details
     * @param _campaignId Campaign ID to update
     * @param _title New title (empty string to keep current)
     * @param _description New description (empty string to keep current)
     * @param _isActive New active status
     * @param _isFeatured New featured status
     */
    function updateCampaign(
        uint256 _campaignId,
        string memory _title,
        string memory _description,
        bool _isActive,
        bool _isFeatured
    ) external onlyOwner validCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        
        if (bytes(_title).length > 0) {
            campaign.title = _title;
        }
        if (bytes(_description).length > 0) {
            campaign.description = _description;
        }
        campaign.isActive = _isActive;
        campaign.isFeatured = _isFeatured;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignUpdated(_campaignId, campaign.title, _isActive, _isFeatured);
    }
    
    /**
     * @notice Close a campaign (set to inactive)
     * @param _campaignId Campaign ID to close
     */
    function closeCampaign(uint256 _campaignId) external onlyOwner validCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "PakChainAid: campaign is already closed");
        
        campaign.isActive = false;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignClosed(_campaignId, campaign.currentAmount, campaign.donationCount);
    }
    
    // ============ Donation Functions ============
    
    /**
     * @notice Make a donation to a campaign
     * @param _campaignId Campaign ID to donate to
     * @dev Automatically calculates and distributes platform fee if enabled
     */
    function donate(uint256 _campaignId) external payable whenNotPaused validCampaign(_campaignId) activeCampaign(_campaignId) {
        require(msg.value > 0, "PakChainAid: donation amount must be greater than zero");
        
        Campaign storage campaign = campaigns[_campaignId];
        uint256 donationAmount = msg.value;
        uint256 platformFee = 0;
        uint256 netAmount = donationAmount;
        
        // Calculate platform fee if enabled
        if (platformFeeAddress != address(0) && platformFeePercentage > 0) {
            platformFee = (donationAmount * platformFeePercentage) / 10000;
            netAmount = donationAmount - platformFee;
            
            // Transfer platform fee
            (bool feeSuccess, ) = platformFeeAddress.call{value: platformFee}("");
            require(feeSuccess, "PakChainAid: platform fee transfer failed");
        }
        
        // Transfer donation to campaign recipient
        (bool donationSuccess, ) = campaign.recipientAddress.call{value: netAmount}("");
        require(donationSuccess, "PakChainAid: donation transfer failed");
        
        // Update campaign statistics
        campaign.currentAmount += netAmount;
        campaign.donationCount++;
        campaign.updatedAt = block.timestamp;
        
        // Record donation
        Donation memory newDonation = Donation({
            campaignId: _campaignId,
            donor: msg.sender,
            amount: netAmount,
            timestamp: block.timestamp,
            exists: true
        });
        
        campaignDonations[_campaignId].push(newDonation);
        
        // Update donor statistics
        if (donorCampaigns[msg.sender].length == 0 || 
            donorCampaigns[msg.sender][donorCampaigns[msg.sender].length - 1] != _campaignId) {
            donorCampaigns[msg.sender].push(_campaignId);
        }
        donorTotalDonated[msg.sender] += netAmount;
        donorDonationCount[msg.sender]++;
        
        emit DonationReceived(
            _campaignId,
            msg.sender,
            donationAmount,
            platformFee,
            netAmount,
            block.timestamp
        );
    }
    
    /**
     * @notice Fallback function to accept donations
     * @dev Reverts - donations must specify campaign ID
     */
    receive() external payable {
        revert("PakChainAid: please use donate(uint256 campaignId) function");
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get campaign details
     * @param _campaignId Campaign ID
     * @return Campaign struct
     */
    function getCampaign(uint256 _campaignId) external view validCampaign(_campaignId) returns (Campaign memory) {
        return campaigns[_campaignId];
    }
    
    /**
     * @notice Get all donations for a campaign
     * @param _campaignId Campaign ID
     * @return Array of Donation structs
     */
    function getCampaignDonations(uint256 _campaignId) external view validCampaign(_campaignId) returns (Donation[] memory) {
        return campaignDonations[_campaignId];
    }
    
    /**
     * @notice Get total amount donated to a campaign
     * @param _campaignId Campaign ID
     * @return Total amount in wei
     */
    function getCampaignTotal(uint256 _campaignId) external view validCampaign(_campaignId) returns (uint256) {
        return campaigns[_campaignId].currentAmount;
    }
    
    /**
     * @notice Get total donations across all campaigns
     * @return Total amount in wei
     */
    function getTotalDonations() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].id != 0) {
                total += campaigns[i].currentAmount;
            }
        }
        return total;
    }
    
    /**
     * @notice Get total amount donated by a specific donor
     * @param _donor Donor address
     * @return Total amount in wei
     */
    function getDonorTotal(address _donor) external view returns (uint256) {
        return donorTotalDonated[_donor];
    }
    
    /**
     * @notice Get donation count for a specific donor
     * @param _donor Donor address
     * @return Donation count
     */
    function getDonorCount(address _donor) external view returns (uint256) {
        return donorDonationCount[_donor];
    }
    
    /**
     * @notice Get all campaign IDs a donor has contributed to
     * @param _donor Donor address
     * @return Array of campaign IDs
     */
    function getDonorHistory(address _donor) external view returns (uint256[] memory) {
        return donorCampaigns[_donor];
    }
    
    /**
     * @notice Get number of active campaigns
     * @return Count of active campaigns
     */
    function getActiveCampaignCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].id != 0 && campaigns[i].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @notice Get total number of campaigns
     * @return Total campaign count
     */
    function getTotalCampaignCount() external view returns (uint256) {
        return campaignCounter;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update platform fee settings
     * @param _platformFeeAddress New fee recipient address (zero address to disable)
     * @param _platformFeePercentage New fee percentage in basis points
     */
    function setPlatformFee(address _platformFeeAddress, uint256 _platformFeePercentage) external onlyOwner {
        require(_platformFeePercentage <= 1000, "PakChainAid: fee cannot exceed 10%");
        platformFeeAddress = _platformFeeAddress;
        platformFeePercentage = _platformFeePercentage;
        emit PlatformFeeUpdated(_platformFeeAddress, _platformFeePercentage);
    }
    
    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        require(!paused, "PakChainAid: contract is already paused");
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyOwner {
        require(paused, "PakChainAid: contract is not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @notice Transfer ownership of the contract
     * @param _newOwner Address of new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "PakChainAid: new owner is the zero address");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    /**
     * @notice Emergency withdraw function (only if contract receives unexpected funds)
     * @param _to Address to send funds to
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "PakChainAid: invalid recipient address");
        require(address(this).balance >= _amount, "PakChainAid: insufficient balance");
        
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "PakChainAid: withdrawal failed");
    }
}

