/**
 * Check Metorial Deployments
 * Query available deployments and attempt to connect
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: require('path').join(__dirname, '..', '.env.local') });

import { Metorial } from 'metorial';

async function checkDeployments() {
  const apiKey = process.env.METORIAL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ METORIAL_API_KEY not configured');
    return;
  }

  console.log('🔍 Checking Metorial deployments...\n');
  console.log(`API Key: ${apiKey.substring(0, 20)}...\n`);

  try {
    const metorial = new Metorial({ apiKey });

    // Try to list deployments
    console.log('📋 Attempting to list deployments...');
    
    try {
      const deployments = await metorial.servers.deployments.list({});
      const deploymentsArray = Array.isArray(deployments) ? deployments : (deployments as any).data || [];
      console.log(`✅ Found ${deploymentsArray.length} deployments:\n`);
      
      for (const deployment of deploymentsArray) {
        console.log(`  📦 ${deployment.id}`);
        console.log(`     Name: ${deployment.name || 'N/A'}`);
        console.log(`     Status: ${deployment.status || 'N/A'}`);
        console.log(`     Created: ${deployment.createdAt || 'N/A'}`);
        console.log('');
      }
    } catch (error: any) {
      console.warn('⚠️  Could not list deployments:', error.message);
      console.log('\nℹ️  This might mean:');
      console.log('   1. No deployments exist yet in your workspace');
      console.log('   2. You need to create deployments through the Metorial web UI');
      console.log('   3. The API key doesn\'t have permission to list deployments\n');
    }

    // Try the known deployment ID from the URL
    console.log('🔗 Checking known deployment: development-0207...');
    
    try {
      const deployment = await metorial.servers.deployments.get('development-0207');
      console.log('✅ Found deployment:', deployment);
    } catch (error: any) {
      console.warn('⚠️  Deployment "development-0207" not found:', error.message);
      console.log('\nℹ️  You may need to:');
      console.log('   1. Go to https://app.metorial.com/i/agent-jam/claimgenius');
      console.log('   2. Create a new deployment in the UI');
      console.log('   3. Note the deployment ID');
      console.log('   4. Use that ID in your code\n');
    }

    // Show how to create a deployment
    console.log('\n💡 To create a deployment:');
    console.log('   1. Visit: https://app.metorial.com/i/agent-jam/claimgenius');
    console.log('   2. Click "New Deployment" or "Create Server"');
    console.log('   3. Follow the UI wizard to deploy your MCP server');
    console.log('   4. Copy the deployment ID');
    console.log('   5. Use it in metorial.run({ serverDeployments: ["your-id"] })\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkDeployments().catch(console.error);

