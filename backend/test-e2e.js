import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

const parseCookies = (setCookieHeader) => {
  if (!setCookieHeader) return '';
  // Can be comma-separated or an array in some fetch implementations
  if (Array.isArray(setCookieHeader)) {
    return setCookieHeader.map((c) => c.split(';')[0]).join('; ');
  }
  return setCookieHeader.split(';')[0];
};

async function testCompleteFlow() {
  console.log('=== RUNNING COMPREHENSIVE E2E AUTHENTICATION & CHAT TEST ===\n');

  const stamp = Date.now();
  const testUser1 = {
    name: 'Sarah Connor',
    email: `sarah_${stamp}@skynet-defense.org`,
    password: 'Cyberdyne#2026',
    confirmPassword: 'Cyberdyne#2026',
  };

  const testUser2 = {
    name: 'John Connor',
    email: `john_${stamp}@resistance-core.org`,
    password: 'Resistance#2026',
    confirmPassword: 'Resistance#2026',
  };

  // STEP 0: Guest Chat (no auth required, messages NOT saved to DB)
  console.log('Test 0: Verifying Guest Chat without authentication (in-memory, no DB saving)...');
  const guestRes = await fetch(`${BASE_URL}/chat/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello from a guest user! Respond with: Guest verified.',
      history: [],
    }),
  });
  assert.strictEqual(guestRes.status, 200, 'Guest chat endpoint must return 200');
  const guestData = await guestRes.json();
  assert.strictEqual(guestData.success, true);
  assert.strictEqual(guestData.storage, 'in-memory-guest', 'Guest responses must be marked in-memory-guest');
  assert.ok(guestData.data.assistantMessage?.text, 'Guest assistant message must be returned');
  console.log(`  PASS: Guest chat processed successfully (${guestData.data.provider}): "${guestData.data.assistantMessage.text.slice(0, 45)}..."\n`);

  // STEP 1: Test unauthenticated requests are blocked
  console.log('Test 1: Verifying unauthenticated access is blocked with 401...');
  const unauthRes = await fetch(`${BASE_URL}/conversations`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated /conversations must return 401');
  const unauthMe = await fetch(`${BASE_URL}/auth/me`);
  assert.strictEqual(unauthMe.status, 401, 'Unauthenticated /auth/me must return 401');
  console.log('  PASS: Protected endpoints rejected unauthenticated requests (401).\n');

  // STEP 2: Register User 1
  console.log(`Test 2: Registering User 1 (${testUser1.email})...`);
  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser1),
  });
  assert.strictEqual(reg1Res.status, 201, 'Registration must return 201');
  const reg1Data = await reg1Res.json();
  assert.strictEqual(reg1Data.success, true);
  assert.strictEqual(reg1Data.user.name, testUser1.name);
  assert.strictEqual(reg1Data.user.password, undefined, 'Password must never be exposed');

  const cookieHeader1 = reg1Res.headers.get('set-cookie');
  assert.ok(cookieHeader1 && cookieHeader1.includes('token='), 'HttpOnly token cookie must be set');
  const cookie1 = parseCookies(cookieHeader1);
  console.log(`  PASS: User 1 registered successfully. Token set in HttpOnly cookie.\n`);

  // STEP 3: Verify User 1 session persistence via /api/auth/me
  console.log('Test 3: Checking session persistence for User 1 (/api/auth/me)...');
  const me1Res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: cookie1 },
  });
  assert.strictEqual(me1Res.status, 200, '/auth/me must return 200');
  const me1Data = await me1Res.json();
  assert.strictEqual(me1Data.user.email, testUser1.email);
  console.log(`  PASS: Session restored for ${me1Data.user.name} (${me1Data.user.email}).\n`);

  // STEP 4: User 1 creates conversation and sends message
  console.log('Test 4: User 1 creating conversation and sending message...');
  const create1Res = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({ title: 'Sarah Tactical Strategy' }),
  });
  assert.strictEqual(create1Res.status, 201);
  const conv1 = (await create1Res.json()).data;
  assert.ok(conv1._id);
  assert.strictEqual(conv1.userId, me1Data.user.id);
  console.log(`  PASS: Conversation created (ID: ${conv1._id}) owned by User 1 (${conv1.userId}).`);

  console.log('  Sending message in conversation to test AI response & persistence...');
  const msg1Res = await fetch(`${BASE_URL}/conversations/${conv1._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({ text: 'Hello Velox AI, please confirm system readiness.' }),
  });
  assert.strictEqual(msg1Res.status, 201, 'Message must be processed');
  const msg1Data = await msg1Res.json();
  assert.strictEqual(msg1Data.success, true);
  assert.ok(msg1Data.data.assistantMessage?.text, 'Assistant message must be returned');
  console.log(`  PASS: AI response received (${msg1Data.data.provider}): "${msg1Data.data.assistantMessage.text.slice(0, 50)}..."\n`);

  // STEP 4.5: Rename conversation test
  console.log('Test 4.5: User 1 renaming conversation to a custom title...');
  const renameRes = await fetch(`${BASE_URL}/conversations/${conv1._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({ title: '  Cyberdyne Infiltration Master Plan  ' }),
  });
  assert.strictEqual(renameRes.status, 200, 'Rename endpoint must return 200');
  const renameData = await renameRes.json();
  assert.strictEqual(renameData.success, true);
  assert.strictEqual(renameData.data.title, 'Cyberdyne Infiltration Master Plan', 'Title must be trimmed properly');
  assert.strictEqual(renameData.data.isCustomTitle, true, 'isCustomTitle flag must be true');
  console.log(`  PASS: Renamed conversation to "${renameData.data.title}" in MongoDB.`);

  // Verify empty title is rejected
  const emptyRenameRes = await fetch(`${BASE_URL}/conversations/${conv1._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({ title: '   ' }),
  });
  assert.strictEqual(emptyRenameRes.status, 400, 'Empty title must return 400');
  console.log('  PASS: Empty rename rejected with 400 Bad Request.\n');

  // STEP 5: Register User 2
  console.log(`Test 5: Registering User 2 (${testUser2.email})...`);
  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser2),
  });
  assert.strictEqual(reg2Res.status, 201);
  const cookie2 = parseCookies(reg2Res.headers.get('set-cookie'));
  console.log(`  PASS: User 2 registered successfully.\n`);

  // STEP 6: Multi-tenant Isolation: User 2 CANNOT access User 1's conversation
  console.log("Test 6: Multi-tenant Isolation - User 2 attempting to access User 1's messages...");
  const breachAttempt1 = await fetch(`${BASE_URL}/conversations/${conv1._id}/messages`, {
    headers: { Cookie: cookie2 },
  });
  assert.strictEqual(breachAttempt1.status, 403, 'User 2 must receive 403 Forbidden for User 1 conversation');
  console.log('  PASS: Unauthorized read blocked with 403 Forbidden.');

  console.log("  User 2 attempting to send message into User 1's conversation...");
  const breachAttempt2 = await fetch(`${BASE_URL}/conversations/${conv1._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie2,
    },
    body: JSON.stringify({ text: 'Infiltration message' }),
  });
  assert.strictEqual(breachAttempt2.status, 403, 'User 2 must receive 403 Forbidden for message injection');
  console.log('  PASS: Unauthorized message injection blocked with 403 Forbidden.');

  console.log("  User 2 attempting to delete User 1's conversation...");
  const breachAttempt3 = await fetch(`${BASE_URL}/conversations/${conv1._id}`, {
    method: 'DELETE',
    headers: { Cookie: cookie2 },
  });
  assert.strictEqual(breachAttempt3.status, 403, 'User 2 must receive 403 Forbidden for conversation deletion');
  console.log('  PASS: Unauthorized deletion blocked with 403 Forbidden.');

  console.log("  User 2 attempting to rename User 1's conversation...");
  const breachAttempt4 = await fetch(`${BASE_URL}/conversations/${conv1._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie2,
    },
    body: JSON.stringify({ title: 'Hacked Title' }),
  });
  assert.strictEqual(breachAttempt4.status, 403, 'User 2 must receive 403 Forbidden for conversation rename');
  console.log('  PASS: Unauthorized rename blocked with 403 Forbidden.');

  console.log("  Checking User 2's conversation list...");
  const list2Res = await fetch(`${BASE_URL}/conversations`, {
    headers: { Cookie: cookie2 },
  });
  const list2 = (await list2Res.json()).data;
  assert.strictEqual(list2.some((c) => c._id === conv1._id), false, "User 1's conversation must not appear in User 2's list");
  console.log("  PASS: User 2 conversation list is completely isolated.\n");

  // STEP 7: Test User 1 Logout and cookie invalidation
  console.log('Test 7: Testing Logout for User 1...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
  });
  assert.strictEqual(logoutRes.status, 200);
  const clearCookieHeader = logoutRes.headers.get('set-cookie');
  assert.ok(clearCookieHeader, 'Logout must send clear-cookie header');
  console.log('  PASS: Logout succeeded and cookie cleared.\n');

  // STEP 8: Test Login for User 1
  console.log('Test 8: Testing Login for User 1 with correct credentials...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser1.email,
      password: testUser1.password,
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login must succeed with 200');
  const loginCookie = parseCookies(loginRes.headers.get('set-cookie'));

  // Verify User 1 can access their conversation again after re-login
  const recheckRes = await fetch(`${BASE_URL}/conversations/${conv1._id}/messages`, {
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(recheckRes.status, 200, 'Owner must access conversation after login');
  const recheckMessages = (await recheckRes.json()).data;
  assert.strictEqual(recheckMessages.length, 2, 'Should have user and assistant messages');

  // Verify conversation in list retained the renamed title from MongoDB
  const recheckListRes = await fetch(`${BASE_URL}/conversations`, {
    headers: { Cookie: loginCookie },
  });
  const recheckList = (await recheckListRes.json()).data;
  const storedConv = recheckList.find((c) => c._id === conv1._id);
  assert.ok(storedConv, 'Conversation must be in User 1 list');
  assert.strictEqual(storedConv.title, 'Cyberdyne Infiltration Master Plan', 'Renamed title must persist in MongoDB');
  console.log(`  PASS: Re-login succeeded and custom title ("${storedConv.title}") verified from MongoDB.\n`);

  // STEP 9: Clean up User 1's test conversation
  console.log('Test 9: Cleanup - User 1 deletes their own conversation...');
  const delRes = await fetch(`${BASE_URL}/conversations/${conv1._id}`, {
    method: 'DELETE',
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(delRes.status, 200);
  console.log('  PASS: Conversation deleted successfully by owner.\n');

  console.log('===========================================================');
  console.log('✓ ALL AUTHENTICATION, ISOLATION & CHATBOT TESTS PASSED 100%!');
  console.log('===========================================================');
}

testCompleteFlow().catch((err) => {
  console.error('\nE2E TEST FAILURE:', err);
  process.exit(1);
});
