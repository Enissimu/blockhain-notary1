const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NotaryService", function () {
  let NotaryService;
  let notaryService;
  let owner;
  let notary1;
  let notary2;
  let signer1;
  let signer2;
  let approver1;
  let accounts;

  // Sample document hashes
  const documentHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("document1"));
  const documentHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("document2"));
  const documentHash3 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("document3"));
  
  const metadata1 = "Contract Agreement v1.0";
  const metadata2 = "Legal Document - Terms of Service";

  beforeEach(async function () {
    // Get contract factory and signers
    NotaryService = await ethers.getContractFactory("NotaryService");
    accounts = await ethers.getSigners();
    [owner, notary1, notary2, signer1, signer2, approver1] = accounts;

    // Deploy contract
    notaryService = await NotaryService.deploy();
    await notaryService.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await notaryService.owner()).to.equal(owner.address);
    });

    it("Should authorize the owner as a notary", async function () {
      expect(await notaryService.authorizedNotaries(owner.address)).to.be.true;
    });

    it("Should initialize with zero total documents", async function () {
      expect(await notaryService.totalDocuments()).to.equal(0);
    });
  });

  describe("Notary Management", function () {
    it("Should allow owner to add a notary", async function () {
      await notaryService.addNotary(notary1.address);
      expect(await notaryService.authorizedNotaries(notary1.address)).to.be.true;
    });

    it("Should allow owner to remove a notary", async function () {
      await notaryService.addNotary(notary1.address);
      await notaryService.removeNotary(notary1.address);
      expect(await notaryService.authorizedNotaries(notary1.address)).to.be.false;
    });

    it("Should not allow non-owner to add notary", async function () {
      await expect(
        notaryService.connect(notary1).addNotary(notary2.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should not allow non-owner to remove notary", async function () {
      await expect(
        notaryService.connect(notary1).removeNotary(owner.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Document Notarization", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
    });

    it("Should notarize a document successfully", async function () {
      const requiredSigners = [signer1.address, signer2.address];
      
      await expect(
        notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, requiredSigners)
      ).to.emit(notaryService, "DocumentNotarized")
        .withArgs(documentHash1, notary1.address, anyValue, metadata1);

      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.exists).to.be.true;
      expect(doc.notary).to.equal(notary1.address);
      expect(doc.status).to.equal(0); // PENDING
      expect(doc.signerCount).to.equal(0);
      expect(doc.approverCount).to.equal(0);
    });

    it("Should not allow unauthorized user to notarize", async function () {
      await expect(
        notaryService.connect(signer1).notarizeDocument(documentHash1, metadata1, [])
      ).to.be.revertedWith("Not authorized notary");
    });

    it("Should not allow notarizing the same document twice", async function () {
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, []);
      
      await expect(
        notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, [])
      ).to.be.revertedWith("Document already notarized");
    });

    it("Should increment total documents count", async function () {
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, []);
      expect(await notaryService.totalDocuments()).to.equal(1);
      
      await notaryService.connect(notary1).notarizeDocument(documentHash2, metadata2, []);
      expect(await notaryService.totalDocuments()).to.equal(2);
    });

    it("Should store required signers correctly", async function () {
      const requiredSigners = [signer1.address, signer2.address];
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, requiredSigners);
      
      const signers = await notaryService.getRequiredSigners(documentHash1);
      expect(signers).to.deep.equal(requiredSigners);
    });

    it("Should store document metadata correctly", async function () {
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, []);
      
      const metadata = await notaryService.getDocumentMetadata(documentHash1);
      expect(metadata).to.equal(metadata1);
    });
  });

  describe("Document Signing", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
      const requiredSigners = [signer1.address, signer2.address];
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, requiredSigners);
    });

    it("Should allow required signer to sign document", async function () {
      await expect(
        notaryService.connect(signer1).signDocument(documentHash1)
      ).to.emit(notaryService, "DocumentSigned")
        .withArgs(documentHash1, signer1.address, anyValue);

      const hasSigned = await notaryService.hasSigned(documentHash1, signer1.address);
      expect(hasSigned).to.be.true;

      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.signerCount).to.equal(1);
    });

    it("Should not allow non-required signer to sign", async function () {
      await expect(
        notaryService.connect(approver1).signDocument(documentHash1)
      ).to.be.revertedWith("Not a required signer");
    });

    it("Should not allow double signing", async function () {
      await notaryService.connect(signer1).signDocument(documentHash1);
      
      await expect(
        notaryService.connect(signer1).signDocument(documentHash1)
      ).to.be.revertedWith("Already signed");
    });

    it("Should update status to SIGNED when all signers have signed", async function () {
      await notaryService.connect(signer1).signDocument(documentHash1);
      
      let doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.status).to.equal(0); // Still PENDING
      
      await notaryService.connect(signer2).signDocument(documentHash1);
      
      doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.status).to.equal(1); // Now SIGNED
      expect(doc.signerCount).to.equal(2);
    });

    it("Should not allow signing non-existent document", async function () {
      await expect(
        notaryService.connect(signer1).signDocument(documentHash2)
      ).to.be.revertedWith("Document does not exist");
    });
  });

  describe("Document Approval", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
      const requiredSigners = [signer1.address];
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, requiredSigners);
      await notaryService.connect(signer1).signDocument(documentHash1);
    });

    it("Should allow anyone to approve a signed document", async function () {
      await expect(
        notaryService.connect(approver1).approveDocument(documentHash1)
      ).to.emit(notaryService, "DocumentApproved")
        .withArgs(documentHash1, approver1.address, anyValue);

      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.status).to.equal(2); // APPROVED
      expect(doc.approverCount).to.equal(1);
    });

    it("Should not allow double approval from same address", async function () {
      await notaryService.connect(approver1).approveDocument(documentHash1);
      
      await expect(
        notaryService.connect(approver1).approveDocument(documentHash1)
      ).to.be.revertedWith("Already approved");
    });

    it("Should allow approval of pending document", async function () {
      // Create a new document that's still pending
      await notaryService.connect(notary1).notarizeDocument(documentHash2, metadata2, [signer1.address]);
      
      await expect(
        notaryService.connect(approver1).approveDocument(documentHash2)
      ).to.emit(notaryService, "DocumentApproved");

      const doc = await notaryService.verifyDocument(documentHash2);
      expect(doc.approverCount).to.equal(1);
    });
  });

  describe("Document Rejection", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
      const requiredSigners = [signer1.address, signer2.address];
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, requiredSigners);
    });

    it("Should allow required signer to reject document", async function () {
      const reason = "Terms not acceptable";
      
      await expect(
        notaryService.connect(signer1).rejectDocument(documentHash1, reason)
      ).to.emit(notaryService, "DocumentRejected")
        .withArgs(documentHash1, signer1.address, anyValue, reason);

      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.status).to.equal(3); // REJECTED
    });

    it("Should not allow non-required signer to reject", async function () {
      await expect(
        notaryService.connect(approver1).rejectDocument(documentHash1, "reason")
      ).to.be.revertedWith("Not a required signer");
    });

    it("Should not allow rejection of non-pending document", async function () {
      // Sign the document first
      await notaryService.connect(signer1).signDocument(documentHash1);
      await notaryService.connect(signer2).signDocument(documentHash1);
      
      await expect(
        notaryService.connect(signer1).rejectDocument(documentHash1, "reason")
      ).to.be.revertedWith("Can only reject pending documents");
    });
  });

  describe("Document Versioning", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, [signer1.address]);
    });

    it("Should create a new document version", async function () {
      const changeDescription = "Updated terms and conditions";
      
      await expect(
        notaryService.connect(signer1).createDocumentVersion(documentHash1, documentHash2, changeDescription)
      ).to.emit(notaryService, "DocumentVersionCreated")
        .withArgs(documentHash1, documentHash2, 2, signer1.address);

      const latestVersion = await notaryService.getLatestVersion(documentHash1);
      expect(latestVersion).to.equal(documentHash2);
    });

    it("Should not allow creating version with existing hash", async function () {
      await expect(
        notaryService.connect(signer1).createDocumentVersion(documentHash1, documentHash1, "change")
      ).to.be.revertedWith("New version hash already exists");
    });

    it("Should track version history correctly", async function () {
      await notaryService.connect(signer1).createDocumentVersion(documentHash1, documentHash2, "Version 2");
      await notaryService.connect(signer1).createDocumentVersion(documentHash1, documentHash3, "Version 3");

      const versions = await notaryService.getDocumentVersions(documentHash1);
      expect(versions.length).to.equal(3);
      
      expect(versions[0].version).to.equal(1);
      expect(versions[0].isLatest).to.be.false;
      
      expect(versions[1].version).to.equal(2);
      expect(versions[1].isLatest).to.be.false;
      
      expect(versions[2].version).to.equal(3);
      expect(versions[2].isLatest).to.be.true;
    });

    it("Should not allow versioning non-existent document", async function () {
      await expect(
        notaryService.connect(signer1).createDocumentVersion(documentHash3, documentHash2, "change")
      ).to.be.revertedWith("Document does not exist");
    });
  });

  describe("Document Verification", function () {
    it("Should return false for non-existent document", async function () {
      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.exists).to.be.false;
    });

    it("Should return correct document information", async function () {
      await notaryService.addNotary(notary1.address);
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, [signer1.address]);
      
      const doc = await notaryService.verifyDocument(documentHash1);
      expect(doc.exists).to.be.true;
      expect(doc.notary).to.equal(notary1.address);
      expect(doc.status).to.equal(0); // PENDING
      expect(doc.signerCount).to.equal(0);
      expect(doc.approverCount).to.equal(0);
    });
  });

  describe("Edge Cases and Security", function () {
    beforeEach(async function () {
      await notaryService.addNotary(notary1.address);
    });

    it("Should handle empty required signers array", async function () {
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, []);
      
      const signers = await notaryService.getRequiredSigners(documentHash1);
      expect(signers.length).to.equal(0);
    });

    it("Should handle long metadata strings", async function () {
      const longMetadata = "A".repeat(1000);
      await notaryService.connect(notary1).notarizeDocument(documentHash1, longMetadata, []);
      
      const metadata = await notaryService.getDocumentMetadata(documentHash1);
      expect(metadata).to.equal(longMetadata);
    });

    it("Should properly handle gas optimization", async function () {
      // Test with many required signers
      const manySigners = accounts.slice(0, 10).map(acc => acc.address);
      await notaryService.connect(notary1).notarizeDocument(documentHash1, metadata1, manySigners);
      
      const signers = await notaryService.getRequiredSigners(documentHash1);
      expect(signers.length).to.equal(10);
    });
  });

  // Helper to match any value in events
  const anyValue = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
}); 