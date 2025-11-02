/**
 * Test Metorial Integration
 * Verifies that Metorial API key is configured and telemetry works
 */

// CRITICAL: Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
config({ path: require('path').join(__dirname, '..', '.env.local') });

// Now import other modules (they will see the env vars)
import {
  isMetorialConfigured,
  createMetorialSession,
  logMetorialStep,
  completeMetorialSession,
} from '../server/metorial/client';

async function testMetorialIntegration() {
  console.log('🧪 Testing Metorial Integration...\n');

  // Check configuration
  console.log('1️⃣ Checking configuration...');
  const isConfigured = isMetorialConfigured();
  
  if (isConfigured) {
    console.log('✅ Metorial API key is configured\n');
  } else {
    console.log('⚠️  Metorial API key NOT configured');
    console.log('   Add METORIAL_API_KEY to .env.local\n');
    return;
  }

  // Test session creation
  const testSessionId = `test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const testGoal = 'Test Metorial integration from ClaimSense';

  console.log('2️⃣ Creating test session...');
  console.log(`   Session ID: ${testSessionId}`);
  console.log(`   Goal: ${testGoal}`);
  
  await createMetorialSession(testSessionId, testGoal, 'ClaimSense Test Agent');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test step logging
  console.log('\n3️⃣ Logging test steps...');
  
  await logMetorialStep(
    testSessionId,
    1,
    'Testing step 1: Initializing test workflow',
    'test_tool_1',
    { param1: 'test_value_1' },
    { result: 'success', data: 'test_output_1' },
    'success'
  );
  console.log('   ✅ Step 1 logged');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await logMetorialStep(
    testSessionId,
    2,
    'Testing step 2: Processing test data',
    'test_tool_2',
    { param2: 'test_value_2' },
    { result: 'success', data: 'test_output_2' },
    'success'
  );
  console.log('   ✅ Step 2 logged');

  // Test completion
  console.log('\n4️⃣ Completing test session...');
  
  await completeMetorialSession(
    testSessionId,
    2,
    1500,
    'completed',
    { test_result: 'Integration test successful!' }
  );

  // Final summary
  console.log('\n✅ Test completed successfully!');
  console.log('\n📊 View this test session in Metorial dashboard:');
  console.log(`🔗 https://app.metorial.com/i/agent-jam/claimgenius/development-0207/sessions/${testSessionId}\n`);
  console.log('💡 Tip: Process a real claim with agentic mode enabled to see full workflows in the dashboard\n');
}

// Run test
testMetorialIntegration().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

