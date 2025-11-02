/**
 * Create Metorial Deployment
 * Create a new deployment for the ClaimSense MCP server
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: require('path').join(__dirname, '..', '.env.local') });

import { Metorial } from 'metorial';

async function createDeployment() {
  const apiKey = process.env.METORIAL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ METORIAL_API_KEY not configured');
    return;
  }

  console.log('🚀 Creating Metorial deployment for ClaimSense...\n');

  try {
    const metorial = new Metorial({ apiKey });

    // Try to create a server deployment
    console.log('📝 Creating server deployment...');
    
    const deployment = await metorial.servers.deployments.create({
      name: 'ClaimSense Agent',
      description: 'Healthcare billing AI assistant with claim validation and fixing tools',
      // implementation: 'local', // or 'hosted', 'custom'
      // Add any other required fields
    });

    console.log('✅ Deployment created successfully!\n');
    console.log('📦 Deployment Details:');
    console.log(`   ID: ${deployment.id}`);
    console.log(`   Name: ${deployment.name || 'N/A'}`);
    console.log(`   Status: ${deployment.status || 'N/A'}`);
    console.log('');
    console.log('🔗 View in dashboard:');
    console.log(`   https://app.metorial.com/i/agent-jam/claimgenius/development-0207/deployments/${deployment.id}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log(`   1. Update your code to use deployment ID: "${deployment.id}"`);
    console.log('   2. Run the agent with agentic mode enabled');
    console.log('   3. Check the Metorial dashboard for session logs');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error creating deployment:', error.message);
    
    if (error.response) {
      console.error('\n📋 Response details:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('\n📋 Error body:', JSON.stringify(error.body, null, 2));
    }

    console.log('\n💡 Alternative: Create deployment through web UI:');
    console.log('   1. Visit: https://app.metorial.com/i/agent-jam/claimgenius');
    console.log('   2. Look for "Deployments" or "Servers" section');
    console.log('   3. Click "Create Deployment" or "Add Server"');
    console.log('   4. Choose "Custom MCP Server" or "Local Server"');
    console.log('   5. Provide your server URL or configuration');
    console.log('   6. Copy the deployment ID for use in your code');
  }
}

createDeployment().catch(console.error);

