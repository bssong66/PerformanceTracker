#!/usr/bin/env node

/**
 * ?곗씠?곕쿋?댁뒪 ?곗씠???뺥빀??吏곸젒 寃利??ㅽ겕由쏀듃
 * 
 * ???ㅽ겕由쏀듃???몄쬆 ?놁씠 吏곸젒 ?곗씠?곕쿋?댁뒪瑜?寃利앺빀?덈떎:
 * 1. Foundation怨??곌? ?곗씠??媛꾩쓽 李몄“ 臾닿껐??
 * 2. Core values ?쇨???
 * 3. 怨좎븘 ?곗씠??寃利?
 * 4. ?곗씠?????諛??쒖빟 議곌굔 寃利?
 */

import { createSqlClient, closeSqlClient } from './_db.js';

// ?섍꼍 蹂?섏뿉???곗씠?곕쿋?댁뒪 URL 媛?몄삤湲?
const sql = createSqlClient();

// ?뚯뒪??寃곌낵 ???
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: []
};

// ?좏떥由ы떚 ?⑥닔
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',  // cyan
    success: '\x1b[32m',  // green
    error: '\x1b[31m',  // red
    warning: '\x1b[33m',  // yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function assert(condition, message, isWarning = false) {
  if (condition) {
    testResults.passed++;
    log(`테스트 실행 실패: ${error.message}`, 'error');
  } else {
    if (isWarning) {
      testResults.warnings.push(message);
      log(`테스트 실행 실패: ${error.message}`, 'error');
    } else {
      testResults.failed++;
      testResults.errors.push(message);
      log(`테스트 실행 실패: ${error.message}`, 'error');
    }
  }
}

// 1. 湲곕낯 ?뚯씠釉?議댁옱 諛?援ъ“ 寃利?
async function testTableStructure() {
  log('\n=== ?뚯씠釉?援ъ“ 寃利?===', 'info');
  
  try {
    // ?꾩닔 ?뚯씠釉붾뱾 議댁옱 ?뺤씤
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    
    const tableNames = tables.map(t => t.table_name);
    const requiredTables = [
      'users', 'foundations', 'annual_goals', 'projects', 
      'tasks', 'events', 'habits', 'habit_logs'
    ];
    
    requiredTables.forEach(tableName => {
      assert(
        tableNames.includes(tableName), 
        `?뚯씠釉?'${tableName}'??議댁옱??
      );
    });
    
    return tableNames;
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    return [];
  }
}

// 2. Foundation ?곗씠??臾닿껐??寃利?
async function testFoundationIntegrity() {
  log('\n=== Foundation ?곗씠??臾닿껐??寃利?===', 'info');
  
  try {
    // Foundation ?곗씠??湲곕낯 寃利?
    const foundations = await sql`
      SELECT * FROM foundations 
      ORDER BY created_at DESC
    `;
    
    assert(foundations.length > 0, 'Foundation ?곗씠?곌? 議댁옱??);
    
    foundations.forEach((foundation, index) => {
      // ?꾩닔 ?꾨뱶 寃利?
      assert(foundation.user_id, `Foundation ${index + 1}: user_id媛 議댁옱??);
      assert(foundation.year, `Foundation ${index + 1}: year媛 議댁옱??);
      
      // Core values 寃利?
      const coreValues = [
        foundation.core_value_1, 
        foundation.core_value_2, 
        foundation.core_value_3
      ].filter(Boolean);
      
      assert(coreValues.length > 0, `Foundation ${index + 1}: 理쒖냼 ?섎굹???듭떖 媛移섍? ?ㅼ젙??);
      
      // 以묐났 媛?寃利?
      const uniqueValues = [...new Set(coreValues)];
      assert(
        uniqueValues.length === coreValues.length, 
        `Foundation ${index + 1}: ?듭떖 媛移섏뿉 以묐났???놁쓬`
      );
    });
    
    return foundations;
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    return [];
  }
}

// 3. 李몄“ 臾닿껐??寃利?
async function testReferentialIntegrity(foundations) {
  log('\n=== 李몄“ 臾닿껐??寃利?===', 'info');
  
  if (foundations.length === 0) return;
  
  try {
    // Foundation蹂?Core Values ?섏쭛
    const allCoreValues = new Set();
    foundations.forEach(foundation => {
      [foundation.core_value_1, foundation.core_value_2, foundation.core_value_3]
        .filter(Boolean)
        .forEach(value => allCoreValues.add(value));
    });
    
    // 媛??뚯씠釉붿뿉??Core Value 李몄“ 寃利?
    const tables = ['annual_goals', 'projects', 'tasks', 'events', 'habits'];
    
    for (const tableName of tables) {
      const records = await sql.unsafe(`
        SELECT core_value, COUNT(*) as count 
        FROM ${tableName} 
        WHERE core_value IS NOT NULL 
        GROUP BY core_value
      `);
      
      records.forEach(record => {
        const isValid = allCoreValues.has(record.core_value);
        assert(
          isValid, 
          `${tableName}: Core value '${record.core_value}'媛 Foundation??議댁옱??(${record.count}嫄?`,
          !isValid  // 李몄“ 臾닿껐???꾨컲? warning?쇰줈 泥섎━
        );
      });
    }
    
    // ?ъ슜?섏? ?딅뒗 Core Values ?뺤씤
    const usedCoreValues = new Set();
    for (const tableName of tables) {
      const usedValues = await sql.unsafe(`
        SELECT DISTINCT core_value 
        FROM ${tableName} 
        WHERE core_value IS NOT NULL
      `);
      usedValues.forEach(record => usedCoreValues.add(record.core_value));
    }
    
    allCoreValues.forEach(coreValue => {
      if (!usedCoreValues.has(coreValue)) {
        log(`테스트 실행 실패: ${error.message}`, 'error');
      }
    });
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// 4. 怨좎븘 ?곗씠??寃利?
async function testOrphanData() {
  log('\n=== 怨좎븘 ?곗씠??寃利?===', 'info');
  
  try {
    // Tasks??projectId 李몄“ 臾닿껐??
    const orphanTasks = await sql`
      SELECT t.id, t.title, t.project_id
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id IS NOT NULL AND p.id IS NULL
    `;
    
    assert(
      orphanTasks.length === 0,
      `議댁옱?섏? ?딅뒗 ?꾨줈?앺듃瑜?李몄“?섎뒗 Task媛 ?놁쓬 (${orphanTasks.length}嫄?`
    );
    
    if (orphanTasks.length > 0) {
      orphanTasks.forEach(task => {
        log(`테스트 실행 실패: ${error.message}`, 'error');
      });
    }
    
    // Events??projectId 李몄“ 臾닿껐??
    const orphanEvents = await sql`
      SELECT e.id, e.title, e.project_id
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.project_id IS NOT NULL AND p.id IS NULL
    `;
    
    assert(
      orphanEvents.length === 0,
      `議댁옱?섏? ?딅뒗 ?꾨줈?앺듃瑜?李몄“?섎뒗 Event媛 ?놁쓬 (${orphanEvents.length}嫄?`
    );
    
    // Habit logs??habitId 李몄“ 臾닿껐??
    const orphanHabitLogs = await sql`
      SELECT hl.id, hl.habit_id, hl.date
      FROM habit_logs hl
      LEFT JOIN habits h ON hl.habit_id = h.id
      WHERE h.id IS NULL
    `;
    
    assert(
      orphanHabitLogs.length === 0,
      `議댁옱?섏? ?딅뒗 ?듦???李몄“?섎뒗 HabitLog媛 ?놁쓬 (${orphanHabitLogs.length}嫄?`
    );
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// 5. ?곗씠???쇨???寃利?
async function testDataConsistency() {
  log('\n=== ?곗씠???쇨???寃利?===', 'info');
  
  try {
    // Projects? Tasks ?꾨즺 ?곹깭 ?쇨???
    const projectCompletionCheck = await sql`
      SELECT 
        p.id as project_id,
        p.title as project_title,
        p.completed as project_completed,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, p.title, p.completed
      HAVING COUNT(t.id) > 0
    `;
    
    projectCompletionCheck.forEach(project => {
      const shouldBeCompleted = project.total_tasks === project.completed_tasks;
      const isCompleted = project.project_completed;
      
      assert(
        shouldBeCompleted === isCompleted,
        `?꾨줈?앺듃 "${project.project_title}" ?꾨즺 ?곹깭媛 ?쇱튂??(?꾨즺???좎씪: ${project.completed_tasks}/${project.total_tasks})`,
        shouldBeCompleted !== isCompleted  // 遺덉씪移섎뒗 warning?쇰줈 泥섎━
      );
    });
    
    // Habits??streak 怨꾩궛 寃利?
    const habitStreakCheck = await sql`
      SELECT 
        h.id,
        h.name,
        h.current_streak,
        COUNT(CASE WHEN hl.completed = true AND hl.date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_completions
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, h.current_streak
    `;
    
    habitStreakCheck.forEach(habit => {
      // 媛꾨떒???쇨???泥댄겕 (?ㅼ젣 streak 怨꾩궛? 蹂듭옟?섎?濡?湲곕낯 寃利앸쭔)
      assert(
        habit.current_streak >= 0,
        `?듦? "${habit.name}"???꾩옱 ?곗냽?쇱닔媛 0 ?댁긽??(${habit.current_streak})`
      );
    });
    
    // ?좎쭨 踰붿쐞 寃利?
    const dateRangeCheck = await sql`
      SELECT 
        'projects' as table_name,
        COUNT(*) as invalid_count
      FROM projects 
      WHERE start_date > end_date
      
      UNION ALL
      
      SELECT 
        'events' as table_name,
        COUNT(*) as invalid_count
      FROM events 
      WHERE start_date > end_date AND end_date IS NOT NULL
    `;
    
    dateRangeCheck.forEach(check => {
      assert(
        check.invalid_count === 0,
        `${check.table_name}: ?쒖옉?쇱씠 醫낅즺?쇰낫??鍮좊Ⅸ ?곗씠?곌? ?놁쓬 (${check.invalid_count}嫄?`
      );
    });
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// 6. ?곗씠???덉쭏 寃利?
async function testDataQuality() {
  log('\n=== ?곗씠???덉쭏 寃利?===', 'info');
  
  try {
    // 鍮??쒕ぉ?대굹 ?대쫫 ?뺤씤
    const qualityChecks = [
      {
        query: `SELECT COUNT(*) as count FROM foundations WHERE personal_mission IS NULL OR personal_mission = ''`,
        message: '媛쒖씤 誘몄뀡???ㅼ젙?섏? ?딆? Foundation'
      },
      {
        query: `SELECT COUNT(*) as count FROM annual_goals WHERE title IS NULL OR title = ''`,
        message: '?쒕ぉ???녿뒗 ?곌컙 紐⑺몴'
      },
      {
        query: `SELECT COUNT(*) as count FROM projects WHERE title IS NULL OR title = ''`,
        message: '?쒕ぉ???녿뒗 ?꾨줈?앺듃'
      },
      {
        query: `SELECT COUNT(*) as count FROM tasks WHERE title IS NULL OR title = ''`,
        message: '?쒕ぉ???녿뒗 ?좎씪'
      },
      {
        query: `SELECT COUNT(*) as count FROM events WHERE title IS NULL OR title = ''`,
        message: '?쒕ぉ???녿뒗 ?쇱젙'
      },
      {
        query: `SELECT COUNT(*) as count FROM habits WHERE name IS NULL OR name = ''`,
        message: '?대쫫???녿뒗 ?듦?'
      }
    ];
    
    for (const check of qualityChecks) {
      const result = await sql.unsafe(check.query);
      const count = result[0].count;
      
      assert(
        count === 0,
        `${check.message}: ${count}嫄?,
        count > 0  // ?곗씠???덉쭏 臾몄젣??warning?쇰줈 泥섎━
      );
    }
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// 7. ?듦퀎 諛??붿빟 ?뺣낫
async function showDataSummary() {
  log('\n=== ?곗씠???붿빟 ===', 'info');
  
  try {
    const summary = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM foundations) as total_foundations,
        (SELECT COUNT(*) FROM annual_goals) as total_goals,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM habits) as total_habits,
        (SELECT COUNT(*) FROM habit_logs) as total_habit_logs
    `;
    
    const stats = summary[0];
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    log(`테스트 실행 실패: ${error.message}`, 'error');
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// 硫붿씤 ?뚯뒪???ㅽ뻾
async function runDatabaseIntegrityTests() {
  log('=== ?곗씠?곕쿋?댁뒪 ?곗씠???뺥빀???뚯뒪???쒖옉 ===', 'info');
  
  try {
    await testTableStructure();
    const foundations = await testFoundationIntegrity();
    await testReferentialIntegrity(foundations);
    await testOrphanData();
    await testDataConsistency();
    await testDataQuality();
    await showDataSummary();
    
  } catch (error) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
  
  // ?뚯뒪??寃곌낵 異쒕젰
  log('\n=== ?뚯뒪??寃곌낵 ?붿빟 ===', 'info');
  log(`珥?寃利? ${testResults.passed + testResults.failed}嫄?, 'info');
  log(`?깃났: ${testResults.passed}嫄?, 'success');
  log(`?ㅽ뙣: ${testResults.failed}嫄?, 'error');
  log(`寃쎄퀬: ${testResults.warnings.length}嫄?, 'warning');
  
  if (testResults.errors.length > 0) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    testResults.errors.forEach(error => log(`  - ${error}`, 'error'));
  }
  
  if (testResults.warnings.length > 0) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    testResults.warnings.forEach(warning => log(`  - ${warning}`, 'warning'));
  }
  
  if (testResults.failed === 0) {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    if (testResults.warnings.length > 0) {
      log(`테스트 실행 실패: ${error.message}`, 'error');
    }
  } else {
    log(`테스트 실행 실패: ${error.message}`, 'error');
  }
}

// ?뚯뒪???ㅽ뻾
runDatabaseIntegrityTests()
  .catch(error => {
    log(`테스트 실행 실패: ${error.message}`, 'error');
    process.exit(1);
  })
  .finally(async () => {
    await closeSqlClient(sql);
  });

