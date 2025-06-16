// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NotaryService
 */
contract NotaryService {
    

    event DocumentNotarized(bytes32 indexed documentHash, address indexed notary, uint256 timestamp, string metadata);
    event DocumentVersionCreated(bytes32 indexed originalHash, bytes32 indexed newVersionHash, uint256 version, address indexed creator);
    event DocumentSigned(bytes32 indexed documentHash, address indexed signer, uint256 timestamp);
    event DocumentApproved(bytes32 indexed documentHash, address indexed approver, uint256 timestamp);
    event DocumentRejected(bytes32 indexed documentHash, address indexed rejector, uint256 timestamp, string reason);
    
    
    struct NotarizedDocument {
        bytes32 documentHash;
        address notary;
        uint256 timestamp;
        string metadata;
        bool exists;
        address[] requiredSigners;
        address[] approvers;
        mapping(address => bool) hasSigned;
        mapping(address => bool) hasApproved;
        uint256 signerCount;
        uint256 approverCount;
        DocumentStatus status;
    }
    
    struct DocumentVersion {
        bytes32 documentHash;
        uint256 version;
        bytes32 previousVersionHash;
        address creator;
        uint256 timestamp;
        string changeDescription;
        bool isLatest;
    }
    
    enum DocumentStatus {
        PENDING,
        SIGNED,
        APPROVED,
        REJECTED,
        ARCHIVED
    }
    
    
    mapping(bytes32 => NotarizedDocument) public documents;
    mapping(bytes32 => DocumentVersion[]) public documentVersions;
    mapping(bytes32 => bytes32) public latestVersionHash;
    mapping(address => bool) public authorizedNotaries;
    
    address public owner;
    uint256 public totalDocuments;
    
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedNotary() {
        require(authorizedNotaries[msg.sender] || msg.sender == owner, "Not authorized notary");
        _;
    }
    
    modifier documentExists(bytes32 _documentHash) {
        require(documents[_documentHash].exists, "Document does not exist");
        _;
    }
    
    modifier onlyRequiredSigner(bytes32 _documentHash) {
        require(_isRequiredSigner(_documentHash, msg.sender), "Not a required signer");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedNotaries[msg.sender] = true;
    }
    
    /**
     * @dev 
     * @param _documentHash 
     * @param _metadata
     * @param _requiredSigners 
     */
    function notarizeDocument(
        bytes32 _documentHash,
        string memory _metadata,
        address[] memory _requiredSigners
    ) external onlyAuthorizedNotary {
        require(!documents[_documentHash].exists, "Document already notarized");
        
        NotarizedDocument storage doc = documents[_documentHash];
        doc.documentHash = _documentHash;
        doc.notary = msg.sender;
        doc.timestamp = block.timestamp;
        doc.metadata = _metadata;
        doc.exists = true;
        doc.requiredSigners = _requiredSigners;
        doc.status = DocumentStatus.PENDING;
        
        // İlk versiyonları 
        DocumentVersion memory initialVersion = DocumentVersion({
            documentHash: _documentHash,
            version: 1,
            previousVersionHash: bytes32(0),
            creator: msg.sender,
            timestamp: block.timestamp,
            changeDescription: "Initial version",
            isLatest: true
        });
        
        documentVersions[_documentHash].push(initialVersion);
        latestVersionHash[_documentHash] = _documentHash;
        totalDocuments++;
        
        emit DocumentNotarized(_documentHash, msg.sender, block.timestamp, _metadata);
    }
    
    /**
     * @dev Dökümanın yeni versiyonunu yaratır
     * @param _originalHash 
     * @param _newVersionHash 
     * @param _changeDescription 
     */
    function createDocumentVersion(
        bytes32 _originalHash,
        bytes32 _newVersionHash,
        string memory _changeDescription
    ) external documentExists(_originalHash) {
        require(!documents[_newVersionHash].exists, "New version hash already exists");
        
        
        DocumentVersion[] storage versions = documentVersions[_originalHash];
        require(versions.length > 0, "No versions found");
        
        
        for (uint i = 0; i < versions.length; i++) {
            if (versions[i].isLatest) {
                versions[i].isLatest = false;
                break;
            }
        }
        
        
        uint256 newVersionNumber = versions.length + 1;
        DocumentVersion memory newVersion = DocumentVersion({
            documentHash: _newVersionHash,
            version: newVersionNumber,
            previousVersionHash: latestVersionHash[_originalHash],
            creator: msg.sender,
            timestamp: block.timestamp,
            changeDescription: _changeDescription,
            isLatest: true
        });
        
        versions.push(newVersion);
        latestVersionHash[_originalHash] = _newVersionHash;
        
        
        NotarizedDocument storage originalDoc = documents[_originalHash];
        NotarizedDocument storage newDoc = documents[_newVersionHash];
        newDoc.documentHash = _newVersionHash;
        newDoc.notary = originalDoc.notary;
        newDoc.timestamp = block.timestamp;
        newDoc.metadata = originalDoc.metadata;
        newDoc.exists = true;
        newDoc.requiredSigners = originalDoc.requiredSigners;
        newDoc.status = DocumentStatus.PENDING;
        
        emit DocumentVersionCreated(_originalHash, _newVersionHash, newVersionNumber, msg.sender);
    }
    
    /**
     * @dev Sign a document (for required signers)
     * @param _documentHash Hash of the document to sign
     */
    function signDocument(bytes32 _documentHash) 
        external 
        documentExists(_documentHash) 
        onlyRequiredSigner(_documentHash) 
    {
        NotarizedDocument storage doc = documents[_documentHash];
        require(!doc.hasSigned[msg.sender], "Already signed");
        require(doc.status == DocumentStatus.PENDING, "Document not in pending status");
        
        doc.hasSigned[msg.sender] = true;
        doc.signerCount++;
        
        // Check if all required signers have signed
        if (doc.signerCount == doc.requiredSigners.length) {
            doc.status = DocumentStatus.SIGNED;
        }
        
        emit DocumentSigned(_documentHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Approve a document (for any address)
     * @param _documentHash Hash of the document to approve
     */
    function approveDocument(bytes32 _documentHash) external documentExists(_documentHash) {
        NotarizedDocument storage doc = documents[_documentHash];
        require(!doc.hasApproved[msg.sender], "Already approved");
        require(doc.status == DocumentStatus.SIGNED || doc.status == DocumentStatus.PENDING, "Invalid document status");
        
        doc.hasApproved[msg.sender] = true;
        doc.approvers.push(msg.sender);
        doc.approverCount++;
        
        if (doc.status == DocumentStatus.SIGNED) {
            doc.status = DocumentStatus.APPROVED;
        }
        
        emit DocumentApproved(_documentHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Reject a document with reason
     * @param _documentHash Hash of the document to reject
     * @param _reason Reason for rejection
     */
    function rejectDocument(bytes32 _documentHash, string memory _reason) 
        external 
        documentExists(_documentHash) 
        onlyRequiredSigner(_documentHash) 
    {
        NotarizedDocument storage doc = documents[_documentHash];
        require(doc.status == DocumentStatus.PENDING, "Can only reject pending documents");
        
        doc.status = DocumentStatus.REJECTED;
        
        emit DocumentRejected(_documentHash, msg.sender, block.timestamp, _reason);
    }
    
    /**
     * @dev Dokümanın oluğ olmadıgını kontrol eder ve detaylarını alır
     * @param _documentHash 
     * @return exists 
     * @return notary 
     * @return timestamp 
     * @return status 
     */
    function verifyDocument(bytes32 _documentHash) 
        external 
        view 
        returns (
            bool exists,
            address notary,
            uint256 timestamp,
            DocumentStatus status,
            uint256 signerCount,
            uint256 approverCount
        ) 
    {
        NotarizedDocument storage doc = documents[_documentHash];
        return (
            doc.exists,
            doc.notary,
            doc.timestamp,
            doc.status,
            doc.signerCount,
            doc.approverCount
        );
    }
    
    /**
     * @dev Dökümanın versiyon tarihi geçmişi 
     * @param _originalHash 
     * @return Array 
     */
    function getDocumentVersions(bytes32 _originalHash) 
        external 
        view 
        returns (DocumentVersion[] memory) 
    {
        return documentVersions[_originalHash];
    }
    
    /**
     * @dev Get the latest version hash of a document
     * @param _originalHash Hash of the original document
     * @return Hash of the latest version
     */
    function getLatestVersion(bytes32 _originalHash) external view returns (bytes32) {
        return latestVersionHash[_originalHash];
    }
    
    /**
     * @dev Auth olmuş notary ekler
     * @param _notary Address to authorize as notary
     */
    function addNotary(address _notary) external onlyOwner {
        authorizedNotaries[_notary] = true;
    }
    
    /**
     * @dev 
     * @param _notary Address to remove from notaries
     */
    function removeNotary(address _notary) external onlyOwner {
        authorizedNotaries[_notary] = false;
    }
    
    /**
     * @dev Check if an address is a required signer for a document
     * @param _documentHash Hash of the document
     * @param _signer Address to check
     * @return Whether the address is a required signer
     */
    function _isRequiredSigner(bytes32 _documentHash, address _signer) 
        internal 
        view 
        returns (bool) 
    {
        NotarizedDocument storage doc = documents[_documentHash];
        for (uint i = 0; i < doc.requiredSigners.length; i++) {
            if (doc.requiredSigners[i] == _signer) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Gerekli signerları al
     * @param _documentHash Hash of the document
     * @return Array of required signer addresses
     */
    function getRequiredSigners(bytes32 _documentHash) 
        external 
        view 
        documentExists(_documentHash) 
        returns (address[] memory) 
    {
        return documents[_documentHash].requiredSigners;
    }
    
    /**
     * @dev Check if an address has signed a document
     * @param _documentHash Hash of the document
     * @param _signer Address to check
     * @return Whether the address has signed
     */
    function hasSigned(bytes32 _documentHash, address _signer) 
        external 
        view 
        documentExists(_documentHash) 
        returns (bool) 
    {
        return documents[_documentHash].hasSigned[_signer];
    }
    
    /**
     * @dev Get document metadata
     * @param _documentHash Hash of the document
     * @return metadata Stored metadata string
     */
    function getDocumentMetadata(bytes32 _documentHash) 
        external 
        view 
        documentExists(_documentHash) 
        returns (string memory) 
    {
        return documents[_documentHash].metadata;
    }
} 