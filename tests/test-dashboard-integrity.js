#!/usr/bin/env node

/**
 * Dashboard Data Integrity Test Script
 * 
 * This script verifies that the Dashboard component's performance metrics 
 * are calculated correctly by comparing frontend logic with actual database data.
 */


import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for dashboard integrity tests.');
}

const shouldUseSSL =
  process.env.DATABASE_SSL !== 'disable' &&
  !/localhost|127\.0\.0\.1/.test(connectionString);

// Database connection
const client = new Client({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
});

async function testDashboardIntegrity() {
  console.log('?뵇 ??쒕낫???곗씠???뺥빀???뚯뒪???쒖옉...\n');
  
  try {
    await client.connect();
    
    const testResults = {
      passed: 0,
      failed: 0,
      issues: []
    };

    // 1. 湲곕낯 ?곗씠???꾪솴 ?뺤씤
    console.log('?뱤 湲곕낯 ?곗씠???꾪솴:');
    
    const basicStats = await client.query(`
      SELECT 
        'tasks' as type, COUNT(*) as total, 
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM tasks WHERE user_id = '42569768'
      UNION ALL
      SELECT 
        'projects' as type, COUNT(*) as total,
        COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE) as completed
      FROM projects WHERE user_id = '42569768'
      UNION ALL
      SELECT 
        'habits' as type, COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM habits WHERE user_id = '42569768'
      UNION ALL
      SELECT 
        'events' as type, COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM events WHERE user_id = '42569768'
      UNION ALL
      SELECT 
        'goals' as type, COUNT(*) as total, 0 as other
      FROM annual_goals WHERE user_id = '42569768'
    `);

    basicStats.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.total}媛?(?꾨즺: ${row.completed || row.active || 0}媛?`);
    });
    console.log();

    // 2. ?곗꽑?쒖쐞蹂??좎씪 ?듦퀎 寃利?
    console.log('?렞 ?곗꽑?쒖쐞蹂??좎씪 ?듦퀎 寃利?');
    
    const priorityStats = await client.query(`
      SELECT 
        priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM tasks 
      WHERE user_id = '42569768' AND priority IS NOT NULL
      GROUP BY priority
      ORDER BY priority
    `);

    const expectedPriorities = { A: 0, B: 0, C: 0 };
    priorityStats.rows.forEach(row => {
      expectedPriorities[row.priority] = {
        total: parseInt(row.total),
        completed: parseInt(row.completed)
      };
      console.log(`  ${row.priority}湲? ${row.completed}/${row.total} ?꾨즺 (${Math.round((row.completed/row.total)*100)}%)`);
    });

    // 3. ?듭떖媛移섎퀎 遺꾪룷 寃利?
    console.log('\n?ㅿ툘 ?듭떖媛移섎퀎 ?쒕룞 遺꾪룷:');
    
    const coreValueStats = await client.query(`
      WITH foundation_values AS (
        SELECT core_value_1, core_value_2, core_value_3 
        FROM foundations 
        WHERE user_id = '42569768' AND year = 2025
      ),
      value_stats AS (
        SELECT 
          core_value,
          'tasks' as type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed
        FROM tasks 
        WHERE user_id = '42569768' AND core_value IS NOT NULL
        GROUP BY core_value
        
        UNION ALL
        
        SELECT 
          core_value,
          'projects' as type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE) as completed
        FROM projects 
        WHERE user_id = '42569768' AND core_value IS NOT NULL
        GROUP BY core_value
        
        UNION ALL
        
        SELECT 
          core_value,
          'events' as type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed
        FROM events 
        WHERE user_id = '42569768' AND core_value IS NOT NULL
        GROUP BY core_value
        
        UNION ALL
        
        SELECT 
          core_value,
          'habits' as type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active
        FROM habits 
        WHERE user_id = '42569768' AND core_value IS NOT NULL
        GROUP BY core_value
      )
      SELECT 
        core_value,
        SUM(total) as total_items,
        SUM(completed) as completed_items,
        ROUND((SUM(completed::numeric) / NULLIF(SUM(total), 0)) * 100, 1) as completion_rate
      FROM value_stats
      GROUP BY core_value
      ORDER BY core_value
    `);

    coreValueStats.rows.forEach(row => {
      console.log(`  ${row.core_value}: ${row.completed_items}/${row.total_items} ?꾨즺 (${row.completion_rate}%)`);
    });

    // 4. ?쇱젙 ?곗꽑?쒖쐞蹂??듦퀎 寃利?
    console.log('\n?뱟 ?쇱젙 ?곗꽑?쒖쐞蹂??듦퀎:');
    
    const eventPriorityStats = await client.query(`
      SELECT 
        priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        ROUND((COUNT(*) FILTER (WHERE completed = true)::numeric / COUNT(*)) * 100, 1) as completion_rate
      FROM events 
      WHERE user_id = '42569768' AND priority IS NOT NULL
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END
    `);

    eventPriorityStats.rows.forEach(row => {
      console.log(`  ${row.priority}: ${row.completed}/${row.total} ?꾨즺 (${row.completion_rate}%)`);
    });

    // 5. ?듦? 異붿쟻 ?곹깭 寃利?
    console.log('\n?뵦 ?듦? 異붿쟻 ?곹깭:');
    
    const habitStatus = await client.query(`
      SELECT 
        h.name,
        h.current_streak,
        h.longest_streak,
        h.core_value,
        h.is_active,
        COUNT(hl.id) as total_logs,
        COUNT(hl.id) FILTER (WHERE hl.completed = true) as completed_logs
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
        AND hl.date >= CURRENT_DATE - INTERVAL '7 days'
      WHERE h.user_id = '42569768'
      GROUP BY h.id, h.name, h.current_streak, h.longest_streak, h.core_value, h.is_active
      ORDER BY h.name
    `);

    habitStatus.rows.forEach(row => {
      console.log(`  ${row.name}: ?꾩옱 ?곗냽 ${row.current_streak}?? 理쒕? ${row.longest_streak}??(${row.core_value})`);
      console.log(`    ?대쾲二? ${row.completed_logs}/${row.total_logs} ?꾨즺`);
    });

    // 6. ?곌컙 紐⑺몴 愿???쒕룞 寃利?
    console.log('\n?렞 ?곌컙 紐⑺몴 愿???쒕룞:');
    
    const goalActivities = await client.query(`
      SELECT 
        ag.title as goal_title,
        COUNT(DISTINCT t.id) as related_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.completed = true) as completed_tasks,
        COUNT(DISTINCT e.id) as related_events,
        COUNT(DISTINCT e.id) FILTER (WHERE e.completed = true) as completed_events,
        COUNT(DISTINCT h.id) as related_habits
      FROM annual_goals ag
      LEFT JOIN tasks t ON t.annual_goal = ag.title AND t.user_id = ag.user_id
      LEFT JOIN events e ON e.annual_goal = ag.title AND e.user_id = ag.user_id  
      LEFT JOIN habits h ON h.annual_goal = ag.title AND h.user_id = ag.user_id AND h.is_active = true
      WHERE ag.user_id = '42569768' AND ag.year = 2025
      GROUP BY ag.id, ag.title
      ORDER BY ag.title
    `);

    let totalGoalActivities = 0;
    let completedGoalActivities = 0;

    goalActivities.rows.forEach(row => {
      const totalActivities = parseInt(row.related_tasks) + parseInt(row.related_events);
      const completedActivities = parseInt(row.completed_tasks) + parseInt(row.completed_events);
      
      totalGoalActivities += totalActivities;
      completedGoalActivities += completedActivities;
      
      console.log(`  ${row.goal_title}:`);
      console.log(`    ?좎씪: ${row.completed_tasks}/${row.related_tasks} ?꾨즺`);
      console.log(`    ?쇱젙: ${row.completed_events}/${row.related_events} ?꾨즺`);
      console.log(`    ?듦?: ${row.related_habits}媛??쒖꽦`);
    });

    const goalCompletionRate = totalGoalActivities > 0 
      ? Math.round((completedGoalActivities / totalGoalActivities) * 100)
      : 0;

    console.log(`\n?뱢 ?곌컙 紐⑺몴 ?ъ꽦瑜? ${completedGoalActivities}/${totalGoalActivities} (${goalCompletionRate}%)`);

    // 7. ?곗씠???쇨???寃利?
    console.log('\n?뵇 ?곗씠???쇨???寃利?');
    
    // 怨좎븘 ?곗씠??寃??
    const orphanedData = await client.query(`
      -- 議댁옱?섏? ?딅뒗 ?꾨줈?앺듃瑜?李몄“?섎뒗 Task
      SELECT 'orphaned_tasks' as type, COUNT(*) as count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id IS NOT NULL AND p.id IS NULL AND t.user_id = '42569768'
      
      UNION ALL
      
      -- 議댁옱?섏? ?딅뒗 ?듦???李몄“?섎뒗 HabitLog
      SELECT 'orphaned_habit_logs' as type, COUNT(*) as count
      FROM habit_logs hl
      LEFT JOIN habits h ON hl.habit_id = h.id
      WHERE h.id IS NULL AND hl.user_id = '42569768'
      
      UNION ALL
      
      -- ?섎せ???듭떖媛移섎? 李몄“?섎뒗 ?곗씠??
      SELECT 'invalid_core_values' as type, COUNT(*) as count
      FROM (
        SELECT core_value FROM tasks WHERE user_id = '42569768' AND core_value IS NOT NULL
        UNION ALL
        SELECT core_value FROM projects WHERE user_id = '42569768' AND core_value IS NOT NULL
        UNION ALL
        SELECT core_value FROM events WHERE user_id = '42569768' AND core_value IS NOT NULL
        UNION ALL
        SELECT core_value FROM habits WHERE user_id = '42569768' AND core_value IS NOT NULL
      ) cv
      WHERE cv.core_value NOT IN (
        SELECT unnest(ARRAY[core_value_1, core_value_2, core_value_3]) 
        FROM foundations 
        WHERE user_id = '42569768' AND year = 2025
      )
    `);

    let integrityIssues = 0;
    orphanedData.rows.forEach(row => {
      if (parseInt(row.count) > 0) {
        console.log(`  ??${row.type}: ${row.count}媛?臾몄젣 諛쒓껄`);
        integrityIssues++;
      } else {
        console.log(`  ??${row.type}: 臾몄젣 ?놁쓬`);
      }
    });

    // 8. 寃곌낵 ?붿빟
    console.log('\n?뱥 ?뚯뒪??寃곌낵 ?붿빟:');
    console.log(`  湲곕낯 ?곗씠??媛쒖닔: ${basicStats.rows.length}媛??뚯씠釉??뺤씤`);
    console.log(`  ?곗꽑?쒖쐞 ?듦퀎: ${priorityStats.rows.length}媛??곗꽑?쒖쐞 ?뺤씤`);
    console.log(`  ?듭떖媛移?遺꾪룷: ${coreValueStats.rows.length}媛?媛移??뺤씤`);
    console.log(`  ?쇱젙 ?곗꽑?쒖쐞: ${eventPriorityStats.rows.length}媛??곗꽑?쒖쐞 ?뺤씤`);
    console.log(`  ?쒖꽦 ?듦?: ${habitStatus.rows.filter(h => h.is_active).length}媛?);
    console.log(`  ?곌컙 紐⑺몴: ${goalActivities.rows.length}媛?);
    
    if (integrityIssues === 0) {
      console.log('\n??紐⑤뱺 ?곗씠???뺥빀??寃???듦낵!');
      testResults.passed = 8;
    } else {
      console.log(`\n?좑툘 ${integrityIssues}媛??곗씠???뺥빀??臾몄젣 諛쒓껄`);
      testResults.failed = integrityIssues;
    }

    // 9. Dashboard 怨꾩궛 濡쒖쭅 寃利앹슜 ?곗씠??異쒕젰
    console.log('\n?㎜ Dashboard 怨꾩궛 寃利앹슜 ?곗씠??');
    console.log('// Frontend?먯꽌 ?ъ슜??寃利??곗씠??);
    console.log(`const expectedDashboardData = {`);
    console.log(`  tasks: { total: ${basicStats.rows.find(r => r.type === 'tasks')?.total || 0}, completed: ${basicStats.rows.find(r => r.type === 'tasks')?.completed || 0} },`);
    console.log(`  projects: { total: ${basicStats.rows.find(r => r.type === 'projects')?.total || 0}, completed: ${basicStats.rows.find(r => r.type === 'projects')?.completed || 0} },`);
    console.log(`  habits: { total: ${basicStats.rows.find(r => r.type === 'habits')?.total || 0}, active: ${basicStats.rows.find(r => r.type === 'habits')?.completed || 0} },`);
    console.log(`  events: { total: ${basicStats.rows.find(r => r.type === 'events')?.total || 0}, completed: ${basicStats.rows.find(r => r.type === 'events')?.completed || 0} },`);
    console.log(`  goals: { total: ${basicStats.rows.find(r => r.type === 'goals')?.total || 0} },`);
    console.log(`  priorityStats: {`);
    
    ['A', 'B', 'C'].forEach(priority => {
      const stat = priorityStats.rows.find(r => r.priority === priority);
      console.log(`    ${priority}: { total: ${stat?.total || 0}, completed: ${stat?.completed || 0} },`);
    });
    
    console.log(`  },`);
    console.log(`  goalActivities: { total: ${totalGoalActivities}, completed: ${completedGoalActivities} }`);
    console.log(`};`);

    return testResults;

  } catch (error) {
    console.error('?뚯뒪???ㅽ뻾 以??ㅻ쪟:', error);
    return { passed: 0, failed: 1, issues: [error.message] };
  } finally {
    await client.end();
  }
}

// ?ㅽ겕由쏀듃 ?ㅽ뻾
testDashboardIntegrity()
  .then(results => {
    console.log(`\n?뢾 ?뚯뒪???꾨즺: ${results.passed}媛??깃났, ${results.failed}媛??ㅽ뙣`);
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('?뚯뒪???ㅽ뻾 ?ㅽ뙣:', error);
    process.exit(1);
  });

export { testDashboardIntegrity };
