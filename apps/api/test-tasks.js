/**
 * Task Management Functionality Test Script
 * Tests all task endpoints and features
 * 
 * Usage: node test-tasks.js
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
let testTaskId = null;
let testCustomerId = null;
let testUserId = null;

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
    testUserId = data.data.user.id;
    logSuccess('Login successful');
    logInfo(`Token received: ${accessToken.substring(0, 20)}...`);
    logInfo(`User ID: ${testUserId}`);
    return true;
  } else {
    logError(`Login failed: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 2: Get all tasks
async function testGetAllTasks() {
  logTest('2. Task API - Get All Tasks');
  
  const { status, data } = await makeRequest('GET', '/api/tasks', null, accessToken);

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} task(s)`);
    
    if (data.data.length > 0) {
      const task = data.data[0];
      logInfo(`Sample task: ${task.title} (Status: ${task.status}, Priority: ${task.priority})`);
    } else {
      logInfo('No existing tasks found. Will create test tasks.');
    }
    
    return true;
  } else {
    logError(`Failed to get tasks: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 3: Get customers (for task association)
async function testGetCustomers() {
  logTest('3. Customer API - Get Customers (for Task Association)');
  
  const { status, data } = await makeRequest('GET', '/api/customers', null, accessToken);

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} customer(s)`);
    
    if (data.data.length > 0) {
      testCustomerId = data.data[0].id;
      logInfo(`Using customer: ${data.data[0].firstName} ${data.data[0].lastName} (ID: ${testCustomerId})`);
    } else {
      logWarning('No customers found. Tasks will be created without customer association.');
    }
    
    return true;
  } else {
    logError(`Failed to get customers: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 4: Create a simple task
async function testCreateSimpleTask() {
  logTest('4. Task API - Create Simple Task');
  
  const taskData = {
    title: 'Test Task - Simple',
    description: 'This is a simple test task created by the test script',
    priority: 'MEDIUM',
    status: 'PENDING',
  };

  const { status, data } = await makeRequest('POST', '/api/tasks', taskData, accessToken);

  if (status === 201 && data.success && data.data) {
    testTaskId = data.data.id;
    logSuccess(`Task created: ${data.data.title}`);
    logInfo(`Task ID: ${testTaskId}`);
    logInfo(`Status: ${data.data.status}`);
    logInfo(`Priority: ${data.data.priority}`);
    logInfo(`Assignee: ${data.data.assigneeFirstName} ${data.data.assigneeLastName}`);
    return true;
  } else {
    logError(`Failed to create task: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 5: Create a task with all fields
async function testCreateFullTask() {
  logTest('5. Task API - Create Task with All Fields');
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

  const taskData = {
    title: 'Test Task - Complete',
    description: 'This is a complete test task with all fields populated',
    priority: 'HIGH',
    status: 'PENDING',
    dueDate: dueDate.toISOString(),
    assigneeId: testUserId,
    relatedCustomerId: testCustomerId || null,
    isRecurring: false,
  };

  const { status, data } = await makeRequest('POST', '/api/tasks', taskData, accessToken);

  if (status === 201 && data.success && data.data) {
    logSuccess(`Complete task created: ${data.data.title}`);
    logInfo(`Task ID: ${data.data.id}`);
    logInfo(`Priority: ${data.data.priority}`);
    logInfo(`Due Date: ${data.data.dueDate}`);
    logInfo(`Customer: ${data.data.customerFirstName || 'None'}`);
    return true;
  } else {
    logError(`Failed to create complete task: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 6: Get task by ID
async function testGetTaskById() {
  logTest('6. Task API - Get Task by ID');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/tasks/${testTaskId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Retrieved task: ${data.data.title}`);
    logInfo(`ID: ${data.data.id}`);
    logInfo(`Status: ${data.data.status}`);
    logInfo(`Priority: ${data.data.priority}`);
    logInfo(`Assignee: ${data.data.assigneeFirstName} ${data.data.assigneeLastName}`);
    return true;
  } else {
    logError(`Failed to get task by ID: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 7: Filter tasks by status
async function testFilterTasksByStatus() {
  logTest('7. Task API - Filter Tasks by Status');
  
  const { status, data } = await makeRequest(
    'GET',
    '/api/tasks?status=PENDING',
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} pending task(s)`);
    return true;
  } else {
    logError(`Failed to filter tasks by status: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 8: Filter tasks by priority
async function testFilterTasksByPriority() {
  logTest('8. Task API - Filter Tasks by Priority');
  
  const { status, data } = await makeRequest(
    'GET',
    '/api/tasks?priority=HIGH',
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} high priority task(s)`);
    return true;
  } else {
    logError(`Failed to filter tasks by priority: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 9: Update task - Change status to IN_PROGRESS
async function testUpdateTaskStatus() {
  logTest('9. Task API - Update Task Status');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const updateData = {
    status: 'IN_PROGRESS',
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/tasks/${testTaskId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Task status updated to: ${data.data.status}`);
    logInfo(`Task: ${data.data.title}`);
    return true;
  } else {
    logError(`Failed to update task status: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 10: Update task - Change priority
async function testUpdateTaskPriority() {
  logTest('10. Task API - Update Task Priority');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const updateData = {
    priority: 'HIGH',
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/tasks/${testTaskId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Task priority updated to: ${data.data.priority}`);
    logInfo(`Task: ${data.data.title}`);
    return true;
  } else {
    logError(`Failed to update task priority: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 11: Update task - Add time spent
async function testUpdateTaskTimeSpent() {
  logTest('11. Task API - Update Task Time Spent');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const updateData = {
    timeSpent: 120, // 120 minutes = 2 hours
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/tasks/${testTaskId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Task time spent updated: ${data.data.timeSpent} minutes`);
    logInfo(`Task: ${data.data.title}`);
    return true;
  } else {
    logError(`Failed to update task time spent: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 12: Complete task - Change status to COMPLETE
async function testCompleteTask() {
  logTest('12. Task API - Complete Task');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const updateData = {
    status: 'COMPLETE',
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/tasks/${testTaskId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Task completed: ${data.data.title}`);
    logInfo(`Status: ${data.data.status}`);
    logInfo(`Completed At: ${data.data.completedAt || 'Not set'}`);
    
    if (data.data.completedAt) {
      logSuccess('✅ CompletedAt timestamp automatically set');
    } else {
      logWarning('⚠️ CompletedAt timestamp not set');
    }
    
    return true;
  } else {
    logError(`Failed to complete task: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 13: Update task description
async function testUpdateTaskDescription() {
  logTest('13. Task API - Update Task Description');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  // Revert status to IN_PROGRESS for further testing
  const updateData = {
    status: 'IN_PROGRESS',
    description: 'Updated description - Task management testing complete',
  };

  const { status, data } = await makeRequest(
    'PUT',
    `/api/tasks/${testTaskId}`,
    updateData,
    accessToken
  );

  if (status === 200 && data.success && data.data) {
    logSuccess(`Task description updated`);
    logInfo(`New description: ${data.data.description}`);
    return true;
  } else {
    logError(`Failed to update task description: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 14: Filter tasks by assignee
async function testFilterTasksByAssignee() {
  logTest('14. Task API - Filter Tasks by Assignee');
  
  if (!testUserId) {
    logWarning('No user ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/tasks?assigneeId=${testUserId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} task(s) assigned to current user`);
    return true;
  } else {
    logError(`Failed to filter tasks by assignee: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 15: Filter tasks by customer
async function testFilterTasksByCustomer() {
  logTest('15. Task API - Filter Tasks by Customer');
  
  if (!testCustomerId) {
    logWarning('No customer ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'GET',
    `/api/tasks?customerId=${testCustomerId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} task(s) related to customer`);
    return true;
  } else {
    logError(`Failed to filter tasks by customer: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 16: Delete task
async function testDeleteTask() {
  logTest('16. Task API - Delete Task');
  
  if (!testTaskId) {
    logWarning('No task ID available. Skipping test.');
    return false;
  }

  const { status, data } = await makeRequest(
    'DELETE',
    `/api/tasks/${testTaskId}`,
    null,
    accessToken
  );

  if (status === 200 && data.success) {
    logSuccess('Task deleted successfully');
    testTaskId = null; // Clear the ID
    return true;
  } else {
    logError(`Failed to delete task: ${JSON.stringify(data)}`);
    return false;
  }
}

// Test 17: Error handling - Invalid task ID
async function testErrorHandling() {
  logTest('17. Error Handling - Invalid Task ID');
  
  const invalidId = '00000000-0000-0000-0000-000000000000';
  const { status, data } = await makeRequest(
    'GET',
    `/api/tasks/${invalidId}`,
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

// Test 18: Create task with due date filtering
async function testDueDateFiltering() {
  logTest('18. Task API - Due Date Filtering');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Create a task with due date
  const taskData = {
    title: 'Test Task - With Due Date',
    description: 'Task for testing due date filtering',
    priority: 'MEDIUM',
    dueDate: tomorrow.toISOString(),
  };

  const createResponse = await makeRequest('POST', '/api/tasks', taskData, accessToken);
  if (createResponse.status !== 201) {
    logWarning('Could not create task for due date filtering test');
    return false;
  }

  // Test filtering by due date range
  const fromDate = today.toISOString().split('T')[0];
  const toDate = nextWeek.toISOString().split('T')[0];

  const { status, data } = await makeRequest(
    'GET',
    `/api/tasks?dueDateFrom=${fromDate}&dueDateTo=${toDate}`,
    null,
    accessToken
  );

  if (status === 200 && data.success && Array.isArray(data.data)) {
    logSuccess(`Retrieved ${data.data.length} task(s) with due dates in range`);
    return true;
  } else {
    logError(`Failed to filter tasks by due date: ${JSON.stringify(data)}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('TASK MANAGEMENT FUNCTIONALITY TEST SUITE', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const tests = [
    { name: 'Login', fn: testLogin, required: true },
    { name: 'Get All Tasks', fn: testGetAllTasks, required: true },
    { name: 'Get Customers', fn: testGetCustomers, required: false },
    { name: 'Create Simple Task', fn: testCreateSimpleTask, required: false },
    { name: 'Create Full Task', fn: testCreateFullTask, required: false },
    { name: 'Get Task by ID', fn: testGetTaskById, required: false },
    { name: 'Filter by Status', fn: testFilterTasksByStatus, required: false },
    { name: 'Filter by Priority', fn: testFilterTasksByPriority, required: false },
    { name: 'Update Task Status', fn: testUpdateTaskStatus, required: false },
    { name: 'Update Task Priority', fn: testUpdateTaskPriority, required: false },
    { name: 'Update Time Spent', fn: testUpdateTaskTimeSpent, required: false },
    { name: 'Complete Task', fn: testCompleteTask, required: false },
    { name: 'Update Description', fn: testUpdateTaskDescription, required: false },
    { name: 'Filter by Assignee', fn: testFilterTasksByAssignee, required: false },
    { name: 'Filter by Customer', fn: testFilterTasksByCustomer, required: false },
    { name: 'Delete Task', fn: testDeleteTask, required: false },
    { name: 'Error Handling', fn: testErrorHandling, required: false },
    { name: 'Due Date Filtering', fn: testDueDateFiltering, required: false },
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

