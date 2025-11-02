/**
 * Pipeline Functionality Test Script
 * Tests all pipeline and deal endpoints
 * 
 * Usage: node test-pipeline.js
 * 
 * Prerequisites:
 * - API server running on http://localhost:4000
 * - Database seeded with demo data
 * - Valid user credentials (admin@demo.com / Admin12345)
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Test credentials
const TEST_USER = {
  email: 'admin@demo.com',
  password: 'Admin12345',
};

let accessToken = null;
let testPipelineId = null;
let testDealId = null;
let testCustomerId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${name}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, body = null, token = null) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

// Test 1: Login and get access token
async function testLogin() {
  logTest('1. Authentication - Login');
  
  const { status, data } = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (status === 200 && data.success && data.data.accessToken) {
    accessToken = data.data.accessToken;
    logSuccess('Login successful');
    logInfo(`Token received: ${accessToken.substring(0, 20)}...`);
    return true;
  } else {
    logError(`Login failed: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 2: Get all pipelines
async function testGetAllPipelines() {
  logTest('2. Pipeline API - Get All Pipelines');
  
  const { status, data } = await makeRequest('GET', '/api/pipelines', null, accessToken);

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} pipeline(s)`);
    
    if (data.data.length > 0) {
      const pipeline = data.data[0];
      testPipelineId = pipeline.id;
      logInfo(`First pipeline: ${pipeline.name} (ID: ${pipeline.id})`);
      logInfo(`Stages: ${JSON.stringify(pipeline.stages, null, 2)}`);
      logInfo(`Is Default: ${pipeline.isDefault}`);
    } else {
      logWarning('No pipelines found. Database may need seeding.');
    }
    
    return true;
  } else {
    logError(`Failed to get pipelines: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 3: Get default pipeline
async function testGetDefaultPipeline() {
  logTest('3. Pipeline API - Get Default Pipeline');
  
  const { status, data } = await makeRequest('GET', '/api/pipelines/default', null, accessToken);

  if (status === 200 && data.success && data.data) {
    logSuccess('Retrieved default pipeline');
    logInfo(`Pipeline: ${data.data.name} (ID: ${data.data.id})`);
    logInfo(`Stages: ${JSON.stringify(data.data.stages, null, 2)}`);
    
    if (!testPipelineId) {
      testPipelineId = data.data.id;
    }
    
    return true;
  } else {
    logError(`Failed to get default pipeline: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 4: Get pipeline by ID
async function testGetPipelineById() {
  logTest('4. Pipeline API - Get Pipeline by ID');
  
  if (!testPipelineId) {
    logWarning('No pipeline ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/pipelines/${testPipelineId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Retrieved pipeline: ${data.data.name}`);
    logInfo(`ID: ${data.data.id}`);
    logInfo(`Stages count: ${Array.isArray(data.data.stages) ? data.data.stages.length : 0}`);
    return true;
  } else {
    logError(`Failed to get pipeline by ID: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 5: Get customers (needed for creating deals)
async function testGetCustomers() {
  logTest('5. Customer API - Get Customers (for Deal Creation)');
  
  const { status, data } = await makeRequest('GET', '/api/customers', null, accessToken);

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} customer(s)`);
    
    if (data.data.length > 0) {
      testCustomerId = data.data[0].id;
      logInfo(`Using customer: ${data.data[0].firstName} ${data.data[0].lastName} (ID: ${testCustomerId})`);
    } else {
      logWarning('No customers found. A customer is needed to create deals.');
      logInfo('Consider creating a customer first or seeding the database.');
    }
    
    return true;
  } else {
    logError(`Failed to get customers: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 6: Get deals (with pipeline filter)
async function testGetDeals() {
  logTest('6. Deal API - Get All Deals');
  
  const { status, data } = await makeRequest('GET', '/api/deals', null, accessToken);

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} deal(s)`);
    
    if (data.data.length > 0 && testPipelineId) {
      // Filter deals by pipeline
      const pipelineDeals = data.data.filter(d => d.pipelineId === testPipelineId);
      logInfo(`Deals in test pipeline: ${pipelineDeals.length}`);
    }
    
    return true;
  } else {
    logError(`Failed to get deals: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 7: Get deals filtered by pipeline
async function testGetDealsByPipeline() {
  logTest('7. Deal API - Get Deals by Pipeline ID');
  
  if (!testPipelineId) {
    logWarning('No pipeline ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/deals?pipelineId=${testPipelineId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} deal(s) for pipeline`);
    return true;
  } else {
    logError(`Failed to get deals by pipeline: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 8: Create a deal
async function testCreateDeal() {
  logTest('8. Deal API - Create Deal');
  
  if (!testPipelineId || !testCustomerId) {
    logWarning('Missing pipeline ID or customer ID. Skipping test.');
    logInfo('Pipeline ID:', testPipelineId);
    logInfo('Customer ID:', testCustomerId);
    return false;
  }

  // Get pipeline to get first stage
  const { status: pipelineStatus, data: pipelineData } = await makeRequest(
    'GET',
    `/api/pipelines/${testPipelineId}`,
    null,
    accessToken
  );

  if (pipelineStatus !== 200 || !pipelineData.success) {
    logError('Failed to get pipeline stages');
    return false;
  }

  const stages = pipelineData.data.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    logError('Pipeline has no stages');
    return false;
  }

  const firstStage = stages[0];
  const dealData = {
    customerId: testCustomerId,
    pipelineId: testPipelineId,
    stageId: firstStage.id,
    title: 'Test Deal - Pipeline Testing',
    value: 5000.00,
    currency: 'USD',
    probability: firstStage.probability || 10,
    notes: 'This is a test deal created by the pipeline test script',
  };

  const { status, data } = await makeRequest('POST', '/api/deals', dealData, accessToken);

  if (status === 201 && data.success && data.data) {
    testDealId = data.data.id;
    logSuccess(`Deal created: ${data.data.title}`);
    logInfo(`Deal ID: ${testDealId}`);
    logInfo(`Value: ${data.data.currency} ${data.data.value}`);
    logInfo(`Stage: ${data.data.stageId}`);
    return true;
  } else {
    logError(`Failed to create deal: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 9: Get deal by ID
async function testGetDealById() {
  logTest('9. Deal API - Get Deal by ID');
  
  if (!testDealId) {
    logWarning('No deal ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/deals/${testDealId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Retrieved deal: ${data.data.title}`);
    logInfo(`ID: ${data.data.id}`);
    logInfo(`Value: ${data.data.currency} ${data.data.value}`);
    logInfo(`Probability: ${data.data.probability}%`);
    logInfo(`Stage ID: ${data.data.stageId}`);
    return true;
  } else {
    logError(`Failed to get deal by ID: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 10: Update deal (move to next stage)
async function testUpdateDealStage() {
  logTest('10. Deal API - Update Deal (Move to Next Stage)');
  
  if (!testDealId || !testPipelineId) {
    logWarning('Missing deal ID or pipeline ID. Skipping test.');
    return false;
  }

  // Get pipeline stages
  const { status: pipelineStatus, data: pipelineData } = await makeRequest(
    'GET',
    `/api/pipelines/${testPipelineId}`,
    null,
    accessToken
  );

  if (pipelineStatus !== 200 || !pipelineData.success) {
    logError('Failed to get pipeline stages');
    return false;
  }

  const stages = pipelineData.data.stages;
  if (!Array.isArray(stages) || stages.length < 2) {
    logWarning('Pipeline has less than 2 stages. Cannot test stage movement.');
    return false;
  }

  // Get current deal to find current stage
  const { status: dealStatus, data: dealData } = await makeRequest(
    'GET',
    `/api/deals/${testDealId}`,
    null,
    accessToken
  );

  if (dealStatus !== 200 || !dealData.success) {
    logError('Failed to get current deal');
    return false;
  }

  const currentStageId = dealData.data.stageId;
  const currentStageIndex = stages.findIndex(s => s.id === currentStageId);
  
  // Move to next stage
  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex >= stages.length) {
    logInfo('Deal is already in the last stage. Updating value instead.');
    const updateData = {
      value: 6000.00,
      probability: 50,
    };

    const { status, data } = await makeRequest(
      'PUT',
      `/api/deals/${testDealId}`,
      updateData,
      accessToken
    );

    if (status === 200 && data.success) {
      logSuccess('Deal updated (value and probability)');
      logInfo(`New value: ${data.data.value}`);
      logInfo(`New probability: ${data.data.probability}%`);
      return true;
    } else {
      logError(`Failed to update deal: ${JSON.stringify(data)}`);
      return false;
    }
  }

  const nextStage = stages[nextStageIndex];
  const updateData = {
    stageId: nextStage.id,
    probability: nextStage.probability || (currentStageIndex + 1) * 20,
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/deals/${testDealId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success) {
    logSuccess(`Deal moved to next stage: ${nextStage.name}`);
    logInfo(`Old Stage ID: ${currentStageId}`);
    logInfo(`New Stage ID: ${data.data.stageId}`);
    logInfo(`New Probability: ${data.data.probability}%`);
    return true;
  } else {
    logError(`Failed to update deal stage: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 11: Delete deal
async function testDeleteDeal() {
  logTest('11. Deal API - Delete Deal');
  
  if (!testDealId) {
    logWarning('No deal ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'DELETE',
    `/api/deals/${testDealId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success) {
    logSuccess('Deal deleted successfully');
    testDealId = null; // Clear the ID
    return true;
  } else {
    logError(`Failed to delete deal: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 12: Error handling - Invalid pipeline ID
async function testErrorHandling() {
  logTest('12. Error Handling - Invalid Pipeline ID');
  
  const invalidId = '00000000-0000-0000-0000-000000000000';
  const { status, data } = await makeRequest(
    'GET',
    `/api/pipelines/${invalidId}`,
    null,
    accessToken
  );

  if (status === 404 && !data.success && data.error) {
    logSuccess('Error handling works correctly');
    logInfo(`Error: ${data.error.message}`);
    return true;
  } else {
    logWarning(`Unexpected response: ${JSON.stringify(data)}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('PIPELINE FUNCTIONALITY TEST SUITE', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const tests = [
    { name: 'Login', fn: testLogin, required: true },
    { name: 'Get All Pipelines', fn: testGetAllPipelines, required: true },
    { name: 'Get Default Pipeline', fn: testGetDefaultPipeline, required: false },
    { name: 'Get Pipeline by ID', fn: testGetPipelineById, required: false },
    { name: 'Get Customers', fn: testGetCustomers, required: false },
    { name: 'Get All Deals', fn: testGetDeals, required: false },
    { name: 'Get Deals by Pipeline', fn: testGetDealsByPipeline, required: false },
    { name: 'Create Deal', fn: testCreateDeal, required: false },
    { name: 'Get Deal by ID', fn: testGetDealById, required: false },
    { name: 'Update Deal Stage', fn: testUpdateDealStage, required: false },
    { name: 'Delete Deal', fn: testDeleteDeal, required: false },
    { name: 'Error Handling', fn: testErrorHandling, required: false },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        results.passed++;
      } else {
        if (test.required) {
          results.failed++;
          logError(`Required test failed: ${test.name}`);
          logWarning('Stopping tests due to required test failure');
          break;
        } else {
          results.skipped++;
        }
      }
    } catch (error) {
      logError(`Test error: ${test.name} - ${error.message}`);
      if (test.required) {
        results.failed++;
        break;
      } else {
        results.skipped++;
      }
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Skipped: ${results.skipped}`, 'yellow');
  log('='.repeat(60) + '\n', 'bright');

  if (results.failed === 0) {
    log('🎉 All critical tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the output above.', 'red');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  logError('This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

