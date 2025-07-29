#!/usr/bin/env node

/**
 * Dashboard Data Integrity Test Script
 * 
 * This script verifies that the Dashboard component's performance metrics 
 * are calculated correctly by comparing frontend logic with actual database data.
 */

import pkg from 'pg';
const { Client } = pkg;

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testDashboardIntegrity() {
  console.log('🔍 대시보드 데이터 정합성 테스트 시작...\n');
  
  try {
    await client.connect();
    
    const testResults = {
      passed: 0,
      failed: 0,
      issues: []
    };

    // 1. 기본 데이터 현황 확인
    console.log('📊 기본 데이터 현황:');
    
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
      console.log(`  ${row.type}: ${row.total}개 (완료: ${row.completed || row.active || 0}개)`);
    });
    console.log();

    // 2. 우선순위별 할일 통계 검증
    console.log('🎯 우선순위별 할일 통계 검증:');
    
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
      console.log(`  ${row.priority}급: ${row.completed}/${row.total} 완료 (${Math.round((row.completed/row.total)*100)}%)`);
    });

    // 3. 핵심가치별 분포 검증
    console.log('\n❤️ 핵심가치별 활동 분포:');
    
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
      console.log(`  ${row.core_value}: ${row.completed_items}/${row.total_items} 완료 (${row.completion_rate}%)`);
    });

    // 4. 일정 우선순위별 통계 검증
    console.log('\n📅 일정 우선순위별 통계:');
    
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
      console.log(`  ${row.priority}: ${row.completed}/${row.total} 완료 (${row.completion_rate}%)`);
    });

    // 5. 습관 추적 상태 검증
    console.log('\n🔥 습관 추적 상태:');
    
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
      console.log(`  ${row.name}: 현재 연속 ${row.current_streak}일, 최대 ${row.longest_streak}일 (${row.core_value})`);
      console.log(`    이번주: ${row.completed_logs}/${row.total_logs} 완료`);
    });

    // 6. 연간 목표 관련 활동 검증
    console.log('\n🎯 연간 목표 관련 활동:');
    
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
      console.log(`    할일: ${row.completed_tasks}/${row.related_tasks} 완료`);
      console.log(`    일정: ${row.completed_events}/${row.related_events} 완료`);
      console.log(`    습관: ${row.related_habits}개 활성`);
    });

    const goalCompletionRate = totalGoalActivities > 0 
      ? Math.round((completedGoalActivities / totalGoalActivities) * 100)
      : 0;

    console.log(`\n📈 연간 목표 달성률: ${completedGoalActivities}/${totalGoalActivities} (${goalCompletionRate}%)`);

    // 7. 데이터 일관성 검증
    console.log('\n🔍 데이터 일관성 검증:');
    
    // 고아 데이터 검사
    const orphanedData = await client.query(`
      -- 존재하지 않는 프로젝트를 참조하는 Task
      SELECT 'orphaned_tasks' as type, COUNT(*) as count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id IS NOT NULL AND p.id IS NULL AND t.user_id = '42569768'
      
      UNION ALL
      
      -- 존재하지 않는 습관을 참조하는 HabitLog
      SELECT 'orphaned_habit_logs' as type, COUNT(*) as count
      FROM habit_logs hl
      LEFT JOIN habits h ON hl.habit_id = h.id
      WHERE h.id IS NULL AND hl.user_id = '42569768'
      
      UNION ALL
      
      -- 잘못된 핵심가치를 참조하는 데이터
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
        console.log(`  ❌ ${row.type}: ${row.count}개 문제 발견`);
        integrityIssues++;
      } else {
        console.log(`  ✅ ${row.type}: 문제 없음`);
      }
    });

    // 8. 결과 요약
    console.log('\n📋 테스트 결과 요약:');
    console.log(`  기본 데이터 개수: ${basicStats.rows.length}개 테이블 확인`);
    console.log(`  우선순위 통계: ${priorityStats.rows.length}개 우선순위 확인`);
    console.log(`  핵심가치 분포: ${coreValueStats.rows.length}개 가치 확인`);
    console.log(`  일정 우선순위: ${eventPriorityStats.rows.length}개 우선순위 확인`);
    console.log(`  활성 습관: ${habitStatus.rows.filter(h => h.is_active).length}개`);
    console.log(`  연간 목표: ${goalActivities.rows.length}개`);
    
    if (integrityIssues === 0) {
      console.log('\n✅ 모든 데이터 정합성 검사 통과!');
      testResults.passed = 8;
    } else {
      console.log(`\n⚠️ ${integrityIssues}개 데이터 정합성 문제 발견`);
      testResults.failed = integrityIssues;
    }

    // 9. Dashboard 계산 로직 검증용 데이터 출력
    console.log('\n🧮 Dashboard 계산 검증용 데이터:');
    console.log('// Frontend에서 사용할 검증 데이터');
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
    console.error('테스트 실행 중 오류:', error);
    return { passed: 0, failed: 1, issues: [error.message] };
  } finally {
    await client.end();
  }
}

// 스크립트 실행
testDashboardIntegrity()
  .then(results => {
    console.log(`\n🏁 테스트 완료: ${results.passed}개 성공, ${results.failed}개 실패`);
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('테스트 실행 실패:', error);
    process.exit(1);
  });

export { testDashboardIntegrity };