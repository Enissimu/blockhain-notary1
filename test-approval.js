const axios = require('axios');

// Replace this with your actual document hash from the notarization
const DOCUMENT_HASH = '0x93877891d0e8f74968926b2963228f24cc6eb66835b5066230ef5b8c2a7643ad'; // Example hash - replace with yours

async function testDocumentApproval() {
  console.log('🧪 Testing document approval functionality...\n');
  
  try {
    console.log('📋 Document Hash:', DOCUMENT_HASH);
    console.log('🔍 Step 1: Verifying document before approval...');
    
    // First, verify the document to see current state
    const verifyResponse = await axios.get(`http://localhost:3000/api/documents/${DOCUMENT_HASH}/verify`);
    
    if (verifyResponse.data.success && verifyResponse.data.data.exists) {
      const doc = verifyResponse.data.data;
      console.log('✅ Document found!');
      console.log(`   Status: ${doc.status}`);
      console.log(`   Signatures: ${doc.signerCount}`);
      console.log(`   Approvals: ${doc.approverCount}`);
      console.log();
      
      // Now approve the document
      console.log('👍 Step 2: Approving the document...');
      const approveResponse = await axios.post(`http://localhost:3000/api/documents/${DOCUMENT_HASH}/approve`);
      
      if (approveResponse.data.success) {
        console.log('✅ Document approved successfully!');
        console.log('📄 Transaction hash:', approveResponse.data.data.transactionHash);
        console.log();
        
        // Verify again to see the updated approval count
        console.log('🔍 Step 3: Verifying document after approval...');
        const verifyAfterResponse = await axios.get(`http://localhost:3000/api/documents/${DOCUMENT_HASH}/verify`);
        
        if (verifyAfterResponse.data.success) {
          const updatedDoc = verifyAfterResponse.data.data;
          console.log('✅ Updated document state:');
          console.log(`   Status: ${updatedDoc.status}`);
          console.log(`   Signatures: ${updatedDoc.signerCount}`);
          console.log(`   Approvals: ${updatedDoc.approverCount} 📈 (Should be increased!)`);
        }
      }
    } else {
      console.log('❌ Document not found. Please check your document hash.');
      console.log('💡 Make sure you replace DOCUMENT_HASH in this script with your actual hash.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure your backend is running (npm start)');
      console.log('2. Replace DOCUMENT_HASH in this script with your actual document hash');
      console.log('3. Check that the document was successfully notarized');
    }
  }
}

console.log('🚀 Document Approval Test');
console.log('=' .repeat(50));
console.log('📝 Instructions:');
console.log('1. Copy your document hash from the notarization success message');
console.log('2. Replace DOCUMENT_HASH variable in this script');
console.log('3. Run: node test-approval.js');
console.log('=' .repeat(50));
console.log();

testDocumentApproval(); 