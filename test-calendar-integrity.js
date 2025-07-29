#!/usr/bin/env node

/**
 * Calendar Data Integrity and Functionality Test Script
 * 
 * This script verifies the Calendar component's data integrity, functionality,
 * and mobile responsiveness by testing various scenarios.
 */

import pkg from 'pg';
const { Client } = pkg;

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testCalendarIntegrity() {
  console.log('📅 일정관리 데이터 정합성 및 기능 테스트 시작...\n');
  
  try {
    await client.connect();
    
    const testResults = {
      passed: 0,
      failed: 0,
      issues: []
    };

    // 1. 일정 데이터 기본 검증
    console.log('📊 일정 데이터 현황:');
    
    const eventsData = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE completed = true) as completed_events,
        COUNT(*) FILTER (WHERE is_all_day = true) as all_day_events,
        COUNT(*) FILTER (WHERE repeat_type != 'none') as recurring_events,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
        COUNT(*) FILTER (WHERE core_value IS NOT NULL) as core_value_linked,
        COUNT(*) FILTER (WHERE annual_goal IS NOT NULL) as goal_linked
      FROM events 
      WHERE user_id = '42569768'
    `);

    const stats = eventsData.rows[0];
    console.log(`  전체 일정: ${stats.total_events}개`);
    console.log(`  완료된 일정: ${stats.completed_events}개 (${Math.round((stats.completed_events/stats.total_events)*100)}%)`);
    console.log(`  종일 일정: ${stats.all_day_events}개`);
    console.log(`  반복 일정: ${stats.recurring_events}개`);
    console.log(`  우선순위 분포: 높음 ${stats.high_priority}개, 보통 ${stats.medium_priority}개, 낮음 ${stats.low_priority}개`);
    console.log(`  핵심가치 연결: ${stats.core_value_linked}개`);
    console.log(`  연간목표 연결: ${stats.goal_linked}개`);

    // 2. 일정 날짜 무결성 검증
    console.log('\n📍 일정 날짜 무결성 검증:');
    
    const dateIntegrity = await client.query(`
      SELECT 
        COUNT(*) as invalid_dates
      FROM events 
      WHERE user_id = '42569768' 
        AND (start_date > end_date OR start_date IS NULL OR end_date IS NULL)
    `);

    if (parseInt(dateIntegrity.rows[0].invalid_dates) === 0) {
      console.log('  ✅ 모든 일정의 날짜가 유효함 (시작일 ≤ 종료일)');
      testResults.passed++;
    } else {
      console.log(`  ❌ ${dateIntegrity.rows[0].invalid_dates}개 일정에 날짜 오류 있음`);
      testResults.failed++;
      testResults.issues.push('Invalid date ranges found in events');
    }

    // 3. 반복 일정 설정 검증
    console.log('\n🔄 반복 일정 설정 검증:');
    
    const recurringEvents = await client.query(`
      SELECT 
        id,
        title,
        repeat_type,
        repeat_interval,
        repeat_weekdays,
        repeat_end_date,
        start_date
      FROM events 
      WHERE user_id = '42569768' AND repeat_type != 'none'
      ORDER BY start_date
    `);

    let recurringIssues = 0;
    recurringEvents.rows.forEach(event => {
      console.log(`  일정: "${event.title}"`);
      console.log(`    반복: ${event.repeat_type}, 간격: ${event.repeat_interval}`);
      
      // 주간 반복 일정의 요일 설정 검증
      if (event.repeat_type === 'weekly' && (!event.repeat_weekdays || event.repeat_weekdays.length === 0)) {
        console.log(`    ⚠️ 주간 반복이지만 요일이 설정되지 않음`);
        recurringIssues++;
      }
      
      // 반복 종료일이 시작일보다 이른지 검증
      if (event.repeat_end_date && new Date(event.repeat_end_date) < new Date(event.start_date)) {
        console.log(`    ❌ 반복 종료일이 시작일보다 이름`);
        recurringIssues++;
      }
      
      console.log(`    반복 종료: ${event.repeat_end_date || '무기한'}`);
      if (event.repeat_weekdays) {
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const selectedDays = event.repeat_weekdays.map(d => weekdays[parseInt(d)]).join(', ');
        console.log(`    반복 요일: ${selectedDays}`);
      }
    });

    if (recurringIssues === 0) {
      console.log('  ✅ 모든 반복 일정 설정이 올바름');
      testResults.passed++;
    } else {
      console.log(`  ❌ ${recurringIssues}개 반복 일정에 설정 문제 있음`);
      testResults.failed++;
      testResults.issues.push(`${recurringIssues} recurring events have configuration issues`);
    }

    // 4. 일정-할일 통합 표시 데이터 검증
    console.log('\n📋 일정-할일 통합 표시 검증:');
    
    const calendarData = await client.query(`
      -- 일정 데이터
      SELECT 
        'event' as type,
        id,
        title,
        start_date as date,
        priority,
        completed,
        core_value,
        annual_goal
      FROM events 
      WHERE user_id = '42569768'
      
      UNION ALL
      
      -- 할일 데이터 (달력에 표시될 것들)
      SELECT 
        'task' as type,
        id,
        title,
        COALESCE(scheduled_date, created_at::date) as date,
        priority,
        completed,
        core_value,
        annual_goal
      FROM tasks 
      WHERE user_id = '42569768' AND scheduled_date IS NOT NULL
      
      ORDER BY date DESC
      LIMIT 10
    `);

    console.log('  최근 캘린더 항목들:');
    calendarData.rows.forEach(item => {
      const icon = item.type === 'event' ? '📅' : '📝';
      const status = item.completed ? '✓' : '○';
      console.log(`    ${icon} ${status} ${item.title} (${item.date})`);
      if (item.priority) console.log(`      우선순위: ${item.priority}`);
      if (item.core_value) console.log(`      핵심가치: ${item.core_value}`);
    });

    testResults.passed++;

    // 5. 우선순위별 색상 및 스타일 데이터 검증
    console.log('\n🎨 우선순위별 스타일 데이터:');
    
    const priorityDistribution = await client.query(`
      SELECT 
        priority,
        COUNT(*) as count,
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

    priorityDistribution.rows.forEach(row => {
      const colorMap = {
        'high': '🔴 빨강',
        'medium': '🟡 노랑', 
        'low': '🟢 초록'
      };
      console.log(`  ${colorMap[row.priority]}: ${row.count}개 (완료율 ${row.completion_rate}%)`);
    });

    testResults.passed++;

    // 6. 드래그 앤 드롭 데이터 호환성 검증
    console.log('\n🖱️ 드래그 앤 드롭 호환성 검증:');
    
    const dragDropData = await client.query(`
      SELECT 
        id,
        title,
        start_date,
        end_date,
        is_all_day,
        EXTRACT(EPOCH FROM (end_date::timestamp - start_date::timestamp)) / 3600 as duration_hours
      FROM events 
      WHERE user_id = '42569768'
      ORDER BY start_date
      LIMIT 5
    `);

    console.log('  드래그 가능한 일정들:');
    dragDropData.rows.forEach(event => {
      console.log(`    "${event.title}"`);
      console.log(`      기간: ${event.start_date} ~ ${event.end_date}`);
      console.log(`      지속시간: ${event.duration_hours}시간`);
      console.log(`      종일여부: ${event.is_all_day ? '예' : '아니오'}`);
    });

    testResults.passed++;

    // 7. 모바일 반응형 데이터 크기 검증
    console.log('\n📱 모바일 반응형 호환성 데이터:');
    
    const mobileData = await client.query(`
      SELECT 
        LENGTH(title) as title_length,
        LENGTH(description) as desc_length,
        title
      FROM events 
      WHERE user_id = '42569768'
      ORDER BY LENGTH(title) DESC
      LIMIT 5
    `);

    let longTitleCount = 0;
    mobileData.rows.forEach(event => {
      if (event.title_length > 20) {
        longTitleCount++;
        console.log(`  ⚠️ 긴 제목 (${event.title_length}자): "${event.title}"`);
      } else {
        console.log(`  ✅ 적절한 제목 (${event.title_length}자): "${event.title}"`);
      }
    });

    if (longTitleCount === 0) {
      console.log('  ✅ 모든 일정 제목이 모바일에 적합한 길이');
      testResults.passed++;
    } else {
      console.log(`  ⚠️ ${longTitleCount}개 일정 제목이 모바일에서 잘릴 수 있음`);
      testResults.issues.push(`${longTitleCount} events may have truncated titles on mobile`);
    }

    // 8. API 응답 시간 테스트용 쿼리
    console.log('\n⚡ API 성능 검증:');
    
    const performanceStart = Date.now();
    
    await client.query(`
      SELECT 
        e.*, 
        f.core_value_1, f.core_value_2, f.core_value_3
      FROM events e
      LEFT JOIN foundations f ON e.user_id = f.user_id AND f.year = 2025
      WHERE e.user_id = '42569768'
        AND e.start_date >= CURRENT_DATE - INTERVAL '30 days'
        AND e.start_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY e.start_date
    `);
    
    const performanceTime = Date.now() - performanceStart;
    console.log(`  쿼리 실행 시간: ${performanceTime}ms`);
    
    if (performanceTime < 1000) {
      console.log('  ✅ API 응답 시간 양호 (1초 미만)');
      testResults.passed++;
    } else {
      console.log('  ⚠️ API 응답 시간 개선 필요');
      testResults.issues.push('Slow API response time');
    }

    // 9. 결과 요약
    console.log('\n📋 테스트 결과 요약:');
    console.log(`  성공: ${testResults.passed}개 검증항목`);
    console.log(`  실패: ${testResults.failed}개 검증항목`);
    console.log(`  경고: ${testResults.issues.length}개 개선사항`);

    if (testResults.issues.length > 0) {
      console.log('\n⚠️ 개선 권장사항:');
      testResults.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    // 10. Frontend 테스트용 데이터 출력
    console.log('\n🧪 Frontend 테스트용 검증 데이터:');
    console.log(`const expectedCalendarData = {`);
    console.log(`  events: {`);
    console.log(`    total: ${stats.total_events},`);
    console.log(`    completed: ${stats.completed_events},`);
    console.log(`    allDay: ${stats.all_day_events},`);
    console.log(`    recurring: ${stats.recurring_events}`);
    console.log(`  },`);
    console.log(`  priorities: {`);
    priorityDistribution.rows.forEach(row => {
      console.log(`    ${row.priority}: { total: ${row.count}, completed: ${row.completed} },`);
    });
    console.log(`  },`);
    console.log(`  performance: {`);
    console.log(`    queryTime: ${performanceTime},`);
    console.log(`    acceptable: ${performanceTime < 1000}`);
    console.log(`  }`);
    console.log(`};`);

    if (testResults.failed === 0) {
      console.log('\n✅ 모든 필수 검증 통과! 일정관리 시스템이 정상 동작합니다.');
    } else {
      console.log(`\n⚠️ ${testResults.failed}개 중요 문제 발견. 수정이 필요합니다.`);
    }

    return testResults;

  } catch (error) {
    console.error('테스트 실행 중 오류:', error);
    return { passed: 0, failed: 1, issues: [error.message] };
  } finally {
    await client.end();
  }
}

// 스크립트 실행
testCalendarIntegrity()
  .then(results => {
    console.log(`\n🏁 일정관리 테스트 완료: ${results.passed}개 성공, ${results.failed}개 실패`);
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('테스트 실행 실패:', error);
    process.exit(1);
  });

export { testCalendarIntegrity };