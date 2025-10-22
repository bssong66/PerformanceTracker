#!/usr/bin/env node

/**
 * 데이터 정합성 테스트 스크립트
 * 
 * 이 스크립트는 다음 항목들을 테스트합니다:
 * 1. Foundation 데이터와 관련 엔티티 간의 연결성
 * 2. Core values의 일관성 검증
 * 3. Annual goals와 Foundation의 연결성
 * 4. Projects, Tasks, Events, Habits의 Core values 연결성
 * 5. 데이터 무결성 및 참조 일관성
 * 6. API 응답 검증
 */

const baseURL = 'http://localhost:5000';
const MOCK_USER_ID = 1;
const TEST_YEAR = 2025;

// 테스트 결과 저장
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
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

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`✓ ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`✗ ${message}`, 'error');
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${baseURL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    log(`API 요청 실패: ${endpoint} - ${error.message}`, 'error');
    throw error;
  }
}

// 1. Foundation 데이터 검증
async function testFoundationIntegrity() {
  log('\n=== Foundation 데이터 정합성 테스트 ===', 'info');
  
  try {
    // Foundation 데이터 가져오기
    const foundation = await apiRequest(`/api/foundation/${MOCK_USER_ID}?year=${TEST_YEAR}`);
    
    assert(foundation, 'Foundation 데이터가 존재함');
    assert(foundation.userId == MOCK_USER_ID, 'Foundation이 올바른 사용자에게 속함');
    assert(foundation.year === TEST_YEAR, 'Foundation이 올바른 연도에 속함');
    
    // Core values 검증
    const coreValues = [foundation.coreValue1, foundation.coreValue2, foundation.coreValue3].filter(Boolean);
    assert(coreValues.length > 0, '최소 하나의 핵심 가치가 설정됨');
    
    // 중복 값 체크
    const uniqueCoreValues = [...new Set(coreValues)];
    assert(uniqueCoreValues.length === coreValues.length, '핵심 가치에 중복이 없음');
    
    return { foundation, coreValues };
  } catch (error) {
    log(`Foundation 테스트 실패: ${error.message}`, 'error');
    return null;
  }
}

// 2. Annual Goals 데이터 검증
async function testAnnualGoalsIntegrity(coreValues) {
  log('\n=== Annual Goals 데이터 정합성 테스트 ===', 'info');
  
  try {
    const goals = await apiRequest(`/api/goals/${MOCK_USER_ID}?year=${TEST_YEAR}`);
    
    assert(Array.isArray(goals), 'Goals가 배열 형태로 반환됨');
    
    if (goals.length > 0) {
      goals.forEach((goal, index) => {
        assert(goal.userId == MOCK_USER_ID, `Goal ${index + 1}: 올바른 사용자에게 속함`);
        assert(goal.year === TEST_YEAR, `Goal ${index + 1}: 올바른 연도에 속함`);
        assert(goal.title && goal.title.trim(), `Goal ${index + 1}: 제목이 존재함`);
        
        // Core value 연결성 검증
        if (goal.coreValue) {
          assert(
            coreValues.includes(goal.coreValue), 
            `Goal ${index + 1}: 핵심 가치가 Foundation과 일치함 (${goal.coreValue})`
          );
        }
      });
    }
    
    return goals;
  } catch (error) {
    log(`Annual Goals 테스트 실패: ${error.message}`, 'error');
    return [];
  }
}

// 3. Projects 데이터 검증
async function testProjectsIntegrity(coreValues, annualGoals) {
  log('\n=== Projects 데이터 정합성 테스트 ===', 'info');
  
  try {
    const projects = await apiRequest(`/api/projects/${MOCK_USER_ID}`);
    
    assert(Array.isArray(projects), 'Projects가 배열 형태로 반환됨');
    
    if (projects.length > 0) {
      const goalTitles = annualGoals.map(g => g.title);
      
      projects.forEach((project, index) => {
        assert(project.userId == MOCK_USER_ID, `Project ${index + 1}: 올바른 사용자에게 속함`);
        assert(project.title && project.title.trim(), `Project ${index + 1}: 제목이 존재함`);
        
        // Core value 연결성 검증
        if (project.coreValue) {
          assert(
            coreValues.includes(project.coreValue), 
            `Project ${index + 1}: 핵심 가치가 Foundation과 일치함 (${project.coreValue})`
          );
        }
        
        // Annual goal 연결성 검증
        if (project.annualGoal) {
          assert(
            goalTitles.includes(project.annualGoal), 
            `Project ${index + 1}: 연간 목표가 존재함 (${project.annualGoal})`
          );
        }
        
        // 날짜 유효성 검증
        if (project.startDate && project.endDate) {
          assert(
            new Date(project.startDate) <= new Date(project.endDate), 
            `Project ${index + 1}: 시작일이 종료일보다 빠름`
          );
        }
      });
    }
    
    return projects;
  } catch (error) {
    log(`Projects 테스트 실패: ${error.message}`, 'error');
    return [];
  }
}

// 4. Tasks 데이터 검증
async function testTasksIntegrity(coreValues, annualGoals, projects) {
  log('\n=== Tasks 데이터 정합성 테스트 ===', 'info');
  
  try {
    const tasks = await apiRequest(`/api/tasks/${MOCK_USER_ID}`);
    
    assert(Array.isArray(tasks), 'Tasks가 배열 형태로 반환됨');
    
    if (tasks.length > 0) {
      const goalTitles = annualGoals.map(g => g.title);
      const projectIds = projects.map(p => p.id);
      
      tasks.forEach((task, index) => {
        assert(task.userId == MOCK_USER_ID, `Task ${index + 1}: 올바른 사용자에게 속함`);
        assert(task.title && task.title.trim(), `Task ${index + 1}: 제목이 존재함`);
        assert(['A', 'B', 'C'].includes(task.priority), `Task ${index + 1}: 우선순위가 유효함`);
        
        // Project 연결성 검증
        if (task.projectId) {
          assert(
            projectIds.includes(task.projectId), 
            `Task ${index + 1}: 프로젝트가 존재함 (${task.projectId})`
          );
        }
        
        // Core value 연결성 검증
        if (task.coreValue) {
          assert(
            coreValues.includes(task.coreValue), 
            `Task ${index + 1}: 핵심 가치가 Foundation과 일치함 (${task.coreValue})`
          );
        }
        
        // Annual goal 연결성 검증
        if (task.annualGoal) {
          assert(
            goalTitles.includes(task.annualGoal), 
            `Task ${index + 1}: 연간 목표가 존재함 (${task.annualGoal})`
          );
        }
      });
    }
    
    return tasks;
  } catch (error) {
    log(`Tasks 테스트 실패: ${error.message}`, 'error');
    return [];
  }
}

// 5. Events 데이터 검증
async function testEventsIntegrity(coreValues, annualGoals) {
  log('\n=== Events 데이터 정합성 테스트 ===', 'info');
  
  try {
    const events = await apiRequest(`/api/events/${MOCK_USER_ID}`);
    
    assert(Array.isArray(events), 'Events가 배열 형태로 반환됨');
    
    if (events.length > 0) {
      const goalTitles = annualGoals.map(g => g.title);
      
      events.forEach((event, index) => {
        assert(event.userId == MOCK_USER_ID, `Event ${index + 1}: 올바른 사용자에게 속함`);
        assert(event.title && event.title.trim(), `Event ${index + 1}: 제목이 존재함`);
        assert(event.startDate, `Event ${index + 1}: 시작일이 존재함`);
        
        // Core value 연결성 검증
        if (event.coreValue) {
          assert(
            coreValues.includes(event.coreValue), 
            `Event ${index + 1}: 핵심 가치가 Foundation과 일치함 (${event.coreValue})`
          );
        }
        
        // Annual goal 연결성 검증
        if (event.annualGoal) {
          assert(
            goalTitles.includes(event.annualGoal), 
            `Event ${index + 1}: 연간 목표가 존재함 (${event.annualGoal})`
          );
        }
        
        // 날짜 유효성 검증
        if (event.endDate) {
          assert(
            new Date(event.startDate) <= new Date(event.endDate), 
            `Event ${index + 1}: 시작일이 종료일보다 빠름`
          );
        }
      });
    }
    
    return events;
  } catch (error) {
    log(`Events 테스트 실패: ${error.message}`, 'error');
    return [];
  }
}

// 6. Habits 데이터 검증
async function testHabitsIntegrity(coreValues, annualGoals) {
  log('\n=== Habits 데이터 정합성 테스트 ===', 'info');
  
  try {
    const habits = await apiRequest(`/api/habits/${MOCK_USER_ID}`);
    
    assert(Array.isArray(habits), 'Habits가 배열 형태로 반환됨');
    
    if (habits.length > 0) {
      const goalTitles = annualGoals.map(g => g.title);
      
      habits.forEach((habit, index) => {
        assert(habit.userId == MOCK_USER_ID, `Habit ${index + 1}: 올바른 사용자에게 속함`);
        assert(habit.name && habit.name.trim(), `Habit ${index + 1}: 이름이 존재함`);
        assert(typeof habit.isActive === 'boolean', `Habit ${index + 1}: 활성 상태가 불린값임`);
        
        // Core value 연결성 검증
        if (habit.coreValue) {
          assert(
            coreValues.includes(habit.coreValue), 
            `Habit ${index + 1}: 핵심 가치가 Foundation과 일치함 (${habit.coreValue})`
          );
        }
        
        // Annual goal 연결성 검증
        if (habit.annualGoal) {
          assert(
            goalTitles.includes(habit.annualGoal), 
            `Habit ${index + 1}: 연간 목표가 존재함 (${habit.annualGoal})`
          );
        }
      });
    }
    
    return habits;
  } catch (error) {
    log(`Habits 테스트 실패: ${error.message}`, 'error');
    return [];
  }
}

// 7. API 응답시간 및 성능 테스트
async function testAPIPerformance() {
  log('\n=== API 성능 테스트 ===', 'info');
  
  const endpoints = [
    `/api/foundation/${MOCK_USER_ID}`,
    `/api/goals/${MOCK_USER_ID}`,
    `/api/projects/${MOCK_USER_ID}`,
    `/api/tasks/${MOCK_USER_ID}`,
    `/api/events/${MOCK_USER_ID}`,
    `/api/habits/${MOCK_USER_ID}`
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      await apiRequest(endpoint);
      const duration = Date.now() - start;
      assert(duration < 2000, `${endpoint}: 응답시간이 2초 미만 (${duration}ms)`);
    } catch (error) {
      log(`API 성능 테스트 실패: ${endpoint}`, 'error');
    }
  }
}

// 8. 데이터 일관성 종합 검증
async function testDataConsistency(foundationData, goals, projects, tasks, events, habits) {
  log('\n=== 데이터 일관성 종합 검증 ===', 'info');
  
  if (!foundationData) return;
  
  const { coreValues } = foundationData;
  
  // 각 핵심 가치별로 연결된 항목 수 계산
  coreValues.forEach(coreValue => {
    const relatedGoals = goals.filter(g => g.coreValue === coreValue).length;
    const relatedProjects = projects.filter(p => p.coreValue === coreValue).length;
    const relatedTasks = tasks.filter(t => t.coreValue === coreValue).length;
    const relatedEvents = events.filter(e => e.coreValue === coreValue).length;
    const relatedHabits = habits.filter(h => h.coreValue === coreValue).length;
    
    const totalRelated = relatedGoals + relatedProjects + relatedTasks + relatedEvents + relatedHabits;
    
    log(`핵심 가치 "${coreValue}": 연결된 항목 ${totalRelated}개 (목표: ${relatedGoals}, 프로젝트: ${relatedProjects}, 할일: ${relatedTasks}, 일정: ${relatedEvents}, 습관: ${relatedHabits})`, 'info');
  });
  
  // 연결되지 않은 항목들 검증
  const unlinkedGoals = goals.filter(g => !g.coreValue).length;
  const unlinkedProjects = projects.filter(p => !p.coreValue).length;
  const unlinkedTasks = tasks.filter(t => !t.coreValue).length;
  const unlinkedEvents = events.filter(e => !e.coreValue).length;
  const unlinkedHabits = habits.filter(h => !h.coreValue).length;
  
  if (unlinkedGoals + unlinkedProjects + unlinkedTasks + unlinkedEvents + unlinkedHabits > 0) {
    log(`연결되지 않은 항목들: 목표 ${unlinkedGoals}개, 프로젝트 ${unlinkedProjects}개, 할일 ${unlinkedTasks}개, 일정 ${unlinkedEvents}개, 습관 ${unlinkedHabits}개`, 'warning');
  }
}

// 메인 테스트 실행
async function runDataIntegrityTests() {
  log('=== 데이터 정합성 테스트 시작 ===', 'info');
  
  try {
    // 순차적으로 테스트 실행
    const foundationData = await testFoundationIntegrity();
    
    if (!foundationData) {
      log('Foundation 데이터가 없어 테스트를 중단합니다.', 'error');
      return;
    }
    
    const { coreValues } = foundationData;
    const goals = await testAnnualGoalsIntegrity(coreValues);
    const projects = await testProjectsIntegrity(coreValues, goals);
    const tasks = await testTasksIntegrity(coreValues, goals, projects);
    const events = await testEventsIntegrity(coreValues, goals);
    const habits = await testHabitsIntegrity(coreValues, goals);
    
    await testAPIPerformance();
    await testDataConsistency(foundationData, goals, projects, tasks, events, habits);
    
  } catch (error) {
    log(`테스트 실행 중 오류 발생: ${error.message}`, 'error');
  }
  
  // 테스트 결과 출력
  log('\n=== 테스트 결과 요약 ===', 'info');
  log(`총 테스트: ${testResults.passed + testResults.failed}개`, 'info');
  log(`성공: ${testResults.passed}개`, 'success');
  log(`실패: ${testResults.failed}개`, 'error');
  
  if (testResults.errors.length > 0) {
    log('\n실패한 테스트:', 'error');
    testResults.errors.forEach(error => log(`  - ${error}`, 'error'));
  }
  
  if (testResults.failed === 0) {
    log('\n🎉 모든 데이터 정합성 테스트가 성공했습니다!', 'success');
  } else {
    log('\n⚠️  일부 테스트가 실패했습니다. 위의 오류를 확인해주세요.', 'warning');
  }
}

// Node.js fetch polyfill (Node.js 18+ 에서는 내장)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// 테스트 실행
runDataIntegrityTests().catch(error => {
  log(`테스트 실행 실패: ${error.message}`, 'error');
  process.exit(1);
});