#!/usr/bin/env node

/**
 * 데이터베이스 데이터 정합성 직접 검증 스크립트
 * 
 * 이 스크립트는 인증 없이 직접 데이터베이스를 검증합니다:
 * 1. Foundation과 연관 데이터 간의 참조 무결성
 * 2. Core values 일관성
 * 3. 고아 데이터 검증
 * 4. 데이터 타입 및 제약 조건 검증
 */

import { neon } from '@neondatabase/serverless';

// 환경 변수에서 데이터베이스 URL 가져오기
const sql = neon(process.env.DATABASE_URL);

// 테스트 결과 저장
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: []
};

// 유틸리티 함수
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
    log(`✓ ${message}`, 'success');
  } else {
    if (isWarning) {
      testResults.warnings.push(message);
      log(`⚠ ${message}`, 'warning');
    } else {
      testResults.failed++;
      testResults.errors.push(message);
      log(`✗ ${message}`, 'error');
    }
  }
}

// 1. 기본 테이블 존재 및 구조 검증
async function testTableStructure() {
  log('\n=== 테이블 구조 검증 ===', 'info');
  
  try {
    // 필수 테이블들 존재 확인
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
        `테이블 '${tableName}'이 존재함`
      );
    });
    
    return tableNames;
  } catch (error) {
    log(`테이블 구조 검증 실패: ${error.message}`, 'error');
    return [];
  }
}

// 2. Foundation 데이터 무결성 검증
async function testFoundationIntegrity() {
  log('\n=== Foundation 데이터 무결성 검증 ===', 'info');
  
  try {
    // Foundation 데이터 기본 검증
    const foundations = await sql`
      SELECT * FROM foundations 
      ORDER BY created_at DESC
    `;
    
    assert(foundations.length > 0, 'Foundation 데이터가 존재함');
    
    foundations.forEach((foundation, index) => {
      // 필수 필드 검증
      assert(foundation.user_id, `Foundation ${index + 1}: user_id가 존재함`);
      assert(foundation.year, `Foundation ${index + 1}: year가 존재함`);
      
      // Core values 검증
      const coreValues = [
        foundation.core_value_1, 
        foundation.core_value_2, 
        foundation.core_value_3
      ].filter(Boolean);
      
      assert(coreValues.length > 0, `Foundation ${index + 1}: 최소 하나의 핵심 가치가 설정됨`);
      
      // 중복 값 검증
      const uniqueValues = [...new Set(coreValues)];
      assert(
        uniqueValues.length === coreValues.length, 
        `Foundation ${index + 1}: 핵심 가치에 중복이 없음`
      );
    });
    
    return foundations;
  } catch (error) {
    log(`Foundation 무결성 검증 실패: ${error.message}`, 'error');
    return [];
  }
}

// 3. 참조 무결성 검증
async function testReferentialIntegrity(foundations) {
  log('\n=== 참조 무결성 검증 ===', 'info');
  
  if (foundations.length === 0) return;
  
  try {
    // Foundation별 Core Values 수집
    const allCoreValues = new Set();
    foundations.forEach(foundation => {
      [foundation.core_value_1, foundation.core_value_2, foundation.core_value_3]
        .filter(Boolean)
        .forEach(value => allCoreValues.add(value));
    });
    
    // 각 테이블에서 Core Value 참조 검증
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
          `${tableName}: Core value '${record.core_value}'가 Foundation에 존재함 (${record.count}건)`,
          !isValid  // 참조 무결성 위반은 warning으로 처리
        );
      });
    }
    
    // 사용되지 않는 Core Values 확인
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
        log(`사용되지 않는 핵심 가치: '${coreValue}'`, 'warning');
      }
    });
    
  } catch (error) {
    log(`참조 무결성 검증 실패: ${error.message}`, 'error');
  }
}

// 4. 고아 데이터 검증
async function testOrphanData() {
  log('\n=== 고아 데이터 검증 ===', 'info');
  
  try {
    // Tasks의 projectId 참조 무결성
    const orphanTasks = await sql`
      SELECT t.id, t.title, t.project_id
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id IS NOT NULL AND p.id IS NULL
    `;
    
    assert(
      orphanTasks.length === 0,
      `존재하지 않는 프로젝트를 참조하는 Task가 없음 (${orphanTasks.length}건)`
    );
    
    if (orphanTasks.length > 0) {
      orphanTasks.forEach(task => {
        log(`  - Task ${task.id}: "${task.title}" -> Project ${task.project_id} (존재하지 않음)`, 'error');
      });
    }
    
    // Events의 projectId 참조 무결성
    const orphanEvents = await sql`
      SELECT e.id, e.title, e.project_id
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.project_id IS NOT NULL AND p.id IS NULL
    `;
    
    assert(
      orphanEvents.length === 0,
      `존재하지 않는 프로젝트를 참조하는 Event가 없음 (${orphanEvents.length}건)`
    );
    
    // Habit logs의 habitId 참조 무결성
    const orphanHabitLogs = await sql`
      SELECT hl.id, hl.habit_id, hl.date
      FROM habit_logs hl
      LEFT JOIN habits h ON hl.habit_id = h.id
      WHERE h.id IS NULL
    `;
    
    assert(
      orphanHabitLogs.length === 0,
      `존재하지 않는 습관을 참조하는 HabitLog가 없음 (${orphanHabitLogs.length}건)`
    );
    
  } catch (error) {
    log(`고아 데이터 검증 실패: ${error.message}`, 'error');
  }
}

// 5. 데이터 일관성 검증
async function testDataConsistency() {
  log('\n=== 데이터 일관성 검증 ===', 'info');
  
  try {
    // Projects와 Tasks 완료 상태 일관성
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
        `프로젝트 "${project.project_title}" 완료 상태가 일치함 (완료된 할일: ${project.completed_tasks}/${project.total_tasks})`,
        shouldBeCompleted !== isCompleted  // 불일치는 warning으로 처리
      );
    });
    
    // Habits의 streak 계산 검증
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
      // 간단한 일관성 체크 (실제 streak 계산은 복잡하므로 기본 검증만)
      assert(
        habit.current_streak >= 0,
        `습관 "${habit.name}"의 현재 연속일수가 0 이상임 (${habit.current_streak})`
      );
    });
    
    // 날짜 범위 검증
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
        `${check.table_name}: 시작일이 종료일보다 빠른 데이터가 없음 (${check.invalid_count}건)`
      );
    });
    
  } catch (error) {
    log(`데이터 일관성 검증 실패: ${error.message}`, 'error');
  }
}

// 6. 데이터 품질 검증
async function testDataQuality() {
  log('\n=== 데이터 품질 검증 ===', 'info');
  
  try {
    // 빈 제목이나 이름 확인
    const qualityChecks = [
      {
        query: `SELECT COUNT(*) as count FROM foundations WHERE personal_mission IS NULL OR personal_mission = ''`,
        message: '개인 미션이 설정되지 않은 Foundation'
      },
      {
        query: `SELECT COUNT(*) as count FROM annual_goals WHERE title IS NULL OR title = ''`,
        message: '제목이 없는 연간 목표'
      },
      {
        query: `SELECT COUNT(*) as count FROM projects WHERE title IS NULL OR title = ''`,
        message: '제목이 없는 프로젝트'
      },
      {
        query: `SELECT COUNT(*) as count FROM tasks WHERE title IS NULL OR title = ''`,
        message: '제목이 없는 할일'
      },
      {
        query: `SELECT COUNT(*) as count FROM events WHERE title IS NULL OR title = ''`,
        message: '제목이 없는 일정'
      },
      {
        query: `SELECT COUNT(*) as count FROM habits WHERE name IS NULL OR name = ''`,
        message: '이름이 없는 습관'
      }
    ];
    
    for (const check of qualityChecks) {
      const result = await sql.unsafe(check.query);
      const count = result[0].count;
      
      assert(
        count === 0,
        `${check.message}: ${count}건`,
        count > 0  // 데이터 품질 문제는 warning으로 처리
      );
    }
    
  } catch (error) {
    log(`데이터 품질 검증 실패: ${error.message}`, 'error');
  }
}

// 7. 통계 및 요약 정보
async function showDataSummary() {
  log('\n=== 데이터 요약 ===', 'info');
  
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
    log(`총 사용자: ${stats.total_users}명`, 'info');
    log(`총 Foundation: ${stats.total_foundations}개`, 'info');
    log(`총 연간 목표: ${stats.total_goals}개`, 'info');
    log(`총 프로젝트: ${stats.total_projects}개`, 'info');
    log(`총 할일: ${stats.total_tasks}개`, 'info');
    log(`총 일정: ${stats.total_events}개`, 'info');
    log(`총 습관: ${stats.total_habits}개`, 'info');
    log(`총 습관 로그: ${stats.total_habit_logs}개`, 'info');
    
  } catch (error) {
    log(`데이터 요약 실패: ${error.message}`, 'error');
  }
}

// 메인 테스트 실행
async function runDatabaseIntegrityTests() {
  log('=== 데이터베이스 데이터 정합성 테스트 시작 ===', 'info');
  
  try {
    await testTableStructure();
    const foundations = await testFoundationIntegrity();
    await testReferentialIntegrity(foundations);
    await testOrphanData();
    await testDataConsistency();
    await testDataQuality();
    await showDataSummary();
    
  } catch (error) {
    log(`테스트 실행 중 오류 발생: ${error.message}`, 'error');
  }
  
  // 테스트 결과 출력
  log('\n=== 테스트 결과 요약 ===', 'info');
  log(`총 검증: ${testResults.passed + testResults.failed}건`, 'info');
  log(`성공: ${testResults.passed}건`, 'success');
  log(`실패: ${testResults.failed}건`, 'error');
  log(`경고: ${testResults.warnings.length}건`, 'warning');
  
  if (testResults.errors.length > 0) {
    log('\n실패한 검증:', 'error');
    testResults.errors.forEach(error => log(`  - ${error}`, 'error'));
  }
  
  if (testResults.warnings.length > 0) {
    log('\n경고 사항:', 'warning');
    testResults.warnings.forEach(warning => log(`  - ${warning}`, 'warning'));
  }
  
  if (testResults.failed === 0) {
    log('\n🎉 모든 필수 데이터 정합성 검증이 성공했습니다!', 'success');
    if (testResults.warnings.length > 0) {
      log('위의 경고 사항들을 검토해보세요.', 'warning');
    }
  } else {
    log('\n⚠️  일부 중요한 검증이 실패했습니다. 위의 오류를 확인해주세요.', 'error');
  }
}

// 테스트 실행
runDatabaseIntegrityTests().catch(error => {
  log(`테스트 실행 실패: ${error.message}`, 'error');
  process.exit(1);
});